import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LevelChangeSoundModule = typeof import('../services/levelChangeSound');

/**
 * The service caches its AudioContext in module scope, so each test imports
 * a fresh copy to keep the "first gesture creates the context" behaviour
 * observable.
 */
async function loadModule(): Promise<LevelChangeSoundModule> {
  vi.resetModules();
  return import('../services/levelChangeSound');
}

const speechSynthesisMock = () => window.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };

describe('levelChangeSound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    speechSynthesisMock().speak.mockClear();
    speechSynthesisMock().cancel.mockClear();
    Reflect.deleteProperty(navigator, 'audioSession');
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'audioSession');
  });

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

  it('speaks the announcement only after the chime has rung out', async () => {
    const { playLevelChangeChime } = await loadModule();

    playLevelChangeChime();
    expect(speechSynthesisMock().speak).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1700);

    expect(speechSynthesisMock().cancel).toHaveBeenCalled();
    expect(speechSynthesisMock().speak).toHaveBeenCalledTimes(1);
    const utterance = speechSynthesisMock().speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('Blinds have gone up');
  });

  it('announces once when levels are skipped rapidly', async () => {
    const { playLevelChangeChime } = await loadModule();

    playLevelChangeChime();
    vi.advanceTimersByTime(200);
    playLevelChangeChime();
    vi.advanceTimersByTime(200);
    playLevelChangeChime();

    vi.advanceTimersByTime(5000);

    expect(speechSynthesisMock().speak).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the Web Speech API is unavailable', async () => {
    const { speakLevelChangeAnnouncement } = await loadModule();
    const original = window.speechSynthesis;
    vi.stubGlobal('speechSynthesis', undefined);

    expect(() => speakLevelChangeAnnouncement()).not.toThrow();

    vi.stubGlobal('speechSynthesis', original);
  });
});
