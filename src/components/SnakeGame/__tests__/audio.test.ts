import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  playAchievement,
  playDie,
  playEat,
  playKeyPress,
  playNewRecord,
  vibrate,
} from '../audio';

class FakeGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeOscillatorNode {
  frequency = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  type = 'square';
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  createGain = vi.fn(() => new FakeGainNode());
  createOscillator = vi.fn(() => new FakeOscillatorNode());
  resume = vi.fn(async () => undefined);
}

declare global {
  interface Window {
    AudioContext?: typeof FakeAudioContext;
    webkitAudioContext?: typeof FakeAudioContext;
  }

  interface Navigator {
    vibrate?: (pattern: number) => boolean;
  }
}

describe('snake audio helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.window = globalThis as Window & typeof globalThis;
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = undefined;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        vibrate: vi.fn(() => true),
      },
    });
  });

  afterEach(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });

  it('calls each audio effect without throwing when Web Audio is available', () => {
    expect(() => playEat()).not.toThrow();
    expect(() => playDie()).not.toThrow();
    expect(() => playNewRecord()).not.toThrow();
    expect(() => playAchievement()).not.toThrow();
    expect(() => playKeyPress()).not.toThrow();
  });

  it('returns early without throwing when Web Audio is unavailable', () => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    expect(() => playEat()).not.toThrow();
    expect(() => playDie()).not.toThrow();
    expect(() => playNewRecord()).not.toThrow();
    expect(() => playAchievement()).not.toThrow();
    expect(() => playKeyPress()).not.toThrow();
  });

  it('triggers mobile vibration with the expected duration', () => {
    const vibrateSpy = vi.fn(() => true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        vibrate: vibrateSpy,
      },
    });

    vibrate();

    expect(vibrateSpy).toHaveBeenCalledWith(30);
  });

  it('returns early when vibration is unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    expect(() => vibrate()).not.toThrow();
  });
});
