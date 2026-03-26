import { isColliding, isObstacle, randomFoodPosition } from './gridHelpers';
import {
  DIRECTION_OFFSETS,
  GRID_SIZE,
  OPPOSITE_DIRECTION,
} from './types';
import type { Cell, Food, GameState, PropId } from './types';

type GetFoodPosition = (snake: GameState['snake']) => Food;

function resolveDirection(state: GameState) {
  return state.queuedDirection === OPPOSITE_DIRECTION[state.direction]
    ? state.direction
    : state.queuedDirection;
}

function isSameCell(a: Food, b: Food) {
  return a.x === b.x && a.y === b.y;
}

function getSafeFoodPosition(
  snake: GameState['snake'],
  getFoodPosition: GetFoodPosition,
  extraAvoid: Food[] = [],
  obstacles: Cell[] = [],
) {
  if (extraAvoid.length === 0 && obstacles.length === 0) {
    return getFoodPosition(snake);
  }

  return randomFoodPosition(snake, GRID_SIZE, [...extraAvoid, ...obstacles]);
}

function applyPropEffect(
  propId: PropId,
  state: GameState,
): Partial<GameState> {
  const now = Date.now();

  switch (propId) {
    case 'speed_up':
    case 'speed_down':
    case 'ghost':
    case 'double_score':
      return {
        activeProps: {
          ...state.activeProps,
          [propId]: { expiresAt: now + (propId === 'double_score' ? 10_000 : 5_000) },
        },
      };

    case 'shield':
      return {
        activeProps: {
          ...state.activeProps,
          shield: { expiresAt: Infinity },
        },
      };

    case 'shrink': {
      const shrinkBy = Math.min(3, state.snake.length - 1);
      const newSnake = state.snake.slice(0, -shrinkBy);
      return {
        snake: newSnake,
      };
    }

    default:
      return {};
  }
}

export function advanceGame(
  state: GameState,
  getFoodPosition: GetFoodPosition = randomFoodPosition,
): GameState {
  if (state.isGameOver || state.gameStatus !== 'running') {
    return state;
  }

  const direction = resolveDirection(state);
  const offset = DIRECTION_OFFSETS[direction];

  // Ghost mode: allow wrapping to opposite side
  const ghostActive =
    state.activeProps.ghost?.expiresAt &&
    state.activeProps.ghost.expiresAt > Date.now();

  let nextHead: { x: number; y: number };

  if (ghostActive) {
    // Wrap around edges
    const currentHead = state.snake[0];
    nextHead = {
      x: (currentHead.x + offset.x + GRID_SIZE) % GRID_SIZE,
      y: (currentHead.y + offset.y + GRID_SIZE) % GRID_SIZE,
    };
  } else {
    nextHead = {
      x: state.snake[0].x + offset.x,
      y: state.snake[0].y + offset.y,
    };
  }

  const atePrimaryFood = isSameCell(nextHead, state.food);
  const ateBonusFood = state.bonusFood
    ? isSameCell(nextHead, state.bonusFood)
    : false;
  const ateFood = atePrimaryFood || ateBonusFood;

  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);

  // Check collision
  const wouldCollide = isColliding(nextHead, bodyToCheck, GRID_SIZE);
  const hitsObstacle =
    state.obstacles.length > 0 && isObstacle(nextHead, state.obstacles);

  // Shield check
  const shieldActive =
    state.activeProps.shield?.expiresAt === Infinity;

  // Obstacle collision or wall/self collision
  if (hitsObstacle || (wouldCollide && !ghostActive)) {
    if (shieldActive) {
      // Consume shield instead of dying
      const { shield: _shield, ...restActiveProps } = state.activeProps;
      return {
        ...state,
        activeProps: restActiveProps,
        direction,
        queuedDirection: direction,
      };
    }
    return {
      ...state,
      isGameOver: true,
      direction,
      queuedDirection: direction,
    };
  }

  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  // Food regeneration
  const nextFood = atePrimaryFood
    ? getSafeFoodPosition(
        nextSnake,
        getFoodPosition,
        state.bonusFood ? [state.bonusFood] : [],
        state.obstacles,
      )
    : state.food;

  const nextBonusFood = state.bonusFood
    ? ateBonusFood
      ? getSafeFoodPosition(nextSnake, getFoodPosition, [nextFood], state.obstacles)
      : state.bonusFood
    : undefined;

  // Score: double if double_score active
  const doubleScoreActive =
    state.activeProps.double_score?.expiresAt &&
    state.activeProps.double_score.expiresAt > Date.now();
  const scoreGain = ateFood ? (doubleScoreActive ? 2 : 1) : 0;

  // Prop: check if snake ate it
  let nextProp = state.prop;
  let nextActiveProps = state.activeProps;

  if (state.prop && isSameCell(nextHead, state.prop)) {
    // Consume prop
    const effect = applyPropEffect(state.prop.id, state);
    nextProp = null;
    nextActiveProps = effect.activeProps ?? state.activeProps;
    // If shrink, apply snake change
    if ('snake' in effect && effect.snake) {
      // eslint-disable-next-line no-param-reassign
      state.snake = effect.snake;
    }
  }

  // Expire old props
  const now = Date.now();
  const expiredProps = Object.entries(nextActiveProps).reduce(
    (acc, [id, prop]) => {
      if (prop && prop.expiresAt !== Infinity && prop.expiresAt <= now) {
        return acc;
      }
      // eslint-disable-next-line no-param-reassign
      acc[id as PropId] = prop;
      return acc;
    },
    {} as Partial<Record<PropId, { expiresAt: number } | undefined>>,
  );

  return {
    ...state,
    snake: nextSnake,
    food: nextFood,
    bonusFood: nextBonusFood,
    prop: nextProp,
    activeProps: expiredProps,
    direction,
    queuedDirection: direction,
    score: state.score + scoreGain,
    isGameOver: false,
  };
}
