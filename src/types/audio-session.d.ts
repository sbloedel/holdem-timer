/**
 * Ambient declarations for the Audio Session API (Safari 16.4+ / iOS 16.4+).
 *
 * Setting `navigator.audioSession.type = 'playback'` tells the browser this
 * page produces "media playback" audio, which on iOS lets Web Audio output
 * keep playing while the hardware silent/mute switch is engaged. It is not
 * part of the standard DOM lib yet, so we declare a minimal typed surface
 * here instead of reaching for `any`.
 */

type AudioSessionType = 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';

interface AudioSession {
  type: AudioSessionType;
}

interface Navigator {
  readonly audioSession?: AudioSession;
}
