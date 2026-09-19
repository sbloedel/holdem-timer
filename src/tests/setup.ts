import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * jsdom implements neither the Web Audio API nor the Web Speech API, so we
 * install minimal stubs here. They record the calls the level-change cue
 * makes without producing any real sound.
 */

class MockAudioParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class MockGainNode {
  gain = new MockAudioParam();
  connect() {}
}

class MockOscillatorNode {
  type = 'sine';
  frequency = { value: 0 };
  connect() {}
  start() {}
  stop() {}
}

export class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createOscillator() {
    return new MockOscillatorNode();
  }
  createGain() {
    return new MockGainNode();
  }
}

export class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

export interface MockSpeechSynthesisOptions {
  /** Voices reported by `getVoices()`. Defaults to a single English voice. */
  voices?: Partial<SpeechSynthesisVoice>[];
  /** When false, `speak()` queues the utterance without ever starting it. */
  autoStart?: boolean;
}

/**
 * A controllable `speechSynthesis` double. Tests flip `autoStart`, `paused`
 * and `voices` to reproduce the browser failure modes the service guards
 * against.
 */
export function createMockSpeechSynthesis(options: MockSpeechSynthesisOptions = {}) {
  const listeners = new Map<string, Set<() => void>>();

  const mock = {
    speaking: false,
    pending: false,
    paused: false,
    autoStart: options.autoStart ?? true,
    voices: options.voices ?? [{ name: 'Test Voice', lang: 'en-US' }],
    spoken: [] as MockSpeechSynthesisUtterance[],

    getVoices: vi.fn(() => mock.voices),

    addEventListener: vi.fn((type: string, handler: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(handler);
      listeners.set(type, set);
    }),

    removeEventListener: vi.fn((type: string, handler: () => void) => {
      listeners.get(type)?.delete(handler);
    }),

    /** Fires a synthesis-level event, e.g. 'voiceschanged'. */
    emit(type: string) {
      for (const handler of [...(listeners.get(type) ?? [])]) {
        handler();
      }
    },

    speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
      mock.spoken.push(utterance);
      if (mock.autoStart) {
        mock.speaking = true;
        utterance.onstart?.();
      } else {
        mock.pending = true;
      }
    }),

    cancel: vi.fn(() => {
      mock.speaking = false;
      mock.pending = false;
    }),

    pause: vi.fn(() => {
      mock.paused = true;
    }),

    resume: vi.fn(() => {
      mock.paused = false;
    }),

    /** Completes the most recent utterance, as a real engine would. */
    finishSpeaking() {
      mock.speaking = false;
      mock.pending = false;
      mock.spoken.at(-1)?.onend?.();
    },
  };

  return mock;
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
vi.stubGlobal('speechSynthesis', createMockSpeechSynthesis());
