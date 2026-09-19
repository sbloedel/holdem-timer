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
 */

/** What we say after the chime when the blinds go up. */
const ANNOUNCEMENT_TEXT = 'Blinds have gone up';

/**
 * How long the full "ding-ding" takes to ring out (second ding starts at
 * +0.55s and decays over ~1.1s). Speech is deferred until after this so the
 * announcement doesn't talk over the chime.
 */
const CHIME_DURATION_MS = 1700;

let audioContext: AudioContext | null = null;
let announcementTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

/**
 * Creates/resumes the AudioContext from a user gesture (the play button) so
 * that autoplay policies don't block the first chime, and so the 'playback'
 * audio session is established before any cue needs to fire.
 */
export function primeLevelChangeAudio(): void {
  try {
    getAudioContext();
  } catch {
    // Priming is opportunistic; failures just mean the first chime may be
    // blocked by autoplay policy.
  }
}

/**
 * Speaks the level-change announcement via the Web Speech API. Any pending
 * or queued utterance is cancelled first so rapid level skips announce once
 * rather than stacking up.
 */
export function speakLevelChangeAnnouncement(): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
      return;
    }
    synthesis.cancel();
    synthesis.speak(new window.SpeechSynthesisUtterance(ANNOUNCEMENT_TEXT));
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
