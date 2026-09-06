/**
 * Plays a chime to signal that the blind level has advanced.
 *
 * We can't legally source or redistribute the real WSOP broadcast theme
 * music (it's copyrighted), so instead we synthesize a "ding-ding" bell
 * chime at runtime using the Web Audio API. This keeps the app dependency
 * and asset-free while still giving a clear, pleasant "level changed" cue.
 */

let audioContext: AudioContext | null = null;

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
    audioContext = new AudioContextClass();
  }
  return audioContext;
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

/**
 * Plays a longer "ding-ding" bell chime (two rings, each left to decay
 * naturally) to mark a blind level change.
 */
export function playLevelChangeChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    playBellDing(ctx, now);
    playBellDing(ctx, now + 0.55);
  } catch {
    // Sound is a nice-to-have, not critical to app function; ignore any
    // playback issues (e.g. autoplay restrictions, unsupported environment).
  }
}
