'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';

type Cell = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 16;
const INITIAL_SNAKE: Cell[] = [
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
];
const INITIAL_DIRECTION: Direction = 'RIGHT';
const TICK_MS = 140;
const DIRECTION_OFFSET: Record<Direction, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

function spawnFood(snake: Cell[]) {
  const occupied = new Set(snake.map((segment) => `${segment.x}-${segment.y}`));
  const options: Cell[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x}-${y}`)) {
        options.push({ x, y });
      }
    }
  }

  return options[Math.floor(Math.random() * options.length)] ?? { x: 0, y: 0 };
}

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export default function Home() {
  const [snake, setSnake] = useState<Cell[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Cell>(() => spawnFood(INITIAL_SNAKE));
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setFood(spawnFood(INITIAL_SNAKE));
    setDirection(INITIAL_DIRECTION);
    setQueuedDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsGameOver(false);
  }, []);

  const turnSnake = useCallback((nextDirection: Direction) => {
    if (isGameOver || nextDirection === OPPOSITE_DIRECTION[direction]) {
      return;
    }

    setQueuedDirection(nextDirection);
  }, [direction, isGameOver]);

  const tick = useEffectEvent(() => {
    if (isGameOver) {
      return;
    }

    setSnake((currentSnake) => {
      const activeDirection =
        queuedDirection === OPPOSITE_DIRECTION[direction] ? direction : queuedDirection;
      const offset = DIRECTION_OFFSET[activeDirection];
      const nextHead = {
        x: currentSnake[0].x + offset.x,
        y: currentSnake[0].y + offset.y,
      };

      const hitsWall =
        nextHead.x < 0 ||
        nextHead.x >= GRID_SIZE ||
        nextHead.y < 0 ||
        nextHead.y >= GRID_SIZE;
      const nextBody = [nextHead, ...currentSnake];
      const ateFood = isSameCell(nextHead, food);
      const trimmedSnake = ateFood ? nextBody : nextBody.slice(0, -1);
      const hitsSelf = trimmedSnake
        .slice(1)
        .some((segment) => isSameCell(segment, nextHead));

      if (hitsWall || hitsSelf) {
        setIsGameOver(true);
        return currentSnake;
      }

      setDirection(activeDirection);

      if (ateFood) {
        setScore((currentScore) => currentScore + 1);
        setFood(spawnFood(trimmedSnake));
      }

      return trimmedSnake;
    });
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        turnSnake('UP');
      }

      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        turnSnake('DOWN');
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        turnSnake('LEFT');
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        turnSnake('RIGHT');
      }

      if (event.key === 'Enter' && isGameOver) {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameOver, resetGame, turnSnake]);

  useEffect(() => {
    if (isGameOver) {
      return;
    }

    const timer = window.setInterval(() => {
      tick();
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isGameOver]);

  const board = useMemo(() => {
    const snakeCells = new Set(snake.map((segment) => `${segment.x}-${segment.y}`));

    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);
      const key = `${x}-${y}`;
      const isHead = isSameCell(snake[0], { x, y });
      const isFood = isSameCell(food, { x, y });
      const isSnake = snakeCells.has(key);

      return (
        <div
          key={key}
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 10,
            background: isFood
              ? 'radial-gradient(circle at 30% 30%, #fde68a, #f97316)'
              : isHead
                ? 'linear-gradient(135deg, #bbf7d0, #22c55e)'
                : isSnake
                  ? 'linear-gradient(135deg, #86efac, #15803d)'
                  : 'rgba(255,255,255,0.08)',
            boxShadow: isFood ? '0 0 20px rgba(249, 115, 22, 0.45)' : 'none',
            transition: 'background 0.12s ease-out, transform 0.12s ease-out',
            transform: isHead ? 'scale(1.03)' : 'scale(1)',
          }}
        />
      );
    });
  }, [food, snake]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 16px',
        background:
          'radial-gradient(circle at top, rgba(34,197,94,0.22), transparent 32%), linear-gradient(180deg, #0f172a, #111827 55%, #020617)',
        color: '#e5f7eb',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 920,
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          borderRadius: 28,
          padding: 24,
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <span
              style={{
                width: 'fit-content',
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(34, 197, 94, 0.14)',
                color: '#86efac',
                fontSize: 13,
                letterSpacing: '0.08em',
              }}
            >
              NEXT.JS SNAKE
            </span>
            <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 1, color: '#f8fafc' }}>
              贪吃蛇
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.7 }}>
              使用方向键或 WASD 控制移动，撞墙或撞到自己时游戏结束。按 Enter 或点击按钮可以立即重新开始。
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: 'rgba(15, 118, 110, 0.2)',
                  border: '1px solid rgba(45, 212, 191, 0.18)',
                }}
              >
                <div style={{ color: '#99f6e4', fontSize: 13, marginBottom: 8 }}>当前得分</div>
                <div style={{ fontSize: 36, fontWeight: 700 }}>{score}</div>
              </div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: isGameOver ? 'rgba(127, 29, 29, 0.28)' : 'rgba(30, 41, 59, 0.72)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                }}
              >
                <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 8 }}>游戏状态</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {isGameOver ? '游戏结束' : '进行中'}
                </div>
              </div>
            </div>

            <button
              onClick={resetGame}
              style={{
                appearance: 'none',
                border: 0,
                cursor: 'pointer',
                borderRadius: 18,
                padding: '14px 18px',
                fontSize: 16,
                fontWeight: 700,
                color: '#052e16',
                background: 'linear-gradient(135deg, #86efac, #22c55e)',
              }}
            >
              重新开始
            </button>

            <div style={{ display: 'grid', gap: 8, color: '#94a3b8', fontSize: 14 }}>
              <p>控制方式：↑ ↓ ← → / W A S D</p>
              <p>规则：每吃到一个食物得 1 分，速度固定，死亡后停止。</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
          <div
            style={{
              width: 'min(100%, 520px)',
              aspectRatio: '1 / 1',
              padding: 14,
              borderRadius: 28,
              background: 'rgba(2, 6, 23, 0.9)',
              border: '1px solid rgba(71, 85, 105, 0.65)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gap: 6,
                width: '100%',
                height: '100%',
              }}
            >
              {board}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 64px)',
              gap: 10,
              justifyContent: 'center',
            }}
          >
            <span />
            <ControlButton label="↑" onPress={() => turnSnake('UP')} />
            <span />
            <ControlButton label="←" onPress={() => turnSnake('LEFT')} />
            <ControlButton label="↓" onPress={() => turnSnake('DOWN')} />
            <ControlButton label="→" onPress={() => turnSnake('RIGHT')} />
          </div>
        </div>
      </section>
    </main>
  );
}

function ControlButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      aria-label={`向${label}移动`}
      style={{
        appearance: 'none',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        background: 'rgba(30, 41, 59, 0.9)',
        color: '#f8fafc',
        borderRadius: 18,
        width: 64,
        height: 64,
        cursor: 'pointer',
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}
