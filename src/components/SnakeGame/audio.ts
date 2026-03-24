'use client';

type AudioContextLike = {
  currentTime: number;
  destination: AudioNode;
  createGain: () => GainNode;
  createOscillator: () => OscillatorNode;
  resume?: () => Promise<void>;
};

let audioContext: AudioContextLike | null = null;

function getAudioContext(): AudioContextLike | null {
  try {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextCtor =
      globalThis.window?.AudioContext ??
      globalThis.window?.webkitAudioContext ??
      globalThis.AudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    audioContext = new AudioContextCtor();
    return audioContext;
  } catch {
    return null;
  }
}

function scheduleTone(
  context: AudioContextLike,
  startFrequency: number,
  endFrequency: number,
  startTime: number,
  durationMs: number,
) {
  const durationSeconds = durationMs / 1000;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(startFrequency, startTime);
  oscillator.frequency.linearRampToValueAtTime(
    endFrequency,
    startTime + durationSeconds,
  );

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + durationSeconds,
  );

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds);
}

function playSequence(tones: Array<{ start: number; end: number; offset: number; duration: number }>) {
  try {
    const context = getAudioContext();

    if (!context) {
      return;
    }

    void context.resume?.();

    const startedAt = context.currentTime;

    for (const tone of tones) {
      scheduleTone(
        context,
        tone.start,
        tone.end,
        startedAt + tone.offset / 1000,
        tone.duration,
      );
    }
  } catch {
    return;
  }
}

export function playEat() {
  playSequence([{ start: 440, end: 880, offset: 0, duration: 100 }]);
}

export function playDie() {
  playSequence([{ start: 400, end: 100, offset: 0, duration: 300 }]);
}

export function playNewRecord() {
  playSequence([
    { start: 523.25, end: 523.25, offset: 0, duration: 125 },
    { start: 659.25, end: 659.25, offset: 125, duration: 125 },
    { start: 783.99, end: 783.99, offset: 250, duration: 125 },
    { start: 1046.5, end: 1046.5, offset: 375, duration: 125 },
  ]);
}

export function playAchievement() {
  playSequence([
    { start: 660, end: 660, offset: 0, duration: 80 },
    { start: 880, end: 880, offset: 80, duration: 80 },
  ]);
}

export function playKeyPress() {
  playSequence([{ start: 200, end: 180, offset: 0, duration: 20 }]);
}

export function vibrate() {
  try {
    globalThis.navigator?.vibrate?.(30);
  } catch {
    return;
  }
}
