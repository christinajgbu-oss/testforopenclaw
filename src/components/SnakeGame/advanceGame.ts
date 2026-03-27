import { isColliding, isObstacle, randomFoodPosition, randomPropPosition } from './gridHelpers';
import {
  DIRECTION_OFFSETS,
  GRID_SIZE,
  OPPOSITE_DIRECTION,
  PROPS,
} from './types';
import type { Cell, Food, GameState, PropId } from './types';

type GetFoodPosition = (
  snake: GameState['snake'],
  gridSize: number | undefined,
  blockedCells: Cell[],
) => Food;

type AdvanceGameOptions = {
  random?: () => number;
  tickMs?: number;
};

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
  return getFoodPosition(snake, undefined, [...extraAvoid, ...obstacles]);
}

function applyPropEffect(
  propId: PropId,
  state: GameState,
  now: number,
): Partial<GameState> {
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

function filterExpiredActiveProps(
  activeProps: GameState['activeProps'],
  now: number,
) {
  return Object.entries(activeProps).reduce(
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
}

function getPropSpawnDelay(random: () => number) {
  return 15_000 + random() * 5_000;
}

export function advanceGame(
  state: GameState,
  getFoodPosition: GetFoodPosition = (snake, gridSize, blockedCells) =>
    randomFoodPosition(snake, gridSize ?? GRID_SIZE, blockedCells ?? []),
  options: AdvanceGameOptions = {},
): GameState {
  if (state.isGameOver || state.gameStatus !== 'running') {
    return state;
  }

  const random = options.random ?? Math.random;
  const isDeterministicTick = typeof state.elapsedMs === 'number';
  const frameTime = state.elapsedMs != null
    ? state.elapsedMs + (options.tickMs ?? 0)
    : Date.now();
  const direction = resolveDirection(state);
  const offset = DIRECTION_OFFSETS[direction];
  const activePropsAtFrame = filterExpiredActiveProps(state.activeProps, frameTime);
  const propExpired =
    Boolean(state.prop) &&
    isDeterministicTick &&
    typeof state.prop?.expiresAt === 'number' &&
    state.prop.expiresAt <= frameTime;
  const currentProp = propExpired ? null : state.prop;
  const nextScheduledPropAt =
    propExpired && isDeterministicTick
      ? frameTime + getPropSpawnDelay(random)
      : state.nextPropSpawnAt ?? null;

  // Ghost mode: allow wrapping to opposite side
  const ghostActive =
    activePropsAtFrame.ghost?.expiresAt &&
    activePropsAtFrame.ghost.expiresAt > frameTime;

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
    activePropsAtFrame.shield?.expiresAt === Infinity;

  // Obstacle collision or wall/self collision
  if (hitsObstacle || (wouldCollide && !ghostActive)) {
    if (shieldActive) {
      // Consume shield instead of dying
      const { shield: _shield, ...restActiveProps } = activePropsAtFrame;
      return {
        ...state,
        prop: currentProp,
        activeProps: restActiveProps,
        direction,
        queuedDirection: direction,
        elapsedMs: isDeterministicTick ? frameTime : state.elapsedMs,
        nextPropSpawnAt: nextScheduledPropAt,
      };
    }
    return {
      ...state,
      prop: currentProp,
      activeProps: activePropsAtFrame,
      isGameOver: true,
      direction,
      queuedDirection: direction,
      elapsedMs: isDeterministicTick ? frameTime : state.elapsedMs,
      nextPropSpawnAt: nextScheduledPropAt,
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
    activePropsAtFrame.double_score?.expiresAt &&
    activePropsAtFrame.double_score.expiresAt > frameTime;
  const scoreGain = ateFood ? (doubleScoreActive ? 2 : 1) : 0;

  // Prop: check if snake ate it
  let nextProp = currentProp;
  let nextActiveProps = activePropsAtFrame;
  let nextPropSpawnAt = nextScheduledPropAt;

  if (currentProp && isSameCell(nextHead, currentProp)) {
    // Consume prop
    const effect = applyPropEffect(currentProp.id, state, frameTime);
    nextProp = null;
    nextActiveProps = effect.activeProps ?? activePropsAtFrame;
    nextPropSpawnAt = isDeterministicTick
      ? frameTime + getPropSpawnDelay(random)
      : nextPropSpawnAt;
    // If shrink, apply snake change
    if ('snake' in effect && effect.snake) {
      // eslint-disable-next-line no-param-reassign
      state.snake = effect.snake;
    }
  }

  const expiredProps = filterExpiredActiveProps(nextActiveProps, frameTime);
  let spawnedProp = nextProp;
  let spawnedPropAt = nextPropSpawnAt;

  if (
    isDeterministicTick &&
    spawnedProp === null &&
    typeof spawnedPropAt === 'number' &&
    frameTime >= spawnedPropAt
  ) {
    const position = randomPropPosition(
      nextSnake,
      nextFood,
      nextBonusFood,
      null,
      state.obstacles,
      random,
    );

    if (position) {
      const propType = PROPS[Math.floor(random() * PROPS.length)];
      spawnedProp = {
        id: propType.id,
        x: position.x,
        y: position.y,
        expiresAt: frameTime + 8_000,
      };
      spawnedPropAt = null;
    } else {
      spawnedPropAt = frameTime + getPropSpawnDelay(random);
    }
  }

  return {
    ...state,
    snake: nextSnake,
    food: nextFood,
    bonusFood: nextBonusFood,
    prop: spawnedProp,
    activeProps: expiredProps,
    direction,
    queuedDirection: direction,
    score: state.score + scoreGain,
    isGameOver: false,
    elapsedMs: isDeterministicTick ? frameTime : state.elapsedMs,
    nextPropSpawnAt: isDeterministicTick ? spawnedPropAt : state.nextPropSpawnAt,
  };
}
