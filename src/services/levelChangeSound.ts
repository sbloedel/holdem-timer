/**
 * Plays a short chime to signal that the blind level has advanced.
 *
 * We can't legally source or redistribute the real WSOP broadcast theme
 * music (it's copyrighted), so instead we synthesize a quick two-note bell
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

/** Plays a single bell-like tone with a quick attack and a soft decay. */
function playBellTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, peakGain: number) {
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

/** Plays a quick two-note "ding-ding" bell chime, e.g. on a blind level change. */
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
    playBellTone(ctx, 880, now, 0.35, 0.18); // A5
    playBellTone(ctx, 1318.51, now + 0.12, 0.4, 0.14); // E6, slightly overlapping
  } catch {
    // Sound is a nice-to-have, not critical to app function; ignore any
    // playback issues (e.g. autoplay restrictions, unsupported environment).
  }
}
