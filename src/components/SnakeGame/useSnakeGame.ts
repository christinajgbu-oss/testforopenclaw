'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { advanceGame } from './advanceGame';
import { randomFoodPosition } from './gridHelpers';
import {
  ACHIEVEMENTS,
  INITIAL_DIRECTION,
  INITIAL_SNAKE,
  OPPOSITE_DIRECTION,
  TICK_MS,
} from './types';
import type {
  AchievementMeta,
  AchievementStore,
  Direction,
  GameState,
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

export function createInitialGameState(
  storage: StorageLike | null = getStorage(),
  getFoodPosition: typeof randomFoodPosition = randomFoodPosition,
): GameState {
  const highScore = readHighScore(storage);

  return {
    snake: INITIAL_SNAKE,
    food: getFoodPosition(INITIAL_SNAKE),
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
  const [achievementMeta, setAchievementMeta] = useState<AchievementMeta>(
    createInitialAchievementMeta(),
  );
  const achievementsRef = useRef(achievements);
  const achievementMetaRef = useRef(achievementMeta);

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
        return;
      }

      if (result.achievements !== achievementsRef.current) {
        achievementsRef.current = result.achievements;
        setAchievements(result.achievements);
      }
    },
    [],
  );

  // Randomize food position after mount (client only) to avoid SSR mismatch.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGameState(createInitialGameState());
      const storedAchievements = readAchievements();
      achievementsRef.current = storedAchievements;
      setAchievements(storedAchievements);
      achievementMetaRef.current = createInitialAchievementMeta();
      setAchievementMeta(createInitialAchievementMeta());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
    const nextMeta = createInitialAchievementMeta();
    achievementMetaRef.current = nextMeta;
    setAchievementMeta(nextMeta);
  }, []);

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

  const tick = useEffectEvent(() => {
    setGameState((currentState) => {
      const nextState = syncHighScoreOnGameOver(advanceGame(currentState));
      applyAchievementUpdate(currentState, nextState);
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
    if (gameState.isGameOver) {
      return;
    }

    const timer = window.setInterval(() => {
      tick();
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [gameState.isGameOver]);

  return {
    ...gameState,
    achievements,
    resetGame,
    turnSnake,
  };
}
