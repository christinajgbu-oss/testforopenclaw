import { describe, expect, it, vi } from 'vitest';

import { randomFoodPosition, isColliding } from '../gridHelpers';
import type { Cell } from '../types';

const GRID_SIZE = 16;

function buildNearlyFullSnake(): Cell[] {
  const cells: Cell[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (x === GRID_SIZE - 1 && y === GRID_SIZE - 1) {
        continue;
      }

      cells.push({ x, y });
    }
  }

  return cells;
}

describe('randomFoodPosition', () => {
  it('returns the only open grid cell when every other cell is occupied', () => {
    const snake = buildNearlyFullSnake();

    expect(randomFoodPosition(snake, GRID_SIZE)).toEqual({ x: 15, y: 15 });
  });

  it('uses Math.random to select from the remaining open cells', () => {
    const snake: Cell[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(randomFoodPosition(snake, 2)).toEqual({ x: 1, y: 1 });

    randomSpy.mockRestore();
  });
});

describe('isColliding', () => {
  it('returns true when a cell is outside the grid bounds', () => {
    expect(isColliding({ x: -1, y: 4 }, [], GRID_SIZE)).toBe(true);
    expect(isColliding({ x: 16, y: 4 }, [], GRID_SIZE)).toBe(true);
    expect(isColliding({ x: 4, y: -1 }, [], GRID_SIZE)).toBe(true);
    expect(isColliding({ x: 4, y: 16 }, [], GRID_SIZE)).toBe(true);
  });

  it('returns true when a cell overlaps the snake body', () => {
    const snake: Cell[] = [
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ];

    expect(isColliding({ x: 3, y: 2 }, snake, GRID_SIZE)).toBe(true);
  });

  it('returns false for an empty in-bounds cell', () => {
    const snake: Cell[] = [{ x: 3, y: 2 }];

    expect(isColliding({ x: 1, y: 1 }, snake, GRID_SIZE)).toBe(false);
  });
});
