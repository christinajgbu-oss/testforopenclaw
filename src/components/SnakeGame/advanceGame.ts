import { isColliding, randomFoodPosition } from './gridHelpers';
import {
  DIRECTION_OFFSETS,
  GRID_SIZE,
  OPPOSITE_DIRECTION,
} from './types';
import type { Food, GameState } from './types';

type GetFoodPosition = (snake: GameState['snake']) => Food;

function resolveDirection(state: GameState) {
  return state.queuedDirection === OPPOSITE_DIRECTION[state.direction]
    ? state.direction
    : state.queuedDirection;
}

export function advanceGame(
  state: GameState,
  getFoodPosition: GetFoodPosition = randomFoodPosition,
): GameState {
  if (state.isGameOver) {
    return state;
  }

  const direction = resolveDirection(state);
  const offset = DIRECTION_OFFSETS[direction];
  const nextHead = {
    x: state.snake[0].x + offset.x,
    y: state.snake[0].y + offset.y,
  };
  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);

  if (isColliding(nextHead, bodyToCheck, GRID_SIZE)) {
    return {
      ...state,
      isGameOver: true,
    };
  }

  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  return {
    ...state,
    snake: nextSnake,
    food: ateFood ? getFoodPosition(nextSnake) : state.food,
    direction,
    queuedDirection: direction,
    score: ateFood ? state.score + 1 : state.score,
    isGameOver: false,
  };
}
