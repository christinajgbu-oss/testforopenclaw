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
import { generateObstacles, randomFoodPosition, randomPropPosition } from './gridHelpers';
import {
  ACHIEVEMENTS,
  DIFFICULTY_SETTINGS,
  GRID_SIZE,
  INITIAL_DIRECTION,
  INITIAL_SNAKE,
  OPPOSITE_DIRECTION,
  PROPS,
  SKINS,
  SKIN_STORAGE_KEY,
  isSkinUnlocked,
} from './types';
import type {
  AchievementMeta,
  AchievementStore,
  Difficulty,
  Direction,
  Food,
  GameState,
  HistoryEntry,
  ObstacleDifficulty,
  PropId,
  PropType,
  SkinId,
} from './types';

const HIGH_SCORE_STORAGE_KEY = 'snake_highscore';
export const ACHIEVEMENT_STORAGE_KEY = 'snake_achievements';
export const HISTORY_STORAGE_KEY = 'snake_history';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

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

export function createInitialGameState(
  storage: StorageLike | null = getStorage(),
  getFoodPosition: typeof randomFoodPosition = randomFoodPosition,
  difficulty: Difficulty = 'normal',
  obstacleMode: ObstacleDifficulty | null = null,
): GameState {
  const highScore = readHighScore(storage);
  const primaryFood = getFoodPosition(INITIAL_SNAKE);

  // For easy mode, generate a second food that avoids the primary food and snake
  const bonusFood =
    difficulty === 'easy'
      ? (() => {
          const avoidSet = new Set([
            ...INITIAL_SNAKE.map((s) => `${s.x}-${s.y}`),
            `${primaryFood.x}-${primaryFood.y}`,
          ]);
          const options: Food[] = [];
          for (let y = 0; y < GRID_SIZE; y += 1) {
            for (let x = 0; x < GRID_SIZE; x += 1) {
              const key = `${x}-${y}`;
              if (!avoidSet.has(key)) {
                options.push({ x, y });
              }
            }
          }
          return (
            options[Math.floor(Math.random() * options.length)] ?? { x: 0, y: 0 }
          );
        })()
      : undefined;

  // Generate obstacles if obstacle mode is set
  const obstacles =
    obstacleMode !== null
      ? generateObstacles(INITIAL_SNAKE, primaryFood, bonusFood, obstacleMode)
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
  };
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
};

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>(SERVER_INITIAL_STATE);
  const [achievements, setAchievements] = useState<AchievementStore>({});
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('default');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [obstacleMode, setObstacleMode] = useState<ObstacleDifficulty | null>(null);
  const [achievementMeta, setAchievementMeta] = useState<AchievementMeta>(
    createInitialAchievementMeta(),
  );
  const achievementsRef = useRef(achievements);
  const achievementMetaRef = useRef(achievementMeta);
  const gameStartTimeRef = useRef<number>(Date.now());
  const previousIsGameOverRef = useRef(false);
  const propSpawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPropsRef = useRef(gameState.activeProps);

  const restartForSettings = useCallback(
    (nextDifficulty: Difficulty, nextObstacleMode: ObstacleDifficulty | null) => {
      setGameState(
        createInitialGameState(
          getStorage(),
          randomFoodPosition,
          nextDifficulty,
          nextObstacleMode,
        ),
      );
      const nextMeta = createInitialAchievementMeta();
      achievementMetaRef.current = nextMeta;
      setAchievementMeta(nextMeta);
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
    },
    [],
  );

  const applyAchievementUpdate = useCallback(
    (previousState: GameState, nextState: GameState) => {
      const result = updateAchievementState({
        previousState,
        nextState,
        achievements: achievementsRef.current,
        meta: achievementMetaRef.current,
        now: Date.now(),
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
      setGameState(createInitialGameState(getStorage(), randomFoodPosition, difficulty, obstacleMode));
      const storedAchievements = readAchievements();
      achievementsRef.current = storedAchievements;
      setAchievements(storedAchievements);
      setSelectedSkin(readSelectedSkin(getStorage(), storedAchievements));
      setHistory(readHistory());
      achievementMetaRef.current = createInitialAchievementMeta();
      setAchievementMeta(createInitialAchievementMeta());
      gameStartTimeRef.current = Date.now();
      setDurationSeconds(0);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetGame = useCallback(() => {
    setGameState((currentState) => {
      if (currentState.highScore > currentState.previousHighScore) {
        playNewRecord();
      }

      return createInitialGameState(getStorage(), randomFoodPosition, difficulty, obstacleMode);
    });
    const nextMeta = createInitialAchievementMeta();
    achievementMetaRef.current = nextMeta;
    setAchievementMeta(nextMeta);
    gameStartTimeRef.current = Date.now();
    setDurationSeconds(0);
  }, [difficulty, obstacleMode]);

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
      // Start game from idle
      if (currentState.gameStatus === 'idle') {
        return {
          ...currentState,
          gameStatus: 'running',
          queuedDirection: nextDirection,
        };
      }

      if (
        currentState.isGameOver ||
        currentState.gameStatus === 'gameover' ||
        nextDirection === OPPOSITE_DIRECTION[currentState.direction]
      ) {
        return currentState;
      }

      return {
        ...currentState,
        queuedDirection: nextDirection,
      };
    });
  }, []);

  const setSkin = useCallback((skinId: SkinId) => {
    setSelectedSkin(selectSkin(skinId, achievementsRef.current));
  }, []);

  const tick = useEffectEvent(() => {
    setGameState((currentState) => {
      const nextState = syncHighScoreOnGameOver(advanceGame(currentState));
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

      return nextState;
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
      };
      writeHistory(entry);
      setHistory(readHistory());
    }

    previousIsGameOverRef.current = gameState.isGameOver;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isGameOver]);

  // Keep currentPropsRef in sync
  useEffect(() => {
    currentPropsRef.current = gameState.activeProps;
  }, [gameState.activeProps]);

  // Schedule next prop spawn
  const schedulePropSpawn = useCallback((delayMs?: number) => {
    if (propSpawnTimeoutRef.current) {
      clearTimeout(propSpawnTimeoutRef.current);
    }
    const delay = delayMs ?? 15_000 + Math.random() * 5_000;
    propSpawnTimeoutRef.current = setTimeout(() => {
      setGameState((current) => {
        if (current.gameStatus !== 'running' || current.prop !== null) {
          return current;
        }
        const pos = randomPropPosition(
          current.snake,
          current.food,
          current.bonusFood,
          null,
          current.obstacles,
        );
        if (!pos) return current;
        const propType: PropType =
          PROPS[Math.floor(Math.random() * PROPS.length)];
        return {
          ...current,
          prop: {
            id: propType.id,
            x: pos.x,
            y: pos.y,
            expiresAt: Date.now() + 8_000,
          },
        };
      });
    }, delay);
  }, []);

  // Start prop spawn scheduling when game starts running
  useEffect(() => {
    if (gameState.gameStatus === 'running') {
      // If no prop currently, schedule one
      schedulePropSpawn();
    } else {
      if (propSpawnTimeoutRef.current) {
        clearTimeout(propSpawnTimeoutRef.current);
        propSpawnTimeoutRef.current = null;
      }
    }
    return () => {
      if (propSpawnTimeoutRef.current) {
        clearTimeout(propSpawnTimeoutRef.current);
        propSpawnTimeoutRef.current = null;
      }
    };
  }, [gameState.gameStatus, schedulePropSpawn]);

  // Reschedule when prop is consumed (set to null) - spawn next after 15-20s
  useEffect(() => {
    if (gameState.prop === null && gameState.gameStatus === 'running') {
      // Schedule next spawn
      schedulePropSpawn();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.prop]);

  // Calculate effective tick interval based on active props
  const getEffectiveTickMs = useCallback(() => {
    let ms = DIFFICULTY_SETTINGS[difficulty].tickMs;
    const active = gameState.activeProps;
    const now = Date.now();

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
      tick();
    }, effectiveMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState.gameStatus, difficulty, gameState.activeProps, getEffectiveTickMs]);

  return {
    ...gameState,
    achievements,
    history,
    durationSeconds,
    selectedSkin,
    difficulty,
    setDifficulty: updateDifficulty,
    obstacleMode,
    setObstacleMode: updateObstacleMode,
    resetGame,
    setSkin,
    turnSnake,
  };
}
