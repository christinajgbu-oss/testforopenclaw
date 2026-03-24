import { describe, expect, it } from 'vitest';

import { getSnakeGameFeedback } from '../useSnakeGame';
import type { GameState } from '../types';

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

describe('snake game audio feedback decisions', () => {
  it('plays eat audio and vibration when the score increases', () => {
    const feedback = getSnakeGameFeedback(
      createGameState({ score: 2 }),
      createGameState({ score: 3 }),
      false,
    );

    expect(feedback).toMatchObject({
      playEat: true,
      vibrate: true,
      playDie: false,
      playNewRecord: false,
      playAchievement: false,
    });
  });

  it('plays death audio when the game becomes over', () => {
    const feedback = getSnakeGameFeedback(
      createGameState({ isGameOver: false }),
      createGameState({ isGameOver: true }),
      false,
    );

    expect(feedback.playDie).toBe(true);
  });

  it('plays the new record melody when the high score exceeds the previous high score', () => {
    const feedback = getSnakeGameFeedback(
      createGameState({ highScore: 10, previousHighScore: 10 }),
      createGameState({ highScore: 12, previousHighScore: 10 }),
      false,
    );

    expect(feedback.playNewRecord).toBe(true);
  });

  it('plays the achievement sound when a new achievement unlocks', () => {
    const feedback = getSnakeGameFeedback(
      createGameState(),
      createGameState(),
      true,
    );

    expect(feedback.playAchievement).toBe(true);
  });
});
