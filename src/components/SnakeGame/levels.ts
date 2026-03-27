import type { Cell } from './types';

// Grid is 16x16 (GRID_SIZE = 16)
// Snake head starts at roughly (8, 8)
// Obstacles must not block starting area (3-cell radius must be clear)

export type Level = {
  id: number;
  name: string;
  targetScore: number;
  tickMs: number;
  obstaclePositions: Cell[];
  description: string;
};

// Helper: create cell
const c = (x: number, y: number): Cell => ({ x, y });

// Level 1: 新手村 - no obstacles, warm-up
// Level 2: 初试锋芒 - 4 corner obstacles
// Level 3: 蛇走廊 - horizontal walls with center gap
// Level 4: 迷宫入口 - "回"字 style walls
// Level 5: 速度之战 - fast + scattered obstacles
// Level 6: 道具狂潮 - 4 scattered obstacles (道具密度高)
// Level 7: 狭路相逢 - 16 narrow vertical corridors
// Level 8: 黑暗森林 - 10 scattered obstacles
// Level 9: 终章前哨 - "丰"字通道
// Level 10: 贪吃王者 - dense + complex

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '第1关 · 新手村',
    targetScore: 30,
    tickMs: 200,
    obstaclePositions: [],
    description: '热身关卡，熟悉操作',
  },
  {
    id: 2,
    name: '第2关 · 初试锋芒',
    targetScore: 50,
    tickMs: 180,
    obstaclePositions: [
      c(2, 2), c(13, 2),
      c(2, 13), c(13, 13),
    ],
    description: '简单障碍，开始需要策略',
  },
  {
    id: 3,
    name: '第3关 · 蛇走廊',
    targetScore: 60,
    tickMs: 160,
    obstaclePositions: [
      // top and bottom walls with center gap (x=7,8)
      ...[0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15].map(x => c(x, 3)),
      ...[0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15].map(x => c(x, 12)),
      // side partial walls
      c(3, 6), c(3, 9),
      c(12, 6), c(12, 9),
    ],
    description: '窄长通道，方向控制要求高',
  },
  {
    id: 4,
    name: '第4关 · 迷宫入口',
    targetScore: 70,
    tickMs: 150,
    obstaclePositions: [
      // "回"字 outer - top/bottom
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(x => c(x, 2)),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(x => c(x, 13)),
      // "回"字 outer - left/right
      c(2, 3), c(2, 4), c(2, 5), c(2, 6), c(2, 7), c(2, 8), c(2, 9), c(2, 10), c(2, 11), c(2, 12),
      c(13, 3), c(13, 4), c(13, 5), c(13, 6), c(13, 7), c(13, 8), c(13, 9), c(13, 10), c(13, 11), c(13, 12),
    ],
    description: '墙体形成简单迷宫',
  },
  {
    id: 5,
    name: '第5关 · 速度之战',
    targetScore: 80,
    tickMs: 100,
    obstaclePositions: [
      c(4, 4), c(11, 4),
      c(4, 11), c(11, 11),
      c(7, 7), c(8, 7),
      c(7, 8), c(8, 8), // skip center - snake starts there
      // remove center 4
      c(2, 6), c(13, 6),
      c(2, 9), c(13, 9),
    ].filter(cell => !(cell.x >= 6 && cell.x <= 9 && cell.y >= 6 && cell.y <= 9)),
    description: '高速 + 障碍，考验反应',
  },
  {
    id: 6,
    name: '第6关 · 道具狂潮',
    targetScore: 90,
    tickMs: 140,
    obstaclePositions: [
      c(3, 5), c(12, 5),
      c(5, 8), c(10, 8),
      c(3, 11), c(12, 11),
    ],
    description: '道具高密度，策略组合',
  },
  {
    id: 7,
    name: '第7关 · 狭路相逢',
    targetScore: 100,
    tickMs: 130,
    obstaclePositions: [
      // Vertical walls creating narrow horizontal corridors
      // Row 4 corridor at y=5,6
      c(0, 4), c(1, 4), c(2, 4), c(3, 4), c(4, 4),
      c(11, 4), c(12, 4), c(13, 4), c(14, 4), c(15, 4),
      c(0, 7), c(1, 7), c(2, 7), c(3, 7), c(4, 7),
      c(11, 7), c(12, 7), c(13, 7), c(14, 7), c(15, 7),
      // Row 4 corridor at y=9,10
      c(0, 10), c(1, 10), c(2, 10), c(3, 10), c(4, 10),
      c(11, 10), c(12, 10), c(13, 10), c(14, 10), c(15, 10),
      c(0, 13), c(1, 13), c(2, 13), c(3, 13), c(4, 13),
      c(11, 13), c(12, 13), c(13, 13), c(14, 13), c(15, 13),
    ],
    description: '极窄通道，精准控制',
  },
  {
    id: 8,
    name: '第8关 · 黑暗森林',
    targetScore: 110,
    tickMs: 120,
    obstaclePositions: [
      c(2, 3), c(5, 5), c(8, 2), c(11, 4),
      c(3, 7), c(7, 6), c(12, 8),
      c(2, 11), c(6, 10), c(9, 12),
      c(13, 13), c(4, 13), c(10, 9),
    ],
    description: '长蛇身控制，耐心为主',
  },
  {
    id: 9,
    name: '第9关 · 终章前哨',
    targetScore: 120,
    tickMs: 110,
    obstaclePositions: [
      // "丰"字通道
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => c(x, 3)),
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => c(x, 7)),
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(x => c(x, 12)),
      c(3, 4), c(3, 5), c(3, 6),
      c(12, 4), c(12, 5), c(12, 6),
      c(7, 8), c(8, 8),
      c(7, 9), c(8, 9),
      c(7, 10), c(8, 10),
      c(7, 11), c(8, 11),
    ],
    description: '混合要素，全方位挑战',
  },
  {
    id: 10,
    name: '第10关 · 贪吃王者',
    targetScore: 150,
    tickMs: 90,
    obstaclePositions: [
      // Dense grid-like pattern with open corridors
      // Row 2
      c(2, 2), c(5, 2), c(8, 2), c(11, 2), c(14, 2),
      // Row 5
      c(1, 5), c(4, 5), c(7, 5), c(10, 5), c(13, 5),
      // Row 8
      c(3, 8), c(6, 8), c(9, 8), c(12, 8),
      // Row 11
      c(1, 11), c(4, 11), c(7, 11), c(10, 11), c(13, 11),
      // Row 14
      c(2, 14), c(5, 14), c(8, 14), c(11, 14), c(14, 14),
      // Extra scattered
      c(0, 8), c(15, 7),
    ],
    description: '全地图障碍，极限挑战',
  },
];

export const LEVEL_PROGRESS_KEY = 'snake_level_progress';

export type LevelProgressStore = {
  unlockedLevelId: number;
  completedLevels: number[];
};

export function readLevelProgress(): LevelProgressStore {
  if (typeof window === 'undefined') return { unlockedLevelId: 1, completedLevels: [] };
  const raw = localStorage.getItem(LEVEL_PROGRESS_KEY);
  if (!raw) return { unlockedLevelId: 1, completedLevels: [] };
  try {
    return JSON.parse(raw) as LevelProgressStore;
  } catch {
    return { unlockedLevelId: 1, completedLevels: [] };
  }
}

export function writeLevelProgress(progress: LevelProgressStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progress));
}

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getNextLevelId(currentId: number): number | null {
  const next = LEVELS.find(l => l.id === currentId + 1);
  return next ? next.id : null;
}
