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

function isSameCell(a: Food, b: Food) {
  return a.x === b.x && a.y === b.y;
}

// Wrapper that handles multiple foods by avoiding extra positions
function makeFoodGetter(
  extraAvoid: Food[],
): (snake: GameState['snake']) => Food {
  return (snake) => {
    const avoidSet = new Set([
      ...snake.map((s) => `${s.x}-${s.y}`),
      ...extraAvoid.map((f) => `${f.x}-${f.y}`),
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
    return options[Math.floor(Math.random() * options.length)] ?? { x: 0, y: 0 };
  };
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

  const atePrimaryFood = isSameCell(nextHead, state.food);
  const ateBonusFood = state.bonusFood
    ? isSameCell(nextHead, state.bonusFood)
    : false;
  const ateFood = atePrimaryFood || ateBonusFood;

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

  // Regenerate food that was eaten
  const nextFood = atePrimaryFood
    ? (state.bonusFood
        ? makeFoodGetter([state.bonusFood])(nextSnake)
        : getFoodPosition(nextSnake))
    : state.food;

  const nextBonusFood = state.bonusFood
    ? ateBonusFood
      ? makeFoodGetter([nextFood])(nextSnake)
      : state.bonusFood
    : undefined;

  return {
    ...state,
    snake: nextSnake,
    food: nextFood,
    bonusFood: nextBonusFood,
    direction,
    queuedDirection: direction,
    score: ateFood ? state.score + 1 : state.score,
    isGameOver: false,
  };
}
