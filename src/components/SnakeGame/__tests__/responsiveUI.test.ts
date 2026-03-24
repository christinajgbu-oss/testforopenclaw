import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  };
}

function renderGame(state: Partial<GameState> = {}) {
  mockedUseSnakeGame.mockReturnValue({
    ...createGameState(state),
    resetGame: vi.fn(),
    turnSnake: vi.fn(),
  });

  return renderToStaticMarkup(createElement(SnakeGame));
}

describe('SnakeGame responsive UI', () => {
  beforeEach(() => {
    mockedUseSnakeGame.mockReset();
  });

  it('renders a mobile-first layout that can shrink without overflowing', () => {
    const markup = renderGame();

    expect(markup).toContain('grid-template-columns:minmax(0, 1fr)');
    expect(markup).toContain('max-width:min(920px, calc(100vw - 20px))');
    expect(markup).toContain('overflow-x:hidden');
    expect(markup).toContain('min-width:0');
    expect(markup).toContain('width:min(100%, calc(100vw - 48px))');
    expect(markup).toContain('overflow:hidden');
    expect(markup).toContain('min-height:0');
  });

  it('renders touch-friendly controls for mobile players', () => {
    const markup = renderGame();

    expect(markup).toContain('min-width:44px');
    expect(markup).toContain('min-height:44px');
    expect(markup).toContain('touch-action:manipulation');
  });
});
