import { GRID_SIZE } from './types';
import type { Cell, Food, Prop } from './types';

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

export function randomPropPosition(
  snake: Cell[],
  food: Food,
  bonusFood: Food | undefined,
  existingProp: Prop | null,
  gridSize = GRID_SIZE,
): { x: number; y: number } | null {
  const avoidSet = new Set([
    ...snake.map((s) => `${s.x}-${s.y}`),
    `${food.x}-${food.y}`,
    ...(bonusFood ? [`${bonusFood.x}-${bonusFood.y}`] : []),
    ...(existingProp ? [`${existingProp.x}-${existingProp.y}`] : []),
  ]);

  const options: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x}-${y}`;
      if (!avoidSet.has(key)) {
        options.push({ x, y });
      }
    }
  }

  if (options.length === 0) {
    return null;
  }

  return options[Math.floor(Math.random() * options.length)];
}
