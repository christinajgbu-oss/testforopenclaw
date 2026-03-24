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

// Server-safe initial state: food at a fixed position to avoid SSR/client mismatch
const SERVER_INITIAL_STATE: GameState = {
  snake: INITIAL_SNAKE,
  food: { x: 12, y: 12 },
  direction: INITIAL_DIRECTION,
  queuedDirection: INITIAL_DIRECTION,
  score: 0,
  isGameOver: false,
};

function createInitialGameState(): GameState {
  return {
    snake: INITIAL_SNAKE,
    food: randomFoodPosition(INITIAL_SNAKE),
    direction: INITIAL_DIRECTION,
    queuedDirection: INITIAL_DIRECTION,
    score: 0,
    isGameOver: false,
  };
}

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>(SERVER_INITIAL_STATE);

  // Randomize food position after mount (client only) to avoid SSR mismatch
  useEffect(() => {
    setGameState(createInitialGameState());
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
    setGameState((currentState) => advanceGame(currentState));
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
