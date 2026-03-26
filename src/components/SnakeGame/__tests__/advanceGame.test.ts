import { describe, expect, it } from 'vitest';

import { advanceGame } from '../advanceGame';
import type { Cell, GameState } from '../types';

function createState(overrides: Partial<GameState> = {}): GameState {
  const snake: Cell[] = overrides.snake ?? [
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
  ];

  return {
    snake,
    food: overrides.food ?? { x: 12, y: 12 },
    direction: overrides.direction ?? 'RIGHT',
    queuedDirection: overrides.queuedDirection ?? overrides.direction ?? 'RIGHT',
    score: overrides.score ?? 0,
    highScore: overrides.highScore ?? 0,
    previousHighScore: overrides.previousHighScore ?? 0,
    isGameOver: overrides.isGameOver ?? false,
    gameStatus: 'running',
    prop: null,
    activeProps: {},
  };
}

describe('advanceGame', () => {
  it('moves the snake one cell in the queued direction and drops the tail', () => {
    const next = advanceGame(createState());

    expect(next.snake).toEqual([
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ]);
    expect(next.direction).toBe('RIGHT');
    expect(next.queuedDirection).toBe('RIGHT');
    expect(next.score).toBe(0);
    expect(next.isGameOver).toBe(false);
  });

  it('grows the snake, increments score, and respawns food when the head reaches food', () => {
    const next = advanceGame(
      createState({
        food: { x: 6, y: 8 },
      }),
      () => ({ x: 10, y: 10 }),
    );

    expect(next.snake).toEqual([
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 },
    ]);
    expect(next.score).toBe(1);
    expect(next.food).toEqual({ x: 10, y: 10 });
    expect(next.isGameOver).toBe(false);
  });

  it('ignores a queued direction that reverses into the current direction', () => {
    const next = advanceGame(
      createState({
        direction: 'RIGHT',
        queuedDirection: 'LEFT',
      }),
    );

    expect(next.direction).toBe('RIGHT');
    expect(next.snake[0]).toEqual({ x: 6, y: 8 });
  });

  it('marks the game over when the next move hits a wall', () => {
    const state = createState({
      snake: [
        { x: 15, y: 8 },
        { x: 14, y: 8 },
        { x: 13, y: 8 },
      ],
      direction: 'RIGHT',
      queuedDirection: 'RIGHT',
    });

    const next = advanceGame(state);

    expect(next.isGameOver).toBe(true);
    expect(next.snake).toEqual(state.snake);
    expect(next.score).toBe(0);
  });

  it('marks the game over when the next move hits the snake body', () => {
    const state = createState({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 4, y: 5 },
        { x: 4, y: 4 },
      ],
      direction: 'DOWN',
      queuedDirection: 'LEFT',
    });

    const next = advanceGame(state);

    expect(next.isGameOver).toBe(true);
    expect(next.snake).toEqual(state.snake);
  });

  it('returns the current state unchanged after the game is already over', () => {
    const state = createState({ isGameOver: true });

    expect(advanceGame(state)).toEqual(state);
  });
});
