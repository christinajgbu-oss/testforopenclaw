'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { advanceGame } from './advanceGame';
import { randomFoodPosition } from './gridHelpers';
import {
  INITIAL_DIRECTION,
  INITIAL_SNAKE,
  OPPOSITE_DIRECTION,
  TICK_MS,
} from './types';
import type { Direction, GameState } from './types';

const HIGH_SCORE_STORAGE_KEY = 'snake_highscore';

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

  // Randomize food position after mount (client only) to avoid SSR mismatch.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGameState(createInitialGameState());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
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
    setGameState((currentState) =>
      syncHighScoreOnGameOver(advanceGame(currentState)),
    );
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
    resetGame,
    turnSnake,
  };
}
