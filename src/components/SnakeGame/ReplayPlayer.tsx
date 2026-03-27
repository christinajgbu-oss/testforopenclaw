'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { advanceGame } from './advanceGame';
import { randomFoodPosition } from './gridHelpers';
import {
  ACHIEVEMENTS,
  DIFFICULTY_SETTINGS,
  GRID_SIZE,
  PROPS,
  SKINS,
} from './types';
import type { Cell, Food, GameState, ReplayData } from './types';
import {
  createInitialGameState,
  decodeReplayData,
  encodeReplayData,
  queueDirectionChange,
  seededRandom,
} from './useSnakeGame';

const PLAYBACK_SPEEDS = [1, 2, 4] as const;
const MAX_REPLAY_TICKS = 4_096;

type GetFoodPosition = (
  snake: GameState['snake'],
  gridSize: number | undefined,
  blockedCells?: Cell[],
) => Food;

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

function createReplayFoodGenerator(random: () => number): GetFoodPosition {
  return (snake, gridSize, blockedCells = []) =>
    randomFoodPosition(snake, gridSize, blockedCells, random);
}

export function buildReplayFrames(replayData: ReplayData): GameState[] {
  const random = seededRandom(replayData.seed);
  const getFoodPosition = createReplayFoodGenerator(random);
  const obstacleMode = replayData.obstacleMode
    ? (replayData.obstacleDifficulty ?? 'normal')
    : null;
  let currentState = createInitialGameState(
    null,
    getFoodPosition,
    replayData.difficulty,
    obstacleMode,
    random,
  );
  const frames = [currentState];
  const inputsByTick = replayData.inputs.reduce<Map<number, ReplayData['inputs']>>(
    (map, input) => {
      const existing = map.get(input.tick) ?? [];
      map.set(input.tick, [...existing, input]);
      return map;
    },
    new Map(),
  );
  const tickMs = DIFFICULTY_SETTINGS[replayData.difficulty].tickMs;
  let tick = 0;

  while (!currentState.isGameOver && tick < MAX_REPLAY_TICKS) {
    const tickInputs = inputsByTick.get(tick) ?? [];

    tickInputs.forEach((input) => {
      currentState = queueDirectionChange(
        currentState,
        input.direction,
      ).nextState;
    });

    if (currentState.gameStatus !== 'running') {
      break;
    }

    currentState = advanceGame(
      currentState,
      getFoodPosition,
      {
        random,
        tickMs,
      },
    );
    frames.push(currentState);
    tick += 1;
  }

  return frames;
}

export { encodeReplayData, decodeReplayData } from './useSnakeGame';

export function ReplayPlayer({ replayData }: { replayData: ReplayData }) {
  const frames = useMemo(() => buildReplayFrames(replayData), [replayData]);
  const totalTicks = Math.max(0, frames.length - 1);
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);
  const activeSkin = SKINS.find((skin) => skin.id === replayData.skinId) ?? SKINS[0];
  const currentFrame = frames[Math.min(currentTick, totalTicks)] ?? frames[0];
  const replayFinished =
    currentTick >= totalTicks && Boolean(frames.at(-1)?.isGameOver);
  const finalAchievements = ACHIEVEMENTS.filter((achievement) =>
    replayData.finalAchievementIds.includes(achievement.id),
  );

  useEffect(() => {
    setCurrentTick(0);
    setIsPlaying(true);
    setSpeed(1);
  }, [replayData]);

  useEffect(() => {
    if (!isPlaying || currentTick >= totalTicks) {
      if (currentTick >= totalTicks) {
        setIsPlaying(false);
      }
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentTick((tick) => {
        if (tick >= totalTicks) {
          return tick;
        }

        return tick + 1;
      });
    }, Math.max(1, Math.round(DIFFICULTY_SETTINGS[replayData.difficulty].tickMs / speed)));

    return () => {
      window.clearInterval(interval);
    };
  }, [currentTick, isPlaying, replayData.difficulty, speed, totalTicks]);

  const board = useMemo(() => {
    if (!currentFrame) {
      return null;
    }

    const snakeCells = new Set(
      currentFrame.snake.map((segment) => `${segment.x}-${segment.y}`),
    );
    const obstacleSet = new Set(
      currentFrame.obstacles.map((obstacle) => `${obstacle.x}-${obstacle.y}`),
    );

    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);
      const key = `${x}-${y}`;
      const isHead = isSameCell(currentFrame.snake[0], { x, y });
      const isFood = isSameCell(currentFrame.food, { x, y });
      const isBonusFood = currentFrame.bonusFood
        ? isSameCell(currentFrame.bonusFood, { x, y })
        : false;
      const isObstacle = obstacleSet.has(key);
      const isSnake = snakeCells.has(key);
      const isProp = currentFrame.prop ? isSameCell(currentFrame.prop, { x, y }) : false;
      const propData = isProp
        ? PROPS.find((prop) => prop.id === currentFrame.prop?.id)
        : null;

      return (
        <div
          key={key}
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 10,
            background: isFood || isBonusFood
              ? 'radial-gradient(circle at 30% 30%, #fde68a, var(--food-color))'
              : isHead
                ? 'linear-gradient(135deg, color-mix(in srgb, var(--snake-head) 30%, white), var(--snake-head))'
                : isSnake
                  ? 'linear-gradient(135deg, color-mix(in srgb, var(--snake-body) 45%, white), var(--snake-body))'
                  : isObstacle
                    ? 'linear-gradient(135deg, #4a4a4a, #2a2a2a)'
                    : 'rgba(255,255,255,0.08)',
            boxShadow: isFood || isBonusFood
              ? '0 0 20px color-mix(in srgb, var(--food-color) 45%, transparent)'
              : isProp
                ? '0 0 12px rgba(255,255,255,0.4)'
                : isObstacle
                  ? 'inset 0 0 6px rgba(0,0,0,0.6)'
                  : 'none',
            transform: isHead ? 'scale(1.03)' : 'scale(1)',
            transition: 'background 0.12s ease-out, transform 0.12s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isProp && propData ? (
            <span style={{ fontSize: 16, lineHeight: 1 }}>{propData.icon}</span>
          ) : null}
        </div>
      );
    });
  }, [currentFrame]);

  const handleExit = () => {
    const currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.has('replay')) {
      currentUrl.searchParams.delete('replay');
      const nextUrl = `${currentUrl.pathname}${currentUrl.searchParams.toString() ? `?${currentUrl.searchParams.toString()}` : ''}${currentUrl.hash}`;
      window.history.replaceState({}, '', nextUrl);
      window.dispatchEvent(new CustomEvent('snake-replay-url-change'));
    }

    window.dispatchEvent(new CustomEvent('snake-replay-exit'));
  };

  if (!currentFrame) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes replayPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.72; transform: scale(0.9); }
        }
      `}</style>
      <section
        style={{
          '--snake-head': activeSkin.headColor,
          '--snake-body': activeSkin.bodyColor,
          '--food-color': activeSkin.foodColor,
          '--board-bg': activeSkin.bgColor,
          width: '100%',
          maxWidth: 'min(920px, calc(100vw - 20px))',
          margin: '0 auto',
          display: 'grid',
          gap: 20,
          padding: 'clamp(16px, 4vw, 24px)',
          borderRadius: 28,
          background: 'rgba(15, 23, 42, 0.82)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
          color: '#e5f7eb',
        } as CSSProperties}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#86efac', fontSize: 13, letterSpacing: '0.08em' }}>
              N1 REPLAY
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1, color: '#f8fafc' }}>
              回放模式
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
              按 tick 精确回放，支持暂停、倍速和拖动进度。
            </p>
          </div>
          <button
            type="button"
            onClick={handleExit}
            style={{
              appearance: 'none',
              border: '1px solid rgba(148, 163, 184, 0.26)',
              borderRadius: 16,
              padding: '10px 16px',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            退出
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          <StatCard label="当前得分" value={currentFrame.score} />
          <StatCard label="最终得分" value={replayData.finalScore} />
          <StatCard label="当前 tick" value={`${currentTick} / ${totalTicks}`} />
          <StatCard
            label="当前速度"
            value={`${speed}x`}
          />
        </div>

        <div
          style={{
            width: 'min(100%, calc(100vw - 48px))',
            justifySelf: 'center',
            aspectRatio: '1 / 1',
            padding: 'clamp(10px, 2.8vw, 14px)',
            borderRadius: 28,
            overflow: 'hidden',
            background: 'var(--board-bg)',
            border: '1px solid rgba(71, 85, 105, 0.65)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gap: 'clamp(3px, 1vw, 6px)',
              width: '100%',
              height: '100%',
            }}
          >
            {board}
          </div>
          {replayFinished ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                padding: 24,
                background: 'rgba(0, 0, 0, 0.62)',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 800 }}>
                  回放结束
                </div>
                <div style={{ color: '#86efac', fontSize: 18, fontWeight: 700 }}>
                  最终得分 {replayData.finalScore}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {finalAchievements.length > 0 ? finalAchievements.map((achievement) => (
                    <span
                      key={achievement.id}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: 'rgba(34, 197, 94, 0.18)',
                        border: '1px solid rgba(134, 239, 172, 0.28)',
                        color: '#dcfce7',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {achievement.icon} {achievement.name}
                    </span>
                  )) : (
                    <span style={{ color: '#cbd5e1', fontSize: 14 }}>无成就解锁</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              style={controlButtonStyle}
            >
              {isPlaying ? '暂停' : '播放'}
            </button>
            {PLAYBACK_SPEEDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSpeed(option)}
                style={{
                  ...controlButtonStyle,
                  background: option === speed
                    ? 'linear-gradient(135deg, #86efac, #22c55e)'
                    : controlButtonStyle.background,
                  color: option === speed ? '#052e16' : '#f8fafc',
                }}
              >
                {option}x
              </button>
            ))}
          </div>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13 }}>进度</span>
            <input
              type="range"
              min={0}
              max={totalTicks}
              value={currentTick}
              onChange={(event) => {
                setCurrentTick(Number(event.target.value));
              }}
            />
          </label>
        </div>

        {Object.keys(currentFrame.activeProps).length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(currentFrame.activeProps).map(([id, active]) => {
              if (!active) {
                return null;
              }

              const propDefinition = PROPS.find((prop) => prop.id === id);
              const remainingSeconds =
                active.expiresAt === Infinity
                  ? null
                  : Math.max(
                      0,
                      Math.ceil(
                        (active.expiresAt - (currentFrame.elapsedMs ?? 0)) / 1_000,
                      ),
                    );

              return propDefinition ? (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontWeight: 600,
                    animation: 'replayPulse 1s infinite',
                  }}
                >
                  <span>{propDefinition.icon}</span>
                  <span>{propDefinition.name}</span>
                  {remainingSeconds !== null ? (
                    <span style={{ color: '#94a3b8' }}>{remainingSeconds}s</span>
                  ) : null}
                </div>
              ) : null;
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: 'rgba(30, 41, 59, 0.72)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const controlButtonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  borderRadius: 16,
  padding: '10px 16px',
  background: 'rgba(30, 41, 59, 0.9)',
  color: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 700,
};
