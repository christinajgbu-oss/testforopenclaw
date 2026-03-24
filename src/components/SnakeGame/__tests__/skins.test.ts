import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SnakeGame } from '../SnakeGame';
import {
  ACHIEVEMENTS,
  SKIN_STORAGE_KEY,
  isSkinUnlocked,
} from '../types';
import type { AchievementStore, GameState } from '../types';
import {
  readSelectedSkin,
  selectSkin,
  useSnakeGame,
  writeSelectedSkin,
} from '../useSnakeGame';

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

function createAllUnlockedAchievements(): AchievementStore {
  return ACHIEVEMENTS.reduce<AchievementStore>((store, achievement, index) => {
    store[achievement.id] = { unlockedAt: index + 1 };
    return store;
  }, {});
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
    highScore: overrides.highScore ?? 0,
    previousHighScore: overrides.previousHighScore ?? 0,
    isGameOver: overrides.isGameOver ?? false,
  };
}

describe('snake skins', () => {
  beforeEach(() => {
    mockedUseSnakeGame.mockReset();
  });

  it('reads and writes the selected skin from localStorage', () => {
    const storage = createStorageMock();

    writeSelectedSkin('neon', storage);

    expect(storage.getItem(SKIN_STORAGE_KEY)).toBe('neon');
    expect(readSelectedSkin(storage)).toBe('neon');
  });

  it('keeps candy and mario locked by default', () => {
    expect(isSkinUnlocked('candy', {})).toBe(false);
    expect(isSkinUnlocked('mario', {})).toBe(false);
  });

  it('unlocks candy and mario when all 9 achievements are unlocked', () => {
    const achievements = createAllUnlockedAchievements();

    expect(isSkinUnlocked('candy', achievements)).toBe(true);
    expect(isSkinUnlocked('mario', achievements)).toBe(true);
  });

  it('persists the selected skin across page reloads', () => {
    const storage = createStorageMock();
    const achievements = createAllUnlockedAchievements();

    writeSelectedSkin('mario', storage);

    expect(readSelectedSkin(storage, achievements)).toBe('mario');
  });

  it('setSkin changes the selected skin', () => {
    const storage = createStorageMock();

    const nextSkin = selectSkin('pixel', {}, storage);

    expect(nextSkin).toBe('pixel');
    expect(readSelectedSkin(storage)).toBe('pixel');
  });

  it('renders locked skins with a lock icon, tooltip, and selected state', () => {
    mockedUseSnakeGame.mockReturnValue({
      ...createGameState(),
      achievements: {},
      selectedSkin: 'neon',
      resetGame: vi.fn(),
      setSkin: vi.fn(),
      turnSnake: vi.fn(),
    } as ReturnType<typeof useSnakeGame>);

    const markup = renderToStaticMarkup(createElement(SnakeGame));

    expect(markup).toContain('皮肤');
    expect(markup).toContain('经典绿');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Unlock all achievements');
    expect(markup).toContain('🔒');
  });
});
