export type Cell = {
  x: number;
  y: number;
};

export type Food = Cell;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type AchievementId =
  | 'first_bite'
  | 'gourmet_10'
  | 'gourmet_30'
  | 'gourmet_50'
  | 'half_board'
  | 'perfect_fill'
  | 'comeback_kid'
  | 'no_miss'
  | 'speedster';

export type AchievementStore = Partial<
  Record<AchievementId, { unlockedAt: number }>
>;

export type AchievementMeta = {
  consecutiveFoodEats: number;
  lastFoodEatenAt: number | null;
  previousScore: number;
};

export const ACHIEVEMENTS: Array<{
  id: AchievementId;
  icon: string;
  name: string;
  description: string;
}> = [
  {
    id: 'first_bite',
    icon: '🐁',
    name: 'First Bite',
    description: 'Score your first point.',
  },
  {
    id: 'gourmet_10',
    icon: '🍎',
    name: 'Gourmet 10',
    description: 'Reach a score of 10.',
  },
  {
    id: 'gourmet_30',
    icon: '🍇',
    name: 'Gourmet 30',
    description: 'Reach a score of 30.',
  },
  {
    id: 'gourmet_50',
    icon: '🍉',
    name: 'Gourmet 50',
    description: 'Reach a score of 50.',
  },
  {
    id: 'half_board',
    icon: '📏',
    name: 'Half Board',
    description: 'Grow the snake to 128 segments.',
  },
  {
    id: 'perfect_fill',
    icon: '🏆',
    name: 'Perfect Fill',
    description: 'Fill all 256 cells on the board.',
  },
  {
    id: 'comeback_kid',
    icon: '🔥',
    name: 'Comeback Kid',
    description: 'Go from 5 behind the record to taking the lead.',
  },
  {
    id: 'no_miss',
    icon: '🎯',
    name: 'No Miss',
    description: 'Eat 10 foods in a row without dying.',
  },
  {
    id: 'speedster',
    icon: '⚡',
    name: 'Speedster',
    description: 'Eat two foods within one second.',
  },
];

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
