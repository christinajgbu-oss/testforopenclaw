import { GRID_SIZE } from './types';
import type { Cell, Food } from './types';

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function randomFoodPosition(snake: Cell[], gridSize = GRID_SIZE): Food {
  const options: Food[] = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const candidate = { x, y };

      if (!snake.some((segment) => isSameCell(segment, candidate))) {
        options.push(candidate);
      }
    }
  }

  return options[Math.floor(Math.random() * options.length)] ?? { x: 0, y: 0 };
}

export function isColliding(cell: Cell, snake: Cell[], gridSize = GRID_SIZE) {
  const hitsWall =
    cell.x < 0 || cell.x >= gridSize || cell.y < 0 || cell.y >= gridSize;

  if (hitsWall) {
    return true;
  }

  return snake.some((segment) => isSameCell(segment, cell));
}
