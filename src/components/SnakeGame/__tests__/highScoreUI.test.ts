import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import pageStyles from '@/app/page.module.css';

import { SnakeGame } from '../SnakeGame';
import type { GameState } from '../types';
import { useSnakeGame } from '../useSnakeGame';

vi.mock('../useSnakeGame', () => ({
  useSnakeGame: vi.fn(),
}));

const mockedUseSnakeGame = vi.mocked(useSnakeGame);

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
    score: overrides.score ?? 3,
    highScore: overrides.highScore ?? 8,
    previousHighScore: overrides.previousHighScore ?? 5,
    isGameOver: overrides.isGameOver ?? false,
    gameStatus: 'running',
    prop: null,
    activeProps: {},
    obstacles: [],
  };
}

function renderGame(state: Partial<GameState> = {}) {
  mockedUseSnakeGame.mockReturnValue({
    ...createGameState(state),
    achievements: {},
    resetGame: vi.fn(),
    turnSnake: vi.fn(),
    setObstacleMode: vi.fn(),
  });

  return renderToStaticMarkup(createElement(SnakeGame));
}

describe('SnakeGame high score UI', () => {
  beforeEach(() => {
    mockedUseSnakeGame.mockReset();
  });

  it('renders the high score value from the hook return value', () => {
    const markup = renderGame({
      highScore: 27,
      previousHighScore: 22,
    });

    expect(markup).toContain('>最高分<');
    expect(markup).toContain('>27<');
  });

  it('shows the NEW! badge when the score beats the previous high score at game over', () => {
    const markup = renderGame({
      score: 12,
      highScore: 12,
      previousHighScore: 9,
      isGameOver: true,
    });

    expect(pageStyles.newBadge).toBeTruthy();
    expect(markup).toContain('NEW!');
    expect(markup).toContain(pageStyles.newBadge);
  });
});
