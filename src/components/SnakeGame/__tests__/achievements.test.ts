import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SnakeGame } from '../SnakeGame';
import {
  ACHIEVEMENT_STORAGE_KEY,
  createInitialAchievementMeta,
  readAchievements,
  updateAchievementState,
  writeAchievements,
} from '../useSnakeGame';
import type {
  AchievementMeta,
  AchievementStore,
  GameState,
} from '../types';
import { useSnakeGame } from '../useSnakeGame';

vi.mock('../useSnakeGame', async () => {
  const actual = await vi.importActual<typeof import('../useSnakeGame')>(
    '../useSnakeGame',
  );

  return {
    ...actual,
    useSnakeGame: vi.fn(),
  };
});

const mockedUseSnakeGame = vi.mocked(useSnakeGame);

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

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    snake: overrides.snake ?? [
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 },
    ],
    food: overrides.food ?? { x: 10, y: 10 },
    direction: overrides.direction ?? 'RIGHT',
    queuedDirection: overrides.queuedDirection ?? 'RIGHT',
    score: overrides.score ?? 0,
    highScore: overrides.highScore ?? 12,
    previousHighScore: overrides.previousHighScore ?? 12,
    isGameOver: overrides.isGameOver ?? false,
    gameStatus: 'running',
    prop: null,
    activeProps: {},
    obstacles: [],
  };
}

function createMeta(overrides: Partial<AchievementMeta> = {}): AchievementMeta {
  return {
    consecutiveFoodEats: overrides.consecutiveFoodEats ?? 0,
    lastFoodEatenAt: overrides.lastFoodEatenAt ?? null,
    previousScore: overrides.previousScore ?? 0,
  };
}

function runUnlock(
  previousState: Partial<GameState>,
  nextState: Partial<GameState>,
  meta: Partial<AchievementMeta> = {},
  unlocked: AchievementStore = {},
  now = 5_000,
) {
  return updateAchievementState({
    previousState: createGameState(previousState),
    nextState: createGameState(nextState),
    achievements: unlocked,
    meta: createMeta(meta),
    now,
  });
}

describe('snake achievements persistence', () => {
  it('reads and writes the achievement store from localStorage', () => {
    const storage = createStorageMock();
    const achievements: AchievementStore = {
      first_bite: { unlockedAt: 100 },
      gourmet_10: { unlockedAt: 200 },
    };

    writeAchievements(achievements, storage);

    expect(storage.getItem(ACHIEVEMENT_STORAGE_KEY)).toBe(
      JSON.stringify(achievements),
    );
    expect(readAchievements(storage)).toEqual(achievements);
  });

  it('keeps locked achievements locked after reload', () => {
    const storage = createStorageMock({
      [ACHIEVEMENT_STORAGE_KEY]: JSON.stringify({
        first_bite: { unlockedAt: 100 },
      } satisfies AchievementStore),
    });

    const achievements = readAchievements(storage);

    expect(achievements.first_bite).toEqual({ unlockedAt: 100 });
    expect(achievements.gourmet_10).toBeUndefined();
    expect(achievements.perfect_fill).toBeUndefined();
  });

  it('saves newly unlocked achievements so they persist after reload', () => {
    const storage = createStorageMock();
    const result = runUnlock(
      { score: 0 },
      { score: 1, snake: [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }] },
      {},
      {},
      777,
    );

    writeAchievements(result.achievements, storage);

    expect(readAchievements(storage)).toEqual({
      first_bite: { unlockedAt: 777 },
    });
  });
});

describe('snake achievement unlock conditions', () => {
  it('unlocks first_bite when score goes from 0 to 1', () => {
    const result = runUnlock({ score: 0 }, { score: 1 });

    expect(result.achievements.first_bite).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks gourmet_10 when score reaches 10', () => {
    const result = runUnlock({ score: 9 }, { score: 10 });

    expect(result.achievements.gourmet_10).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks gourmet_30 when score reaches 30', () => {
    const result = runUnlock({ score: 29 }, { score: 30 });

    expect(result.achievements.gourmet_30).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks gourmet_50 when score reaches 50', () => {
    const result = runUnlock({ score: 49 }, { score: 50 });

    expect(result.achievements.gourmet_50).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks half_board when the snake length reaches 128', () => {
    const result = runUnlock(
      { snake: Array.from({ length: 127 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) })) },
      { snake: Array.from({ length: 128 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) })) },
    );

    expect(result.achievements.half_board).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks perfect_fill when the snake fills the board', () => {
    const result = runUnlock(
      { snake: Array.from({ length: 255 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) })) },
      { snake: Array.from({ length: 256 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) })) },
    );

    expect(result.achievements.perfect_fill).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks comeback_kid when the player was down 5 and then takes the lead', () => {
    const result = runUnlock(
      { score: 5, highScore: 10, previousHighScore: 10 },
      { score: 11, highScore: 10, previousHighScore: 10 },
      { previousScore: 5 },
    );

    expect(result.achievements.comeback_kid).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks no_miss after 10 consecutive food eats without dying', () => {
    const result = runUnlock(
      { score: 9 },
      { score: 10 },
      { consecutiveFoodEats: 9 },
    );

    expect(result.meta.consecutiveFoodEats).toBe(10);
    expect(result.achievements.no_miss).toEqual({ unlockedAt: 5_000 });
  });

  it('unlocks speedster when two food pickups happen within one second', () => {
    const result = runUnlock(
      { score: 6 },
      { score: 7 },
      { lastFoodEatenAt: 4_250 },
      {},
      5_000,
    );

    expect(result.achievements.speedster).toEqual({ unlockedAt: 5_000 });
  });

  it('does not unlock the same achievement twice', () => {
    const result = runUnlock(
      { score: 10 },
      { score: 11 },
      {},
      { gourmet_10: { unlockedAt: 100 } },
    );

    expect(result.achievements.gourmet_10).toEqual({ unlockedAt: 100 });
  });

  it('resets streak-based meta after death', () => {
    const result = runUnlock(
      { score: 8, isGameOver: false },
      { score: 8, isGameOver: true },
      { consecutiveFoodEats: 7, lastFoodEatenAt: 4_900 },
    );

    expect(result.meta).toEqual(createInitialAchievementMeta());
  });
});

describe('SnakeGame achievements UI', () => {
  beforeEach(() => {
    mockedUseSnakeGame.mockReset();
  });

  it('renders achievement icons for unlocked entries and lock icons for locked entries', () => {
    mockedUseSnakeGame.mockReturnValue({
      ...createGameState(),
      achievements: {
        first_bite: { unlockedAt: 100 },
      },
      resetGame: vi.fn(),
      turnSnake: vi.fn(),
      setObstacleMode: vi.fn(),
    } as ReturnType<typeof useSnakeGame>);

    const markup = renderToStaticMarkup(createElement(SnakeGame));

    expect(markup).toContain('成就');
    expect(markup).toContain('🐁');
    expect(markup).toContain('🔒');
    expect(markup).toContain('title="First Bite');
  });
});
