/**
 * Plays a chime — followed by a spoken "Blinds have gone up" announcement —
 * to signal that the blind level has advanced.
 *
 * We can't legally source or redistribute the real WSOP broadcast theme
 * music (it's copyrighted), so instead we synthesize a "ding-ding" bell
 * chime at runtime using the Web Audio API. This keeps the app dependency
 * and asset-free while still giving a clear, pleasant "level changed" cue.
 *
 * Silent-switch caveat: we use the Web Audio API (rather than an <audio>
 * element) and opt into the 'playback' audio session category so that, on
 * iOS 16.4+ / Safari 16.4+, the cue can still be heard with the hardware
 * mute switch engaged. This is best-effort and browser-dependent — it
 * cannot be guaranteed on every device or OS version.
 *
 * The spoken announcement works around several long-standing speech
 * synthesis quirks (utterance garbage collection, cancel()/speak() in the
 * same tick, voices loading asynchronously, and a stuck 'paused' engine) —
 * see the constants and helpers below.
 */

/** What we say after the chime when the blinds go up. */
const ANNOUNCEMENT_TEXT = 'Blinds have gone up';

/**
 * How long the full "ding-ding" takes to ring out (second ding starts at
 * +0.55s and decays over ~1.1s). Speech is deferred until after this so the
 * announcement doesn't talk over the chime.
 */
const CHIME_DURATION_MS = 1700;

/**
 * Chrome/Edge go silent when `speak()` is called in the same tick as
 * `cancel()` — the utterance queues but never starts. Letting the cancel
 * settle on a later tick avoids it.
 */
const CANCEL_SETTLE_MS = 120;

/**
 * `getVoices()` is empty until the engine finishes enumerating voices
 * asynchronously; speaking before then is silent in some browsers. We wait
 * for `voiceschanged`, but never longer than this (Firefox and some Chrome
 * builds populate voices without ever firing the event).
 */
const VOICE_READY_TIMEOUT_MS = 1000;

/**
 * How long to give an utterance to actually start before we treat it as a
 * stuck queue and retry.
 */
const SPEECH_START_TIMEOUT_MS = 700;

let audioContext: AudioContext | null = null;
let announcementTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Chrome and Firefox garbage-collect a `SpeechSynthesisUtterance` that is
 * still being spoken if nothing else references it, which cuts playback off
 * (often before it ever starts). Holding the current utterance in module
 * scope keeps it alive for its whole lifetime.
 */
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechPrimed = false;

/**
 * Opts this page into the 'playback' audio session category, which is what
 * allows audio to bypass the iOS silent switch. Feature-detected: it's a
 * no-op on browsers that don't implement the Audio Session API.
 */
function enablePlaybackAudioSession(): void {
  const audioSession = typeof navigator === 'undefined' ? undefined : navigator.audioSession;
  if (audioSession) {
    audioSession.type = 'playback';
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!audioContext) {
    enablePlaybackAudioSession();
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

/** Returns the speech engine, or null when the Web Speech API is unavailable. */
function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const synthesis = window.speechSynthesis;
  if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
    return null;
  }
  return synthesis;
}

/**
 * Runs `callback` once the engine has voices available, falling back to a
 * timeout so a browser that never fires `voiceschanged` still speaks.
 */
function whenVoicesReady(synthesis: SpeechSynthesis, callback: () => void): void {
  if (synthesis.getVoices().length > 0) {
    callback();
    return;
  }

  let settled = false;
  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    synthesis.removeEventListener?.('voiceschanged', finish);
    callback();
  };

  synthesis.addEventListener?.('voiceschanged', finish);
  setTimeout(finish, VOICE_READY_TIMEOUT_MS);
}

function createAnnouncementUtterance(synthesis: SpeechSynthesis): SpeechSynthesisUtterance {
  const utterance = new window.SpeechSynthesisUtterance(ANNOUNCEMENT_TEXT);
  utterance.lang = 'en-US';

  // Some engines stay silent when no voice is selected and the document
  // language doesn't match an installed voice, so pick an English one.
  const voices = synthesis.getVoices();
  const preferredVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ?? voices[0];
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onerror = (event) => {
    // 'interrupted'/'canceled' are expected when a newer announcement
    // supersedes this one; anything else is a real failure worth surfacing.
    if (event.error === 'interrupted' || event.error === 'canceled') {
      return;
    }
    console.warn(`[holdem-timer] Level-change announcement failed: ${event.error}`);
  };

  return utterance;
}

/**
 * Speaks the announcement and watches that it actually starts. If the queue
 * is stuck (a well-known Chrome failure mode) we retry once, and warn if it
 * still never starts so the failure isn't silent.
 */
function speakWithWatchdog(synthesis: SpeechSynthesis, allowRetry: boolean): void {
  // A stuck 'paused' engine swallows every utterance until it's resumed.
  if (synthesis.paused) {
    synthesis.resume();
  }

  const utterance = createAnnouncementUtterance(synthesis);
  let started = false;
  utterance.onstart = () => {
    started = true;
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
  };

  activeUtterance = utterance;
  synthesis.speak(utterance);

  setTimeout(() => {
    if (started || synthesis.speaking) {
      return;
    }
    if (synthesis.paused) {
      synthesis.resume();
    }
    if (allowRetry) {
      synthesis.cancel();
      setTimeout(() => speakWithWatchdog(synthesis, false), CANCEL_SETTLE_MS);
      return;
    }
    console.warn('[holdem-timer] Level-change announcement never started (speech synthesis unavailable or blocked).');
  }, SPEECH_START_TIMEOUT_MS);
}

/**
 * Unlocks speech synthesis from a user gesture. Some browsers refuse (or
 * silently drop) the first utterance unless it follows a user activation,
 * and touching `getVoices()` here kicks off async voice enumeration so the
 * real announcement isn't racing it later.
 */
function primeSpeechSynthesis(): void {
  if (speechPrimed) {
    return;
  }
  const synthesis = getSpeechSynthesis();
  if (!synthesis) {
    return;
  }
  speechPrimed = true;

  synthesis.getVoices();

  const silent = new window.SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  // Priming failures are expected on some engines and aren't actionable.
  silent.onerror = () => {};
  activeUtterance = silent;
  synthesis.speak(silent);
}

/**
 * Creates/resumes the AudioContext and unlocks speech synthesis from a user
 * gesture (the play button) so that autoplay policies don't block the first
 * cue, and so the 'playback' audio session is established before any cue
 * needs to fire.
 */
export function primeLevelChangeAudio(): void {
  try {
    getAudioContext();
  } catch {
    // Priming is opportunistic; failures just mean the first chime may be
    // blocked by autoplay policy.
  }
  try {
    primeSpeechSynthesis();
  } catch {
    // Speech is a nice-to-have; ignore unsupported/blocked environments.
  }
}

/**
 * Speaks the level-change announcement via the Web Speech API. Any in-flight
 * or queued utterance is cancelled first so rapid level skips announce once
 * rather than stacking up.
 */
export function speakLevelChangeAnnouncement(): void {
  try {
    const synthesis = getSpeechSynthesis();
    if (!synthesis) {
      return;
    }

    // Only cancel when there's actually something to cancel: a no-op
    // cancel() can itself wedge the queue in Chrome.
    const needsCancel = synthesis.speaking || synthesis.pending;
    if (needsCancel) {
      synthesis.cancel();
    }

    whenVoicesReady(synthesis, () => {
      // Never speak in the same tick as cancel() — Chrome/Edge queue the
      // utterance and then never start it.
      setTimeout(() => speakWithWatchdog(synthesis, true), needsCancel ? CANCEL_SETTLE_MS : 0);
    });
  } catch {
    // Speech is a nice-to-have; ignore unsupported/blocked environments.
  }
}

/** Plays a single sine tone with a quick attack and an exponential decay. */
function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, peakGain: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

/**
 * Plays one "ding": a fundamental tone plus a quieter, slightly-detuned
 * overtone (real bells ring with inharmonic overtones), each with a long
 * decay so the ring lingers rather than cutting off abruptly.
 */
function playBellDing(ctx: AudioContext, startTime: number) {
  const fundamental = 1046.5; // C6
  const overtone = fundamental * 2.41; // bright, bell-like upper partial
  const ringDuration = 1.1;

  playTone(ctx, fundamental, startTime, ringDuration, 0.22);
  playTone(ctx, overtone, startTime, ringDuration * 0.6, 0.08);
}

/** Queues the spoken announcement for once the chime has rung out. */
function scheduleAnnouncement(): void {
  if (announcementTimeoutId !== null) {
    clearTimeout(announcementTimeoutId);
  }
  announcementTimeoutId = setTimeout(() => {
    announcementTimeoutId = null;
    speakLevelChangeAnnouncement();
  }, CHIME_DURATION_MS);
}

/**
 * Plays a longer "ding-ding" bell chime (two rings, each left to decay
 * naturally) to mark a blind level change, then announces "Blinds have gone
 * up" once the chime has finished ringing.
 */
export function playLevelChangeChime(): void {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      playBellDing(ctx, now);
      playBellDing(ctx, now + 0.55);
    }
  } catch {
    // Sound is a nice-to-have, not critical to app function; ignore any
    // playback issues (e.g. autoplay restrictions, unsupported environment).
  }

  scheduleAnnouncement();
}
