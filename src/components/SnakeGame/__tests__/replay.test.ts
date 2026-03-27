import { describe, expect, it } from 'vitest';

import { randomFoodPosition } from '../gridHelpers';
import { buildReplayFrames, decodeReplayData, encodeReplayData } from '../ReplayPlayer';
import type { ReplayData } from '../types';
import {
  REPLAY_STORAGE_KEY,
  createInitialGameState,
  readReplays,
  seededRandom,
  writeReplay,
} from '../useSnakeGame';

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createReplay(overrides: Partial<ReplayData> = {}): ReplayData {
  return {
    id: overrides.id ?? 'replay-1',
    savedAt: overrides.savedAt ?? 1_700_000_000_000,
    seed: overrides.seed ?? 1,
    difficulty: overrides.difficulty ?? 'normal',
    skinId: overrides.skinId ?? 'default',
    obstacleMode: overrides.obstacleMode ?? false,
    obstacleDifficulty: overrides.obstacleDifficulty,
    durationSeconds: overrides.durationSeconds ?? 2,
    finalScore: overrides.finalScore ?? 0,
    finalAchievementIds: overrides.finalAchievementIds ?? [],
    inputs: overrides.inputs ?? [{ tick: 0, direction: 'RIGHT' }],
  };
}

describe('snake replay determinism', () => {
  it('creates the same seeded opening state for the same replay seed', () => {
    const seed = 1074;
    const storage = createStorageMock();

    const randomA = seededRandom(seed);
    const randomB = seededRandom(seed);
    const stateA = createInitialGameState(
      storage,
      (snake, _gridSize, blockedCells = []) =>
        randomFoodPosition(snake, 16, blockedCells, randomA),
      'normal',
      null,
      randomA,
    );
    const stateB = createInitialGameState(
      storage,
      (snake, _gridSize, blockedCells = []) =>
        randomFoodPosition(snake, 16, blockedCells, randomB),
      'normal',
      null,
      randomB,
    );

    expect(stateA.food).toEqual({ x: 6, y: 8 });
    expect(stateA).toEqual(stateB);
  });

  it('rebuilds replay frames deterministically from seed plus input changes', () => {
    const replay = createReplay({
      seed: 1,
      finalScore: 0,
      inputs: [{ tick: 0, direction: 'RIGHT' }],
    });

    const firstRun = buildReplayFrames(replay);
    const secondRun = buildReplayFrames(replay);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun[0]?.food).toEqual({ x: 1, y: 10 });
    expect(firstRun).toHaveLength(12);
    expect(firstRun.at(-1)?.isGameOver).toBe(true);
    expect(firstRun.at(-1)?.snake[0]).toEqual({ x: 15, y: 8 });
    expect(firstRun.at(-1)?.score).toBe(0);
  });
});

describe('snake replay storage and sharing', () => {
  it('caps stored replays at 50 entries and discards the oldest records', () => {
    const storage = createStorageMock();

    for (let index = 0; index < 52; index += 1) {
      writeReplay(
        createReplay({
          id: `replay-${index}`,
          savedAt: 1_700_000_000_000 + index,
        }),
        storage,
      );
    }

    const replays = readReplays(storage);

    expect(replays).toHaveLength(50);
    expect(replays[0]?.id).toBe('replay-51');
    expect(replays.at(-1)?.id).toBe('replay-2');
    expect(storage.getItem(REPLAY_STORAGE_KEY)).toContain('"replays"');
  });

  it('encodes replay data into a URL-safe base64 payload and decodes it back', () => {
    const replay = createReplay({
      id: 'shareable-replay',
      obstacleMode: true,
      obstacleDifficulty: 'hard',
      finalScore: 9,
    });

    const encoded = encodeReplayData(replay);
    const decoded = decodeReplayData(encoded);

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decoded).toEqual(replay);
  });

  it('returns null for an invalid replay payload instead of throwing', () => {
    expect(decodeReplayData('not-a-valid-replay')).toBeNull();
  });
});
