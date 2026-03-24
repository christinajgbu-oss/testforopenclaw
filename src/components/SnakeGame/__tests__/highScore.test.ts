import { describe, expect, it } from 'vitest';

import {
  createInitialGameState,
  syncHighScoreOnGameOver,
} from '../useSnakeGame';
import type { GameState } from '../types';

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function createGameOverState(overrides: Partial<GameState> = {}): GameState {
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
    isGameOver: overrides.isGameOver ?? true,
  };
}

describe('snake high score persistence', () => {
  it('reads the stored high score during initialization', () => {
    const storage = createLocalStorageMock({ snake_highscore: '9' });

    const state = createInitialGameState(storage, () => ({ x: 2, y: 2 }));

    expect(state.highScore).toBe(9);
    expect(state.previousHighScore).toBe(9);
  });

  it('updates the high score in state and localStorage when game over beats the record', () => {
    const storage = createLocalStorageMock({ snake_highscore: '4' });

    const nextState = syncHighScoreOnGameOver(
      createGameOverState({
        score: 7,
        highScore: 4,
        previousHighScore: 4,
      }),
      storage,
    );

    expect(nextState.highScore).toBe(7);
    expect(nextState.previousHighScore).toBe(4);
    expect(storage.getItem('snake_highscore')).toBe('7');
  });

  it('persists the high score across reloads', () => {
    const storage = createLocalStorageMock();

    const endedState = syncHighScoreOnGameOver(
      createGameOverState({
        score: 11,
      }),
      storage,
    );

    const reloadedState = createInitialGameState(storage, () => ({ x: 4, y: 4 }));

    expect(endedState.highScore).toBe(11);
    expect(reloadedState.highScore).toBe(11);
    expect(reloadedState.previousHighScore).toBe(11);
  });
});
