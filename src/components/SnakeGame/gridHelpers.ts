import { GRID_SIZE } from './types';
import type { Cell, Food } from './types';

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function randomFoodPosition(
  snake: Cell[],
  gridSize: number = GRID_SIZE,
): Food {
  const options: Food[] = [];
  const avoidSet = new Set(snake.map((s) => `${s.x}-${s.y}`));

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x}-${y}`;
      if (!avoidSet.has(key)) {
        options.push({ x, y });
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
