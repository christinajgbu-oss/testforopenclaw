import { GRID_SIZE, OBSTACLE_SETTINGS } from './types';
import type { Cell, Food, ObstacleDifficulty, Prop } from './types';

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

function toCellKey(cell: Cell) {
  return `${cell.x}-${cell.y}`;
}

function listOpenCells(avoidSet: Set<string>, gridSize: number) {
  const options: Cell[] = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const candidate = { x, y };

      if (!avoidSet.has(toCellKey(candidate))) {
        options.push(candidate);
      }
    }
  }

  return options;
}

function pickRandomCell(options: Cell[], random: () => number = Math.random) {
  return options[Math.floor(random() * options.length)] ?? null;
}

export function isObstacle(cell: Cell, obstacles: Cell[]) {
  return obstacles.some((obs) => isSameCell(obs, cell));
}

export function generateObstacles(
  snake: Cell[],
  food: Food,
  bonusFood: Food | undefined,
  difficulty: ObstacleDifficulty,
  random: () => number = Math.random,
): Cell[] {
  const count = OBSTACLE_SETTINGS[difficulty].count;
  const snakeSet = new Set(snake.map(toCellKey));
  const avoidSet = new Set([
    ...snakeSet,
    toCellKey(food),
    ...(bonusFood ? [toCellKey(bonusFood)] : []),
    // Avoid snake head area (3x3 around head)
    ...[...Array(3)].flatMap((_, dx) =>
      [...Array(3)].map((_, dy) => {
        const hx = snake[0].x;
        const hy = snake[0].y;
        return `${Math.max(0, Math.min(GRID_SIZE - 1, hx - 1 + dx))}-${Math.max(0, Math.min(GRID_SIZE - 1, hy - 1 + dy))}`;
      }),
    ),
  ]);

  const options = listOpenCells(avoidSet, GRID_SIZE);

  for (let index = options.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const current = options[index];
    options[index] = options[randomIndex];
    options[randomIndex] = current;
  }

  return options.slice(0, count);
}

export function randomFoodPosition(
  snake: Cell[],
  gridSize: number = GRID_SIZE,
  blockedCells: Cell[] = [],
  random: () => number = Math.random,
): Food {
  const avoidSet = new Set([
    ...snake.map(toCellKey),
    ...blockedCells.map(toCellKey),
  ]);

  return pickRandomCell(listOpenCells(avoidSet, gridSize), random) ?? { x: 0, y: 0 };
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
  random: () => number = Math.random,
): { x: number; y: number } | null {
  const avoidSet = new Set([
    ...snake.map(toCellKey),
    toCellKey(food),
    ...(bonusFood ? [toCellKey(bonusFood)] : []),
    ...(existingProp ? [toCellKey(existingProp)] : []),
    ...obstacles.map(toCellKey),
  ]);

  return pickRandomCell(listOpenCells(avoidSet, GRID_SIZE), random);
}
