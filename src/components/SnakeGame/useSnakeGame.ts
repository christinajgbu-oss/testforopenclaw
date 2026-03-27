'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { advanceGame } from './advanceGame';
import {
  playAchievement,
  playDie,
  playEat,
  playNewRecord,
  vibrate,
} from './audio';
import { fetchDailyLeaderboard, submitDailyScore, submitGlobalScore } from './LeaderboardApi';
import { generateObstacles, randomFoodPosition } from './gridHelpers';
import {
  getLevelById,
  getNextLevelId,
  LEVELS,
  readLevelProgress,
  writeLevelProgress,
} from './levels';
import {
  ACHIEVEMENTS,
  DIFFICULTY_SETTINGS,
  GRID_SIZE,
  INITIAL_DIRECTION,
  INITIAL_SNAKE,
  OPPOSITE_DIRECTION,
  SKINS,
  SKIN_STORAGE_KEY,
  isSkinUnlocked,
} from './types';
import type {
  AchievementId,
  AchievementMeta,
  AchievementStore,
  Cell,
  DailyChallenge,
  Difficulty,
  Direction,
  Food,
  GameState,
  HistoryEntry,
  ObstacleDifficulty,
  ReplayData,
  ReplayInput,
  SkinId,
} from './types';

const HIGH_SCORE_STORAGE_KEY = 'snake_highscore';
export const ACHIEVEMENT_STORAGE_KEY = 'snake_achievements';
export const HISTORY_STORAGE_KEY = 'snake_history';
export const REPLAY_STORAGE_KEY = 'snake_replays';
export const DAILY_CHALLENGE_STORAGE_KEY = 'snake_daily_challenges';
const MAX_REPLAYS = 50;
const MAX_DAILY_CHALLENGES = 30;
const DAILY_CHALLENGE_PLAYOUTS = 1_000;
const DAILY_CHALLENGE_CHUNK_SIZE = 50;
const DAILY_CHALLENGE_MAX_TICKS = 4_096;
const DAILY_CHALLENGE_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const DAILY_CHALLENGE_OBSTACLES: ObstacleDifficulty[] = [
  'simple',
  'normal',
  'hard',
];
const DAILY_CHALLENGE_DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type ReplayStore = {
  replays: ReplayData[];
};

type DailyChallengeStore = {
  challenges: Record<string, DailyChallenge>;
};

type GetFoodPosition = (
  snake: GameState['snake'],
  gridSize?: number | undefined,
  blockedCells?: GameState['obstacles'],
) => Cell;

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function readHighScore(storage: StorageLike | null) {
  const rawValue = storage?.getItem(HIGH_SCORE_STORAGE_KEY);
  const parsedValue = Number.parseInt(rawValue ?? '', 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function getTodayDateString(now: Date = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDailySeed(date: string) {
  let hash = 0;

  for (let index = 0; index < date.length; index += 1) {
    hash = Math.imul(hash ^ date.charCodeAt(index), 0x45d9f3b);
    hash ^= hash >>> 16;
  }

  return hash >>> 0;
}

export type SharedModeState = {
  dailyChallengeDate: string | null;
  expiredDailyChallengeDate: string | null;
  replayData: ReplayData | null;
};

export function resolveSharedModeState(
  search: string,
  today: string,
): SharedModeState {
  const params = new URLSearchParams(search);
  const dailyParam = params.get('daily');
  const replayParam = params.get('replay');

  if (replayParam) {
    const decoded = decodeReplayData(replayParam);
    return {
      dailyChallengeDate: null,
      expiredDailyChallengeDate: null,
      replayData: decoded,
    };
  }

  if (dailyParam) {
    if (dailyParam === today) {
      return {
        dailyChallengeDate: dailyParam,
        expiredDailyChallengeDate: null,
        replayData: null,
      };
    } else {
      return {
        dailyChallengeDate: null,
        expiredDailyChallengeDate: dailyParam,
        replayData: null,
      };
    }
  }

  return {
    dailyChallengeDate: null,
    expiredDailyChallengeDate: null,
    replayData: null,
  };
}

function createFoodGenerator(random: () => number): GetFoodPosition {
  return (snake, gridSize, blockedCells = []) =>
    randomFoodPosition(snake, gridSize, blockedCells, random);
}

function isDailyChallenge(value: unknown): value is DailyChallenge {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const challenge = value as Partial<DailyChallenge>;

  return (
    typeof challenge.date === 'string' &&
    typeof challenge.seed === 'number' &&
    typeof challenge.difficulty === 'string' &&
    typeof challenge.obstacleMode === 'boolean' &&
    typeof challenge.obstacleDifficulty === 'string' &&
    typeof challenge.targetScore === 'number' &&
    typeof challenge.bestScore === 'number' &&
    typeof challenge.completed === 'boolean' &&
    typeof challenge.attempts === 'number'
  );
}

function pruneDailyChallenges(
  challenges: Record<string, DailyChallenge>,
): Record<string, DailyChallenge> {
  return Object.fromEntries(
    Object.entries(challenges)
      .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
      .slice(0, MAX_DAILY_CHALLENGES),
  );
}

export function createDailyChallenge(date: string): DailyChallenge {
  const seed = getDailySeed(date);
  const random = seededRandom(seed);
  const difficulty =
    DAILY_CHALLENGE_DIFFICULTIES[
      Math.floor(random() * DAILY_CHALLENGE_DIFFICULTIES.length)
    ] ?? 'normal';
  const obstacleMode = random() >= 0.35;
  const obstacleDifficulty = obstacleMode
    ? DAILY_CHALLENGE_OBSTACLES[
        Math.floor(random() * DAILY_CHALLENGE_OBSTACLES.length)
      ] ?? 'normal'
    : 'simple';

  return {
    date,
    seed,
    difficulty,
    obstacleMode,
    obstacleDifficulty,
    targetScore: 0,
    bestScore: 0,
    completed: false,
    attempts: 0,
  };
}

export function readDailyChallengeStore(
  storage: StorageLike | null = getStorage(),
): DailyChallengeStore {
  const rawValue = storage?.getItem(DAILY_CHALLENGE_STORAGE_KEY);

  if (!rawValue) {
    return { challenges: {} };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<DailyChallengeStore>;
    const challenges = Object.fromEntries(
      Object.entries(parsedValue?.challenges ?? {}).filter((entry) =>
        isDailyChallenge(entry[1]),
      ),
    );

    return {
      challenges: pruneDailyChallenges(challenges),
    };
  } catch {
    return { challenges: {} };
  }
}

export function saveDailyChallenge(
  challenge: DailyChallenge,
  storage: StorageLike | null = getStorage(),
) {
  const existing = readDailyChallengeStore(storage).challenges;
  const challenges = pruneDailyChallenges({
    ...existing,
    [challenge.date]: challenge,
  });

  storage?.setItem(
    DAILY_CHALLENGE_STORAGE_KEY,
    JSON.stringify({ challenges }),
  );

  return challenge;
}

export function updateStoredDailyChallengeResult(
  date: string,
  score: number,
  storage: StorageLike | null = getStorage(),
) {
  const challenge = readDailyChallengeStore(storage).challenges[date];

  if (!challenge) {
    return null;
  }

  const nextChallenge: DailyChallenge = {
    ...challenge,
    bestScore: Math.max(challenge.bestScore, score),
    completed: challenge.completed || score >= challenge.targetScore,
    attempts: challenge.attempts + 1,
  };

  saveDailyChallenge(nextChallenge, storage);
  return nextChallenge;
}

function createReplaySeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

function readReplayStore(
  storage: StorageLike | null = getStorage(),
): ReplayStore {
  const rawValue = storage?.getItem(REPLAY_STORAGE_KEY);

  if (!rawValue) {
    return { replays: [] };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<ReplayStore>;
    return {
      replays: Array.isArray(parsedValue?.replays)
        ? parsedValue.replays.filter(
            (replay): replay is ReplayData =>
              typeof replay === 'object' &&
              replay !== null &&
              typeof replay.id === 'string' &&
              typeof replay.savedAt === 'number' &&
              typeof replay.seed === 'number' &&
              Array.isArray(replay.inputs),
          )
        : [],
    };
  } catch {
    return { replays: [] };
  }
}

export function readReplays(
  storage: StorageLike | null = getStorage(),
): ReplayData[] {
  return readReplayStore(storage).replays;
}

export function writeReplay(
  replay: ReplayData,
  storage: StorageLike | null = getStorage(),
) {
  const nextReplays = [replay, ...readReplays(storage)].slice(0, MAX_REPLAYS);
  storage?.setItem(
    REPLAY_STORAGE_KEY,
    JSON.stringify({ replays: nextReplays }),
  );
}

function toBase64(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  const encoded = new TextEncoder().encode(value);
  let binary = '';

  encoded.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function fromBase64(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }

  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function isReplayData(value: unknown): value is ReplayData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const replay = value as Partial<ReplayData>;

  return (
    typeof replay.id === 'string' &&
    typeof replay.savedAt === 'number' &&
    typeof replay.seed === 'number' &&
    typeof replay.difficulty === 'string' &&
    typeof replay.skinId === 'string' &&
    typeof replay.obstacleMode === 'boolean' &&
    typeof replay.durationSeconds === 'number' &&
    typeof replay.finalScore === 'number' &&
    Array.isArray(replay.finalAchievementIds) &&
    Array.isArray(replay.inputs)
  );
}

export function encodeReplayData(replay: ReplayData): string {
  return toBase64(JSON.stringify(replay))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function decodeReplayData(encoded: string): ReplayData | null {
  if (!encoded) {
    return null;
  }

  try {
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const paddingLength = normalized.length % 4;
    const padded =
      paddingLength === 0
        ? normalized
        : `${normalized}${'='.repeat(4 - paddingLength)}`;
    const parsed = JSON.parse(fromBase64(padded)) as unknown;

    return isReplayData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSkinId(value: string | null | undefined): value is SkinId {
  return SKINS.some((skin) => skin.id === value);
}

export function readSelectedSkin(
  storage: StorageLike | null = getStorage(),
  achievements: AchievementStore = {},
): SkinId {
  const rawValue = storage?.getItem(SKIN_STORAGE_KEY);

  if (!isSkinId(rawValue)) {
    return 'default';
  }

  return isSkinUnlocked(rawValue, achievements) ? rawValue : 'default';
}

export function writeSelectedSkin(
  skinId: SkinId,
  storage: StorageLike | null = getStorage(),
) {
  storage?.setItem(SKIN_STORAGE_KEY, skinId);
}

export function selectSkin(
  skinId: SkinId,
  achievements: AchievementStore,
  storage: StorageLike | null = getStorage(),
): SkinId {
  if (!isSkinUnlocked(skinId, achievements)) {
    return readSelectedSkin(storage, achievements);
  }

  writeSelectedSkin(skinId, storage);
  return skinId;
}

export function createInitialAchievementMeta(): AchievementMeta {
  return {
    consecutiveFoodEats: 0,
    lastFoodEatenAt: null,
    previousScore: 0,
  };
}

export function readAchievements(
  storage: StorageLike | null = getStorage(),
): AchievementStore {
  const rawValue = storage?.getItem(ACHIEVEMENT_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<
      Record<string, { unlockedAt?: unknown }>
    >;

    return ACHIEVEMENTS.reduce<AchievementStore>((store, achievement) => {
      const unlockedAt = parsedValue?.[achievement.id]?.unlockedAt;

      if (typeof unlockedAt === 'number' && Number.isFinite(unlockedAt)) {
        store[achievement.id] = { unlockedAt };
      }

      return store;
    }, {});
  } catch {
    return {};
  }
}

export function writeAchievements(
  achievements: AchievementStore,
  storage: StorageLike | null = getStorage(),
) {
  storage?.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(achievements));
}

export function readHistory(
  storage: StorageLike | null = getStorage(),
): HistoryEntry[] {
  const rawValue = storage?.getItem(HISTORY_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown[];

    return parsed.filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).score === 'number' &&
        typeof (entry as HistoryEntry).achievedAt === 'number',
    );
  } catch {
    return [];
  }
}

export function writeHistory(
  entry: HistoryEntry,
  storage: StorageLike | null = getStorage(),
) {
  const existing = readHistory(storage);
  const next = [entry, ...existing].slice(0, 50); // keep latest 50
  storage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

type AchievementUpdateArgs = {
  previousState: GameState;
  nextState: GameState;
  achievements: AchievementStore;
  meta: AchievementMeta;
  now: number;
};

type AchievementUpdateResult = {
  achievements: AchievementStore;
  meta: AchievementMeta;
  hasNewUnlock: boolean;
};

type SnakeGameFeedback = {
  playAchievement: boolean;
  playDie: boolean;
  playEat: boolean;
  playNewRecord: boolean;
  vibrate: boolean;
};

function unlockIfNeeded(
  nextAchievements: AchievementStore,
  id: keyof AchievementStore,
  condition: boolean,
  now: number,
) {
  if (!condition || nextAchievements[id]) {
    return false;
  }

  nextAchievements[id] = { unlockedAt: now };
  return true;
}

export function updateAchievementState({
  previousState,
  nextState,
  achievements,
  meta,
  now,
}: AchievementUpdateArgs): AchievementUpdateResult {
  if (nextState.isGameOver) {
    return {
      achievements,
      meta: createInitialAchievementMeta(),
      hasNewUnlock: false,
    };
  }

  const ateFood = nextState.score > previousState.score;
  const nextMeta: AchievementMeta = ateFood
    ? {
        consecutiveFoodEats: meta.consecutiveFoodEats + 1,
        lastFoodEatenAt: now,
        previousScore: previousState.score,
      }
    : {
        ...meta,
        previousScore: previousState.score,
      };
  const nextAchievements = { ...achievements };
  let hasNewUnlock = false;
  const wasFiveBehindRecord = nextMeta.previousScore <= previousState.highScore - 5;
  const tookLead = nextState.score > previousState.highScore;

  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'first_bite', previousState.score === 0 && nextState.score >= 1, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'gourmet_10', nextState.score >= 10, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'gourmet_30', nextState.score >= 30, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'gourmet_50', nextState.score >= 50, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'half_board', nextState.snake.length >= 128, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'perfect_fill', nextState.snake.length === 256, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'comeback_kid', wasFiveBehindRecord && tookLead, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(nextAchievements, 'no_miss', nextMeta.consecutiveFoodEats >= 10, now) ||
    hasNewUnlock;
  hasNewUnlock =
    unlockIfNeeded(
      nextAchievements,
      'speedster',
      ateFood &&
        meta.lastFoodEatenAt !== null &&
        now - meta.lastFoodEatenAt <= 1_000,
      now,
    ) || hasNewUnlock;

  return {
    achievements: nextAchievements,
    meta: nextMeta,
    hasNewUnlock,
  };
}

export function getSnakeGameFeedback(
  previousState: GameState,
  nextState: GameState,
  hasNewUnlock: boolean,
): SnakeGameFeedback {
  const ateFood = nextState.score > previousState.score;

  return {
    playAchievement: hasNewUnlock,
    playDie: !previousState.isGameOver && nextState.isGameOver,
    playEat: ateFood,
    playNewRecord: nextState.highScore > nextState.previousHighScore,
    vibrate: ateFood,
  };
}

export function queueDirectionChange(
  state: GameState,
  nextDirection: Direction,
) {
  if (state.gameStatus === 'idle') {
    return {
      nextState: {
        ...state,
        gameStatus: 'running' as const,
        queuedDirection: nextDirection,
      },
      accepted: true,
      shouldRecord: true,
    };
  }

  if (
    state.isGameOver ||
    state.gameStatus === 'gameover' ||
    nextDirection === OPPOSITE_DIRECTION[state.direction]
  ) {
    return {
      nextState: state,
      accepted: false,
      shouldRecord: false,
    };
  }

  if (state.queuedDirection === nextDirection) {
    return {
      nextState: state,
      accepted: true,
      shouldRecord: false,
    };
  }

  return {
    nextState: {
      ...state,
      queuedDirection: nextDirection,
    },
    accepted: true,
    shouldRecord: true,
  };
}

export function createInitialGameState(
  storage: StorageLike | null = getStorage(),
  getFoodPosition: GetFoodPosition = randomFoodPosition,
  difficulty: Difficulty = 'normal',
  obstacleMode: ObstacleDifficulty | null = null,
  random: () => number = Math.random,
): GameState {
  const highScore = readHighScore(storage);
  const primaryFood = getFoodPosition(INITIAL_SNAKE, GRID_SIZE);

  const bonusFood =
    difficulty === 'easy'
      ? getFoodPosition(INITIAL_SNAKE, GRID_SIZE, [primaryFood])
      : undefined;

  const obstacles =
    obstacleMode !== null
      ? generateObstacles(
          INITIAL_SNAKE,
          primaryFood,
          bonusFood,
          obstacleMode,
          random,
        )
      : [];

  return {
    snake: INITIAL_SNAKE,
    food: primaryFood,
    bonusFood,
    obstacles,
    direction: INITIAL_DIRECTION,
    queuedDirection: INITIAL_DIRECTION,
    score: 0,
    highScore,
    previousHighScore: highScore,
    isGameOver: false,
    gameStatus: 'idle',
    prop: null,
    activeProps: {},
    elapsedMs: 0,
    nextPropSpawnAt: 15_000 + random() * 5_000,
  };
}

function simulateDailyChallengePlayout(challenge: DailyChallenge, seed: number) {
  const random = seededRandom(seed);
  const obstacleMode = challenge.obstacleMode
    ? challenge.obstacleDifficulty
    : null;
  const getFoodPosition = createFoodGenerator(random);
  const tickMs = DIFFICULTY_SETTINGS[challenge.difficulty].tickMs;
  let state = createInitialGameState(
    null,
    getFoodPosition,
    challenge.difficulty,
    obstacleMode,
    random,
  );
  let tick = 0;

  while (!state.isGameOver && tick < DAILY_CHALLENGE_MAX_TICKS) {
    const nextDirection =
      DAILY_CHALLENGE_DIRECTIONS[
        Math.floor(random() * DAILY_CHALLENGE_DIRECTIONS.length)
      ] ?? 'RIGHT';

    state = queueDirectionChange(state, nextDirection).nextState;
    state = advanceGame(state, getFoodPosition, {
      random,
      tickMs,
    });
    tick += 1;
  }

  return state.score;
}

export async function calculateDailyChallengeTargetScore(
  challenge: DailyChallenge,
  options: {
    playoutCount?: number;
    chunkSize?: number;
  } = {},
) {
  const playoutCount = options.playoutCount ?? DAILY_CHALLENGE_PLAYOUTS;
  const chunkSize = options.chunkSize ?? DAILY_CHALLENGE_CHUNK_SIZE;
  const scores: number[] = [];
  let nextPlayoutIndex = 0;

  return new Promise<number>((resolve) => {
    const runChunk = () => {
      const limit = Math.min(playoutCount, nextPlayoutIndex + chunkSize);

      while (nextPlayoutIndex < limit) {
        scores.push(
          simulateDailyChallengePlayout(
            challenge,
            challenge.seed + nextPlayoutIndex,
          ),
        );
        nextPlayoutIndex += 1;
      }

      if (nextPlayoutIndex < playoutCount) {
        setTimeout(runChunk, 0);
        return;
      }

      scores.sort((left, right) => left - right);
      resolve(scores[Math.floor(scores.length / 2)] ?? 0);
    };

    runChunk();
  });
}

export function syncHighScoreOnGameOver(
  state: GameState,
  storage: StorageLike | null = getStorage(),
): GameState {
  if (!state.isGameOver || state.score <= state.highScore) {
    return state;
  }

  storage?.setItem(HIGH_SCORE_STORAGE_KEY, String(state.score));

  return {
    ...state,
    highScore: state.score,
  };
}

// Server-safe initial state: food at a fixed position to avoid SSR/client mismatch
const SERVER_INITIAL_STATE: GameState = {
  snake: INITIAL_SNAKE,
  food: { x: 12, y: 12 },
  bonusFood: undefined,
  obstacles: [],
  direction: INITIAL_DIRECTION,
  queuedDirection: INITIAL_DIRECTION,
  score: 0,
  highScore: 0,
  previousHighScore: 0,
  isGameOver: false,
  gameStatus: 'idle',
  prop: null,
  activeProps: {},
  elapsedMs: 0,
  nextPropSpawnAt: null,
};

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>(SERVER_INITIAL_STATE);
  const [achievements, setAchievements] = useState<AchievementStore>({});
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('default');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [replays, setReplays] = useState<ReplayData[]>([]);
  const [latestReplay, setLatestReplay] = useState<ReplayData | null>(null);
  const [obstacleMode, setObstacleMode] = useState<ObstacleDifficulty | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [dailyChallengeLoading, setDailyChallengeLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<ReturnType<typeof getLevelById>>(undefined);
  const [levelProgress, setLevelProgress] = useState(readLevelProgress);
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false);
  const [isLevelMode, setIsLevelMode] = useState(false);
  const [achievementMeta, setAchievementMeta] = useState<AchievementMeta>(
    createInitialAchievementMeta(),
  );
  const achievementsRef = useRef(achievements);
  const achievementMetaRef = useRef(achievementMeta);
  const dailyChallengeRef = useRef<DailyChallenge | null>(dailyChallenge);
  const gameStartTimeRef = useRef<number>(Date.now());
  const previousIsGameOverRef = useRef(false);
  const seedRef = useRef(createReplaySeed());
  const randomRef = useRef(seededRandom(seedRef.current));
  const currentTickRef = useRef(0);
  const recordedInputsRef = useRef<ReplayInput[]>([]);
  const latestReplayRef = useRef<ReplayData | null>(null);

  useEffect(() => {
    dailyChallengeRef.current = dailyChallenge;
  }, [dailyChallenge]);

  const initializeGame = useCallback(
    (
      nextDifficulty: Difficulty,
      nextObstacleMode: ObstacleDifficulty | null,
      nextSeed: number = createReplaySeed(),
    ) => {
      seedRef.current = nextSeed;
      randomRef.current = seededRandom(nextSeed);
      currentTickRef.current = 0;
      recordedInputsRef.current = [];
      latestReplayRef.current = null;
      setLatestReplay(null);

      return createInitialGameState(
        getStorage(),
        createFoodGenerator(randomRef.current),
        nextDifficulty,
        nextObstacleMode,
        randomRef.current,
      );
    },
    [],
  );

  const restartForSettings = useCallback(
    (nextDifficulty: Difficulty, nextObstacleMode: ObstacleDifficulty | null) => {
      setGameState(initializeGame(nextDifficulty, nextObstacleMode));
      const nextMeta = createInitialAchievementMeta();
      achievementMetaRef.current = nextMeta;
      setAchievementMeta(nextMeta);
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
    },
    [initializeGame],
  );

  const loadDailyChallenge = useCallback(async (date: string) => {
    setDailyChallengeLoading(true);
    try {
      const storage = getStorage();
      const existing = readDailyChallengeStore(storage).challenges[date];
      const baseChallenge = existing ?? saveDailyChallenge(createDailyChallenge(date), storage);

      dailyChallengeRef.current = baseChallenge;
      setDailyChallenge(baseChallenge);

      if (baseChallenge.targetScore > 0) {
        return baseChallenge;
      }

      const targetScore = await calculateDailyChallengeTargetScore(baseChallenge);
      const nextChallenge = {
        ...baseChallenge,
        targetScore,
      };

      saveDailyChallenge(nextChallenge, storage);
      dailyChallengeRef.current = nextChallenge;
      setDailyChallenge(nextChallenge);

      return nextChallenge;
    } finally {
      setDailyChallengeLoading(false);
    }
  }, []);

  const startDailyChallenge = useCallback(
    async (date: string = getTodayDateString()) => {
      // If challenge isn't loaded yet, load it first
      if (!dailyChallengeRef.current || dailyChallengeRef.current.date !== date) {
        await loadDailyChallenge(date);
      }

      const nextChallenge = dailyChallengeRef.current;
      if (!nextChallenge) {
        return;
      }

      const nextObstacleMode = nextChallenge.obstacleMode
        ? nextChallenge.obstacleDifficulty
        : null;

      setDifficulty(nextChallenge.difficulty);
      setObstacleMode(nextObstacleMode);
      setIsDailyChallengeMode(true);
      setGameState(
        initializeGame(
          nextChallenge.difficulty,
          nextObstacleMode,
          nextChallenge.seed,
        ),
      );
      const nextMeta = createInitialAchievementMeta();
      achievementMetaRef.current = nextMeta;
      setAchievementMeta(nextMeta);
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
    },
    [initializeGame, loadDailyChallenge],
  );

  const startLevelMode = useCallback(
    (levelId: number) => {
      const level = getLevelById(levelId);
      if (!level) return;

      // Use levelId * 12345 as seed for determinism
      const seed = levelId * 12345;
      const random = seededRandom(seed);
      const primaryFood = randomFoodPosition(INITIAL_SNAKE, GRID_SIZE, level.obstaclePositions, random);
      const bonusFood =
        DIFFICULTY_SETTINGS.normal.foodCount > 1
          ? randomFoodPosition(INITIAL_SNAKE, GRID_SIZE, [primaryFood, ...level.obstaclePositions], random)
          : null;

      const initialState: GameState = {
        snake: INITIAL_SNAKE,
        direction: INITIAL_DIRECTION,
        food: primaryFood,
        bonusFood: bonusFood ?? undefined,
        score: 0,
        highScore: 0,
        gameStatus: 'playing',
        tick: 0,
        elapsedMs: null,
        obstacles: level.obstaclePositions,
        prop: null,
        nextPropSpawnAt: null,
        activeProps: [],
        speedLevel: 1,
        speedUpsRemaining: 0,
      };

      setCurrentLevel(level);
      setIsLevelMode(true);
      setIsDailyChallengeMode(false);
      setDifficulty('normal');
      setObstacleMode(null);
      setGameState(initialState);
      const nextMeta = createInitialAchievementMeta();
      achievementMetaRef.current = nextMeta;
      setAchievementMeta(nextMeta);
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
    },
    [],
  );

  const completeLevel = useCallback((levelId: number) => {
    const progress = readLevelProgress();
    if (!progress.completedLevels.includes(levelId)) {
      const next = { ...progress, completedLevels: [...progress.completedLevels, levelId] };
      const nextId = getNextLevelId(levelId);
      if (nextId && next.unlockedLevelId < nextId) {
        next.unlockedLevelId = nextId;
      }
      writeLevelProgress(next);
      setLevelProgress(next);
    }
  }, []);

  const updateDailyChallenge = useCallback((score: number) => {
    const currentChallenge = dailyChallengeRef.current;

    if (!currentChallenge) {
      return null;
    }

    const nextChallenge = updateStoredDailyChallengeResult(
      currentChallenge.date,
      score,
      getStorage(),
    );

    if (!nextChallenge) {
      return null;
    }

    dailyChallengeRef.current = nextChallenge;
    setDailyChallenge(nextChallenge);
    return nextChallenge;
  }, []);

  const applyAchievementUpdate = useCallback(
    (previousState: GameState, nextState: GameState) => {
      const result = updateAchievementState({
        previousState,
        nextState,
        achievements: achievementsRef.current,
        meta: achievementMetaRef.current,
        now: nextState.elapsedMs ?? Date.now(),
      });

      achievementMetaRef.current = result.meta;
      setAchievementMeta(result.meta);

      if (result.hasNewUnlock) {
        achievementsRef.current = result.achievements;
        setAchievements(result.achievements);
        writeAchievements(result.achievements);
        return result;
      }

      if (result.achievements !== achievementsRef.current) {
        achievementsRef.current = result.achievements;
        setAchievements(result.achievements);
      }

      return result;
    },
    [],
  );

  // Randomize food position after mount (client only) to avoid SSR mismatch.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGameState(initializeGame(difficulty, obstacleMode));
      const storedAchievements = readAchievements();
      achievementsRef.current = storedAchievements;
      setAchievements(storedAchievements);
      setSelectedSkin(readSelectedSkin(getStorage(), storedAchievements));
      setHistory(readHistory());
      setReplays(readReplays());
      const encodedReplay = new URLSearchParams(window.location.search).get('replay');
      const decodedReplay = encodedReplay ? decodeReplayData(encodedReplay) : null;
      latestReplayRef.current = decodedReplay;
      setLatestReplay(decodedReplay);
      achievementMetaRef.current = createInitialAchievementMeta();
      setAchievementMeta(createInitialAchievementMeta());
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
      void loadDailyChallenge(getTodayDateString()).catch(console.error);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeGame, loadDailyChallenge]);

  const resetGame = useCallback(() => {
    setGameState((currentState) => {
      if (currentState.highScore > currentState.previousHighScore) {
        playNewRecord();
      }

      return initializeGame(difficulty, obstacleMode);
    });
    const nextMeta = createInitialAchievementMeta();
    achievementMetaRef.current = nextMeta;
    setAchievementMeta(nextMeta);
    gameStartTimeRef.current = Date.now();
    setDurationSeconds(0);
  }, [difficulty, initializeGame, obstacleMode]);

  const updateDifficulty = useCallback(
    (nextDifficulty: Difficulty) => {
      setDifficulty(nextDifficulty);
      restartForSettings(nextDifficulty, obstacleMode);
    },
    [obstacleMode, restartForSettings],
  );

  const updateObstacleMode = useCallback(
    (nextObstacleMode: ObstacleDifficulty | null) => {
      setObstacleMode(nextObstacleMode);
      restartForSettings(difficulty, nextObstacleMode);
    },
    [difficulty, restartForSettings],
  );

  const turnSnake = useCallback((nextDirection: Direction) => {
    setGameState((currentState) => {
      const result = queueDirectionChange(currentState, nextDirection);

      if (result.shouldRecord) {
        recordedInputsRef.current = [
          ...recordedInputsRef.current,
          {
            tick: currentTickRef.current,
            direction: nextDirection,
          },
        ];
      }

      return result.nextState;
    });
  }, []);

  const setSkin = useCallback((skinId: SkinId) => {
    setSelectedSkin(selectSkin(skinId, achievementsRef.current));
  }, []);

  const tick = useEffectEvent((tickMs: number) => {
    setGameState((currentState) => {
      const nextState = syncHighScoreOnGameOver(
        advanceGame(
          currentState,
          createFoodGenerator(randomRef.current),
          {
            random: randomRef.current,
            tickMs,
          },
        ),
      );
      // Ensure gameStatus reflects game over
      const finalState =
        nextState.isGameOver && currentState.gameStatus !== 'gameover'
          ? { ...nextState, gameStatus: 'gameover' as const }
          : nextState;
      const achievementResult = applyAchievementUpdate(currentState, finalState);
      const feedback = getSnakeGameFeedback(
        currentState,
        finalState,
        achievementResult.hasNewUnlock,
      );

      if (feedback.playEat) {
        playEat();
      }

      if (feedback.vibrate) {
        vibrate();
      }

      if (feedback.playDie) {
        playDie();
      }

      if (feedback.playAchievement) {
        playAchievement();
      }

      currentTickRef.current += 1;
      return finalState;
    });
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // From gameover, Enter resets to idle
      if (event.key === 'Enter' && gameState.gameStatus === 'gameover') {
        resetGame();
        return;
      }

      // Direction controls also start the game from idle
      const key = event.key.toLowerCase();
      if (
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright' ||
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd'
      ) {
        turnSnake(
          key === 'arrowup' || key === 'w'
            ? 'UP'
            : key === 'arrowdown' || key === 's'
              ? 'DOWN'
              : key === 'arrowleft' || key === 'a'
                ? 'LEFT'
                : 'RIGHT',
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.gameStatus, resetGame, turnSnake]);

  useEffect(() => {
    if (!previousIsGameOverRef.current && gameState.isGameOver) {
      const duration = Math.floor(
        (Date.now() - gameStartTimeRef.current) / 1_000,
      );
      const nextReplay: ReplayData = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        savedAt: Date.now(),
        seed: seedRef.current,
        difficulty,
        skinId: selectedSkin,
        obstacleMode: obstacleMode !== null,
        obstacleDifficulty: obstacleMode ?? undefined,
        durationSeconds: duration,
        finalScore: gameState.score,
        finalAchievementIds: ACHIEVEMENTS
          .filter((achievement) => achievementsRef.current[achievement.id])
          .map((achievement) => achievement.id),
        inputs: [...recordedInputsRef.current],
      };

      latestReplayRef.current = nextReplay;
      setLatestReplay(nextReplay);
      setDurationSeconds(duration);
      // Transition to gameover status
      setGameState((current) =>
        current.isGameOver ? current : { ...current, gameStatus: 'gameover' },
      );
      // Write history entry
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        score: gameState.score,
        achievedAt: Date.now(),
        skinId: selectedSkin,
        achievementCount: Object.keys(achievements).length,
        durationSeconds: duration,
        difficulty,
        replayId: nextReplay.id,
      };
      writeHistory(entry);
      setHistory(readHistory());

      // Auto-submit score to leaderboards
      const score = gameState.score;
      if (score > 0) {
        if (!isDailyChallengeMode) {
          // Submit global score with 60s rate limit
          const LAST_GLOBAL_SUBMIT_KEY = 'snake_last_global_submit';
          const lastSubmit = localStorage.getItem(LAST_GLOBAL_SUBMIT_KEY);
          const now = Date.now();
          if (!lastSubmit || now - parseInt(lastSubmit, 10) > 60_000) {
            localStorage.setItem(LAST_GLOBAL_SUBMIT_KEY, String(now));
            void submitGlobalScore(score, selectedSkin);
          }
        } else {
          // Submit daily score (upsert — no rate limit needed)
          void submitDailyScore(getTodayDateString(), score);
        }
      }

      // Handle level mode completion
      if (isLevelMode && currentLevel) {
        if (score >= currentLevel.targetScore) {
          completeLevel(currentLevel.id);
        }
      }
    }

    previousIsGameOverRef.current = gameState.isGameOver;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isGameOver]);

  // Calculate effective tick interval based on active props
  const getEffectiveTickMs = useCallback(() => {
    let ms = DIFFICULTY_SETTINGS[difficulty].tickMs;
    const active = gameState.activeProps;
    const now = gameState.elapsedMs ?? 0;

    if (active.speed_up?.expiresAt && active.speed_up.expiresAt > now) {
      ms = Math.round(ms * 0.67);
    }
    if (active.speed_down?.expiresAt && active.speed_down.expiresAt > now) {
      ms = Math.round(ms * 1.5);
    }
    return ms;
  }, [difficulty, gameState.activeProps]);

  useEffect(() => {
    if (gameState.gameStatus !== 'running') {
      return;
    }

    const effectiveMs = getEffectiveTickMs();
    const timer = window.setInterval(() => {
      tick(effectiveMs);
    }, effectiveMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState.gameStatus, difficulty, gameState.activeProps, getEffectiveTickMs]);

  return {
    ...gameState,
    achievements,
    history,
    latestReplay,
    replays,
    durationSeconds,
    selectedSkin,
    difficulty,
    setDifficulty: updateDifficulty,
    obstacleMode,
    setObstacleMode: updateObstacleMode,
    resetGame,
    setSkin,
    turnSnake,
    dailyChallenge,
    dailyChallengeLoading,
    isDailyChallengeMode,
    isLevelMode,
    startDailyChallenge,
    startLevelMode,
    levelProgress,
    currentLevel,
    updateDailyChallenge,
  };
}
