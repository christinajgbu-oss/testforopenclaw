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
import { randomFoodPosition } from './gridHelpers';
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
  AchievementMeta,
  AchievementStore,
  Difficulty,
  Direction,
  Food,
  GameState,
  SkinId,
} from './types';

const HIGH_SCORE_STORAGE_KEY = 'snake_highscore';
export const ACHIEVEMENT_STORAGE_KEY = 'snake_achievements';

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

  return {
    snake: INITIAL_SNAKE,
    food: primaryFood,
    bonusFood,
    direction: INITIAL_DIRECTION,
    queuedDirection: INITIAL_DIRECTION,
    score: 0,
    highScore,
    previousHighScore: highScore,
    isGameOver: false,
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
  direction: INITIAL_DIRECTION,
  queuedDirection: INITIAL_DIRECTION,
  score: 0,
  highScore: 0,
  previousHighScore: 0,
  isGameOver: false,
};

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>(SERVER_INITIAL_STATE);
  const [achievements, setAchievements] = useState<AchievementStore>({});
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('default');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [achievementMeta, setAchievementMeta] = useState<AchievementMeta>(
    createInitialAchievementMeta(),
  );
  const achievementsRef = useRef(achievements);
  const achievementMetaRef = useRef(achievementMeta);
  const gameStartTimeRef = useRef<number>(Date.now());
  const previousIsGameOverRef = useRef(false);

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
      setGameState(createInitialGameState(getStorage(), randomFoodPosition, difficulty));
      const storedAchievements = readAchievements();
      achievementsRef.current = storedAchievements;
      setAchievements(storedAchievements);
      setSelectedSkin(readSelectedSkin(getStorage(), storedAchievements));
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

      return createInitialGameState(getStorage(), randomFoodPosition, difficulty);
    });
    const nextMeta = createInitialAchievementMeta();
    achievementMetaRef.current = nextMeta;
    setAchievementMeta(nextMeta);
    gameStartTimeRef.current = Date.now();
    setDurationSeconds(0);
  }, [difficulty]);

  const turnSnake = useCallback((nextDirection: Direction) => {
    setGameState((currentState) => {
      if (
        currentState.isGameOver ||
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
      const achievementResult = applyAchievementUpdate(currentState, nextState);
      const feedback = getSnakeGameFeedback(
        currentState,
        nextState,
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
      const key = event.key.toLowerCase();

      if (key === 'arrowup' || key === 'w') {
        turnSnake('UP');
      }

      if (key === 'arrowdown' || key === 's') {
        turnSnake('DOWN');
      }

      if (key === 'arrowleft' || key === 'a') {
        turnSnake('LEFT');
      }

      if (key === 'arrowright' || key === 'd') {
        turnSnake('RIGHT');
      }

      if (event.key === 'Enter' && gameState.isGameOver) {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.isGameOver, resetGame, turnSnake]);

  useEffect(() => {
    if (!previousIsGameOverRef.current && gameState.isGameOver) {
      setDurationSeconds(
        Math.floor((Date.now() - gameStartTimeRef.current) / 1_000),
      );
    }

    previousIsGameOverRef.current = gameState.isGameOver;
  }, [gameState.isGameOver]);

  useEffect(() => {
    if (gameState.isGameOver) {
      return;
    }

    const timer = window.setInterval(() => {
      tick();
    }, DIFFICULTY_SETTINGS[difficulty].tickMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState.isGameOver, difficulty]);

  return {
    ...gameState,
    achievements,
    durationSeconds,
    selectedSkin,
    difficulty,
    setDifficulty,
    resetGame,
    setSkin,
    turnSnake,
  };
}
