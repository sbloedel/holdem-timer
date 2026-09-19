import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSpeechSynthesis } from './setup';

type LevelChangeSoundModule = typeof import('../services/levelChangeSound');
type MockSynthesis = ReturnType<typeof createMockSpeechSynthesis>;

/** Mirrors the constants in the service. */
const CHIME_DURATION_MS = 1700;
const CANCEL_SETTLE_MS = 120;
const VOICE_READY_TIMEOUT_MS = 1000;
const SPEECH_START_TIMEOUT_MS = 700;

let synthesis: MockSynthesis;

/**
 * The service caches its AudioContext, priming flag and active utterance in
 * module scope, so each test loads a fresh copy.
 */
async function loadModule(options?: Parameters<typeof createMockSpeechSynthesis>[0]): Promise<LevelChangeSoundModule> {
  synthesis = createMockSpeechSynthesis(options);
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.resetModules();
  return import('../services/levelChangeSound');
}

/** Advances past the chime and the post-cancel settle delay. */
function runOutChimeAndSettle() {
  vi.advanceTimersByTime(CHIME_DURATION_MS + CANCEL_SETTLE_MS + 1);
}

describe('levelChangeSound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Reflect.deleteProperty(navigator, 'audioSession');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'audioSession');
  });

  describe('silent-switch handling', () => {
    it('opts into the playback audio session so the cue can survive the iOS silent switch', async () => {
      const audioSession = { type: 'auto' };
      Object.defineProperty(navigator, 'audioSession', { value: audioSession, configurable: true });

      const { primeLevelChangeAudio } = await loadModule();
      primeLevelChangeAudio();

      expect(audioSession.type).toBe('playback');
    });

    it('does not throw when the Audio Session API is unavailable', async () => {
      const { primeLevelChangeAudio } = await loadModule();

      expect(() => primeLevelChangeAudio()).not.toThrow();
    });

    it('resumes a suspended AudioContext before playing a cue', async () => {
      const resume = vi.fn(() => Promise.resolve());
      class SuspendedAudioContext {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        resume = resume;
        createOscillator() {
          return { type: 'sine', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
        }
        createGain() {
          return {
            gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect() {},
          };
        }
      }
      const original = window.AudioContext;
      vi.stubGlobal('AudioContext', SuspendedAudioContext);

      const { playLevelChangeChime } = await loadModule();
      playLevelChangeChime();

      expect(resume).toHaveBeenCalled();

      vi.stubGlobal('AudioContext', original);
    });
  });

  describe('speech priming', () => {
    it('unlocks speech synthesis from the user gesture with a silent utterance', async () => {
      const { primeLevelChangeAudio } = await loadModule();

      primeLevelChangeAudio();

      expect(synthesis.getVoices).toHaveBeenCalled();
      expect(synthesis.speak).toHaveBeenCalledTimes(1);
      const primingUtterance = synthesis.spoken[0];
      expect(primingUtterance.volume).toBe(0);
      expect(primingUtterance.text.trim()).toBe('');
    });

    it('only primes once even if play is pressed repeatedly', async () => {
      const { primeLevelChangeAudio } = await loadModule();

      primeLevelChangeAudio();
      primeLevelChangeAudio();
      primeLevelChangeAudio();

      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });
  });

  describe('announcement', () => {
    it('speaks the announcement only after the chime has rung out', async () => {
      const { playLevelChangeChime } = await loadModule();

      playLevelChangeChime();
      expect(synthesis.speak).not.toHaveBeenCalled();

      runOutChimeAndSettle();

      expect(synthesis.speak).toHaveBeenCalledTimes(1);
      expect(synthesis.spoken[0].text).toBe('Blinds have gone up');
    });

    it('selects an English voice and language so engines without a default stay audible', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule({
        voices: [
          { name: 'Fräulein', lang: 'de-DE' },
          { name: 'Daniel', lang: 'en-GB' },
        ],
      });

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      expect(synthesis.spoken[0].lang).toBe('en-US');
      expect(synthesis.spoken[0].voice).toMatchObject({ name: 'Daniel' });
    });

    it('announces once when levels are skipped rapidly', async () => {
      const { playLevelChangeChime } = await loadModule();

      playLevelChangeChime();
      vi.advanceTimersByTime(200);
      playLevelChangeChime();
      vi.advanceTimersByTime(200);
      playLevelChangeChime();

      vi.advanceTimersByTime(CHIME_DURATION_MS + CANCEL_SETTLE_MS + SPEECH_START_TIMEOUT_MS + 1);

      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the Web Speech API is unavailable', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule();
      vi.stubGlobal('speechSynthesis', undefined);

      expect(() => speakLevelChangeAnnouncement()).not.toThrow();
    });
  });

  describe('cancel/speak sequencing', () => {
    it('does not cancel when nothing is speaking or queued', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule();

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      expect(synthesis.cancel).not.toHaveBeenCalled();
      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('never calls speak() in the same tick as cancel(), which silences Chrome', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule();
      synthesis.speaking = true;

      speakLevelChangeAnnouncement();

      // cancel() happened synchronously, speak() must not have.
      expect(synthesis.cancel).toHaveBeenCalledTimes(1);
      expect(synthesis.speak).not.toHaveBeenCalled();

      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);
      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('resumes a stuck paused engine before speaking', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule();
      synthesis.paused = true;

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      expect(synthesis.resume).toHaveBeenCalled();
      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });
  });

  describe('voice readiness', () => {
    it('waits for voiceschanged before speaking when no voices are loaded yet', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule({ voices: [] });

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);
      expect(synthesis.speak).not.toHaveBeenCalled();

      synthesis.voices = [{ name: 'Late Voice', lang: 'en-US' }];
      synthesis.emit('voiceschanged');
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      expect(synthesis.speak).toHaveBeenCalledTimes(1);
      expect(synthesis.spoken[0].voice).toMatchObject({ name: 'Late Voice' });
    });

    it('still speaks when voiceschanged never fires', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule({ voices: [] });

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(VOICE_READY_TIMEOUT_MS + CANCEL_SETTLE_MS + 1);

      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });

    it('stops listening for voiceschanged once it has spoken', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule({ voices: [] });

      speakLevelChangeAnnouncement();
      synthesis.emit('voiceschanged');
      vi.advanceTimersByTime(VOICE_READY_TIMEOUT_MS + CANCEL_SETTLE_MS + 1);

      expect(synthesis.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
      expect(synthesis.speak).toHaveBeenCalledTimes(1);
    });
  });

  describe('failure reporting', () => {
    it('retries once when the utterance never starts', async () => {
      const { speakLevelChangeAnnouncement } = await loadModule({ autoStart: false });

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);
      expect(synthesis.speak).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(SPEECH_START_TIMEOUT_MS + CANCEL_SETTLE_MS + 1);

      expect(synthesis.cancel).toHaveBeenCalled();
      expect(synthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('warns when speech never starts, so the failure is not silent', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { speakLevelChangeAnnouncement } = await loadModule({ autoStart: false });

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 2 * (SPEECH_START_TIMEOUT_MS + CANCEL_SETTLE_MS) + 1);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('never started'));
    });

    it('warns via onerror when the engine reports a real failure', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { speakLevelChangeAnnouncement } = await loadModule();

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      synthesis.spoken[0].onerror?.({ error: 'synthesis-failed' });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('synthesis-failed'));
    });

    it('stays quiet when an announcement is merely superseded', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { speakLevelChangeAnnouncement } = await loadModule();

      speakLevelChangeAnnouncement();
      vi.advanceTimersByTime(CANCEL_SETTLE_MS + 1);

      synthesis.spoken[0].onerror?.({ error: 'interrupted' });
      synthesis.spoken[0].onerror?.({ error: 'canceled' });

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
