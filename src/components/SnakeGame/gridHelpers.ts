import { GRID_SIZE } from './types';
import type { Cell, Food, ObstacleDifficulty, Prop } from './types';

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function isObstacle(cell: Cell, obstacles: Cell[]) {
  return obstacles.some((obs) => isSameCell(obs, cell));
}

export function generateObstacles(
  snake: Cell[],
  food: Food,
  bonusFood: Food | undefined,
  difficulty: ObstacleDifficulty,
): Cell[] {
  const count = { simple: 3, normal: 6, hard: 9 }[difficulty];
  const snakeSet = new Set(snake.map((s) => `${s.x}-${s.y}`));
  const avoidSet = new Set([
    ...snakeSet,
    `${food.x}-${food.y}`,
    ...(bonusFood ? [`${bonusFood.x}-${bonusFood.y}`] : []),
    // Avoid snake head area (3x3 around head)
    ...[...Array(3)].flatMap((_, dx) =>
      [...Array(3)].map((_, dy) => {
        const hx = snake[0].x;
        const hy = snake[0].y;
        return `${Math.max(0, Math.min(GRID_SIZE - 1, hx - 1 + dx))}-${Math.max(0, Math.min(GRID_SIZE - 1, hy - 1 + dy))}`;
      }),
    ),
  ]);

  const placed: Cell[] = [];
  const attempts = 200;

  for (let i = 0; i < attempts && placed.length < count; i += 1) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const key = `${x}-${y}`;

    if (!avoidSet.has(key) && !placed.some((p) => p.x === x && p.y === y)) {
      placed.push({ x, y });
      avoidSet.add(key);
    }
  }

  return placed;
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
  obstacles: Cell[] = [],
): { x: number; y: number } | null {
  const avoidSet = new Set([
    ...snake.map((s) => `${s.x}-${s.y}`),
    `${food.x}-${food.y}`,
    ...(bonusFood ? [`${bonusFood.x}-${bonusFood.y}`] : []),
    ...(existingProp ? [`${existingProp.x}-${existingProp.y}`] : []),
    ...obstacles.map((o) => `${o.x}-${o.y}`),
  ]);

  const options: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
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
