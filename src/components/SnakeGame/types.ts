export type Cell = {
  x: number;
  y: number;
};

export type Food = Cell;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameState = {
  snake: Cell[];
  food: Food;
  direction: Direction;
  queuedDirection: Direction;
  score: number;
  highScore: number;
  previousHighScore: number;
  isGameOver: boolean;
};

export const GRID_SIZE = 16;

export const INITIAL_SNAKE: Cell[] = [
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
];

export const INITIAL_DIRECTION: Direction = 'RIGHT';

export const TICK_MS = 140;

export const DIRECTION_OFFSETS: Record<Direction, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};
