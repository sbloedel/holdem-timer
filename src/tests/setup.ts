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

class MockAudioContext {
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

class MockSpeechSynthesisUtterance {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
vi.stubGlobal('speechSynthesis', {
  speak: vi.fn(),
  cancel: vi.fn(),
});
