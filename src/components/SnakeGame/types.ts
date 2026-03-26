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

export const SKIN_STORAGE_KEY = 'snake_skin';

export type SkinId = 'default' | 'neon' | 'pixel' | 'candy' | 'mario';

export type HistoryEntry = {
  id: string;
  score: number;
  achievedAt: number;
  skinId: SkinId;
  achievementCount: number;
  durationSeconds: number;
  difficulty: Difficulty;
};

export type Difficulty = 'easy' | 'normal' | 'hard';

export type DifficultySetting = {
  tickMs: number;
  foodCount: number;
  label: string;
  labelEn: string;
};

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySetting> = {
  easy: { tickMs: 200, foodCount: 2, label: '简单', labelEn: 'Easy' },
  normal: { tickMs: 120, foodCount: 1, label: '普通', labelEn: 'Normal' },
  hard: { tickMs: 70, foodCount: 1, label: '困难', labelEn: 'Hard' },
};

export type ShareCardProps = {
  score: number;
  skinId: SkinId;
  achievementIds: AchievementId[];
  durationSeconds: number;
  onClose: () => void;
  onRestart: () => void;
};

export const SKINS: Array<{
  id: SkinId;
  name: string;
  headColor: string;
  bodyColor: string;
  foodColor: string;
  bgColor: string;
  unlocked: boolean;
}> = [
  {
    id: 'default',
    name: '经典绿',
    headColor: '#22c55e',
    bodyColor: '#15803d',
    foodColor: '#f97316',
    bgColor: '#0a0a1a',
    unlocked: true,
  },
  {
    id: 'neon',
    name: '霓虹夜',
    headColor: '#06b6d4',
    bodyColor: '#6366f1',
    foodColor: '#f472b6',
    bgColor: '#0a0a1a',
    unlocked: true,
  },
  {
    id: 'pixel',
    name: '像素复古',
    headColor: '#dc2626',
    bodyColor: '#7c2d12',
    foodColor: '#fbbf24',
    bgColor: '#1c1917',
    unlocked: true,
  },
  {
    id: 'candy',
    name: '糖果风',
    headColor: '#f9a8d4',
    bodyColor: '#db2777',
    foodColor: '#a3e635',
    bgColor: '#2e1065',
    unlocked: false,
  },
  {
    id: 'mario',
    name: '马里奥',
    headColor: '#ef4444',
    bodyColor: '#1d4ed8',
    foodColor: '#fbbf24',
    bgColor: '#fef3c7',
    unlocked: false,
  },
];

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
  bonusFood?: Food;
  direction: Direction;
  queuedDirection: Direction;
  score: number;
  highScore: number;
  previousHighScore: number;
  isGameOver: boolean;
  gameStatus: 'idle' | 'running' | 'gameover';
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

export type GameStatus = 'idle' | 'running' | 'gameover';

export function isSkinUnlocked(
  skinId: SkinId,
  achievements: AchievementStore,
) {
  const skin = SKINS.find((entry) => entry.id === skinId);

  if (!skin) {
    return false;
  }

  if (skin.unlocked) {
    return true;
  }

  return ACHIEVEMENTS.every((achievement) => Boolean(achievements[achievement.id]));
}
