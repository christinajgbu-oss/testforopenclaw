'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import pageStyles from '@/app/page.module.css';

import { DailyChallengeCard, DailyChallengeExpired, DailyChallengeResult } from './DailyChallenge';
import { Leaderboard } from './Leaderboard';
import { ReplayPlayer } from './ReplayPlayer';
import { ShareCard } from './ShareCard';
import { ACHIEVEMENTS, DIFFICULTY_SETTINGS, OBSTACLE_SETTINGS, PROPS, GRID_SIZE, SKINS, isSkinUnlocked } from './types';
import type { Cell, Difficulty, ObstacleDifficulty, PropId, ReplayData } from './types';
import { encodeReplayData, getTodayDateString, useSnakeGame, writeReplay } from './useSnakeGame';

function isSameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function SnakeGame({
  replayData = null,
  dailyDate = null,
}: {
  replayData?: ReplayData | null;
  dailyDate?: string | null;
}) {
  if (replayData) {
    return <ReplayPlayer replayData={replayData} />;
  }

  const {
    activeProps,
    bonusFood,
    difficulty,
    food,
    gameStatus,
    highScore,
    history,
    isGameOver,
    obstacles,
    obstacleMode,
    previousHighScore,
    achievements,
    durationSeconds = 0,
    elapsedMs = 0,
    prop,
    latestReplay,
    resetGame,
    score,
    selectedSkin,
    setDifficulty,
    setObstacleMode,
    setSkin,
    snake,
    turnSnake,
    dailyChallenge,
    dailyChallengeLoading,
    isDailyChallengeMode,
    startDailyChallenge,
    updateDailyChallenge,
  } = useSnakeGame();
  const [showHistory, setShowHistory] = useState(false);
  const [activeReplay, setActiveReplay] = useState<ReplayData | null>(null);
  const [replaySaveChoice, setReplaySaveChoice] = useState<'pending' | 'saved' | 'skipped'>('pending');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDailyResult, setShowDailyResult] = useState(false);
  const [showDailyExpired, setShowDailyExpired] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Handle ?daily= URL parameter for expired challenges
  useEffect(() => {
    if (!dailyDate) return;
    const today = getTodayDateString();
    if (dailyDate !== today) {
      setShowDailyExpired(true);
    }
  }, [dailyDate]);
  const [activePropToasts, setActivePropToasts] = useState<
    Array<{ id: PropId; name: string; icon: string }>
  >([]);
  const [propCountdowns, setPropCountdowns] = useState<
    Partial<Record<PropId, number>>
  >({});
  const [isWideLayout, setIsWideLayout] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasNewHighScore = isGameOver && highScore > previousHighScore;
  const activeSkin = SKINS.find((skin) => skin.id === selectedSkin) ?? SKINS[0];
  const unlockedAchievementIds = ACHIEVEMENTS.filter(
    (achievement) => achievements[achievement.id],
  )
    .slice(0, 3)
    .map((achievement) => achievement.id);

  useEffect(() => {
    if (!isGameOver) {
      setReplaySaveChoice('pending');
      setActiveReplay(null);
    }
  }, [isGameOver]);

  // Update daily challenge record on game over
  useEffect(() => {
    if (!isGameOver || !isDailyChallengeMode) return;
    if (!dailyChallenge) return;
    const result = updateDailyChallenge(score);
    if (result) {
      setShowDailyResult(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, isDailyChallengeMode]);

  useEffect(() => {
    const handleReplayExit = () => {
      setActiveReplay(null);
    };

    window.addEventListener('snake-replay-exit', handleReplayExit as EventListener);

    return () => {
      window.removeEventListener('snake-replay-exit', handleReplayExit as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  useEffect(() => {
    const updateLayout = () => {
      setIsWideLayout(window.innerWidth >= 860);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    section.style.setProperty('--snake-head', activeSkin.headColor);
    section.style.setProperty('--snake-body', activeSkin.bodyColor);
    section.style.setProperty('--food-color', activeSkin.foodColor);
    section.style.setProperty('--board-bg', activeSkin.bgColor);
  }, [activeSkin]);

  // Prop countdown timer (updates every second)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = elapsedMs;
      const newCountdowns: Partial<Record<PropId, number>> = {};
      Object.entries(activeProps).forEach(([id, prop]) => {
        if (prop && prop.expiresAt !== Infinity) {
          const remaining = Math.max(0, Math.ceil((prop.expiresAt - now) / 1000));
          newCountdowns[id as PropId] = remaining;
        }
      });
      setPropCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeProps, elapsedMs]);

  const handleSaveReplay = () => {
    if (!latestReplay) {
      return;
    }

    writeReplay(latestReplay);
    setReplaySaveChoice('saved');
  };

  const handleShareReplay = async () => {
    if (!latestReplay) {
      return;
    }

    const encodedReplay = encodeReplayData(latestReplay);
    const shareUrl = `${window.location.origin}${window.location.pathname}?replay=${encodedReplay}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('链接已复制');
    } catch {
      setToastMessage('复制失败');
    }
  };

  if (activeReplay) {
    return <ReplayPlayer replayData={activeReplay} />;
  }

  const board = useMemo(() => {
    const snakeCells = new Set(snake.map((segment) => `${segment.x}-${segment.y}`));
    const obstacleSet = new Set(obstacles.map((o) => `${o.x}-${o.y}`));

    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);
      const key = `${x}-${y}`;
      const isHead = isSameCell(snake[0], { x, y });
      const isFood = isSameCell(food, { x, y });
      const isBonusFood = bonusFood ? isSameCell(bonusFood, { x, y }) : false;
      const isObstacle = obstacleSet.has(key);
      const isSnake = snakeCells.has(key);
      const isProp = prop ? isSameCell(prop, { x, y }) : false;
      const propData = isProp ? PROPS.find((p) => p.id === prop!.id) : null;

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
            transition: 'background 0.12s ease-out, transform 0.12s ease-out',
            transform: isHead ? 'scale(1.03)' : 'scale(1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isProp ? 'propPulse 1s infinite' : undefined,
          }}
        >
          {isProp && propData && (
            <span style={{ fontSize: 16, lineHeight: 1 }}>{propData.icon}</span>
          )}
        </div>
      );
    });
  }, [bonusFood, food, obstacles, prop, snake]);

  return (
    <>
      <style>{`
        @keyframes propPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.9); }
        }
      `}</style>
      <section
        ref={sectionRef}
        style={{
          '--snake-head': activeSkin.headColor,
          '--snake-body': activeSkin.bodyColor,
          '--food-color': activeSkin.foodColor,
          '--board-bg': activeSkin.bgColor,
          width: '100%',
          maxWidth: 'min(920px, calc(100vw - 20px))',
          display: 'grid',
          gap: 24,
          gridTemplateColumns: isWideLayout ? 'minmax(0, 1.05fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          alignItems: 'center',
          overflowX: 'hidden',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          borderRadius: 28,
          padding: 'clamp(16px, 4vw, 24px)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(18px)',
          color: '#e5f7eb',
        } as CSSProperties}
      >
        <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
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

          {/* Daily Challenge Card */}
          {dailyChallenge && !isDailyChallengeMode && (
            <DailyChallengeCard
              challenge={dailyChallenge}
              loading={dailyChallengeLoading}
              onStart={() => {
                void startDailyChallenge();
              }}
              onShare={() => {
                const shareText = `今日贪吃蛇挑战：目标 ${dailyChallenge.targetScore} 分，我的最佳是 ${dailyChallenge.bestScore} 分 ${dailyChallenge.completed ? '🎉 已完成！' : ''} 来试试你的！ https://testforopenclaw.pages.dev/?daily=${dailyChallenge.date}`;
                void navigator.clipboard.writeText(shareText);
                setToastMessage('分享内容已复制');
              }}
            />
          )}

          {isDailyChallengeMode && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>🎯 每日挑战</span>
                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                  目标 {dailyChallenge?.targetScore} 分
                </span>
              </div>
              <div style={{ color: '#86efac', fontSize: 13, fontWeight: 600 }}>
                {score} / {dailyChallenge?.targetScore}
              </div>
            </div>
          )}

          {/* Leaderboard button */}
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            style={{
              appearance: 'none',
              border: '1px solid rgba(148,163,184,0.22)',
              borderRadius: 16,
              padding: '12px 16px',
              background: 'rgba(30,41,59,0.9)',
              color: '#f8fafc',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            🏆 排行榜
          </button>

          <div style={{ display: 'grid', gap: 12 }}>
            {/* Difficulty selector */}
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>
                难度
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((d) => {
                  const setting = DIFFICULTY_SETTINGS[d];
                  const isActive = d === difficulty;

                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setDifficulty(d)}
                      style={{
                        appearance: 'none',
                        border: 'none',
                        borderRadius: 12,
                        padding: '8px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isActive
                          ? 'linear-gradient(135deg, #86efac, #22c55e)'
                          : 'rgba(30, 41, 59, 0.9)',
                        color: isActive ? '#052e16' : '#94a3b8',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: isActive
                          ? '#22c55e'
                          : 'rgba(148, 163, 184, 0.26)',
                        transition: 'all 0.15s ease-out',
                      }}
                    >
                      {setting.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Obstacle mode toggle + sub-difficulty */}
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (obstacleMode === null) {
                      setObstacleMode('normal');
                    } else {
                      setObstacleMode(null);
                    }
                  }}
                  style={{
                    appearance: 'none',
                    border: '1px solid rgba(148, 163, 184, 0.26)',
                    borderRadius: 12,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: obstacleMode !== null
                      ? 'linear-gradient(135deg, #fde68a, #f59e0b)'
                      : 'rgba(30, 41, 59, 0.9)',
                    color: obstacleMode !== null ? '#451a03' : '#94a3b8',
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  🧱 障碍物模式 {obstacleMode !== null ? '开' : '关'}
                </button>
                {obstacleMode !== null && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(Object.keys(OBSTACLE_SETTINGS) as ObstacleDifficulty[]).map((d) => {
                      const setting = OBSTACLE_SETTINGS[d];
                      const isActive = d === obstacleMode;

                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setObstacleMode(d)}
                          style={{
                            appearance: 'none',
                            border: 'none',
                            borderRadius: 10,
                            padding: '5px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: isActive
                              ? 'linear-gradient(135deg, #86efac, #22c55e)'
                              : 'rgba(30, 41, 59, 0.9)',
                            color: isActive ? '#052e16' : '#94a3b8',
                            transition: 'all 0.15s ease-out',
                          }}
                        >
                          {setting.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isWideLayout
                  ? 'repeat(3, minmax(0, 1fr))'
                  : 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
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
                className={pageStyles.highScoreCard}
                style={{
                  padding: 18,
                  borderRadius: 18,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div className={pageStyles.highScoreLabel}>最高分</div>
                  {hasNewHighScore ? (
                    <span className={pageStyles.newBadge}>NEW!</span>
                  ) : null}
                </div>
                <div className={pageStyles.highScoreValue}>{highScore}</div>
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

            <button
              onClick={() => setShowHistory(true)}
              style={{
                appearance: 'none',
                border: '1px solid rgba(148, 163, 184, 0.26)',
                cursor: 'pointer',
                borderRadius: 18,
                padding: '14px 18px',
                fontSize: 16,
                fontWeight: 700,
                color: '#e2e8f0',
                background: 'rgba(30, 41, 59, 0.9)',
              }}
            >
              个人战绩
            </button>

            <div style={{ display: 'grid', gap: 8, color: '#94a3b8', fontSize: 14 }}>
              <p>控制方式：↑ ↓ ← → / W A S D</p>
              <p>规则：每吃到一个食物得 1 分，速度固定，死亡后停止。</p>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>皮肤</div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {SKINS.map((skin) => {
                  const unlocked = isSkinUnlocked(skin.id, achievements);
                  const isSelected = skin.id === activeSkin.id;

                  return (
                    <button
                      key={skin.id}
                      type="button"
                      aria-label={`选择${skin.name}皮肤`}
                      aria-pressed={isSelected}
                      title={unlocked ? skin.name : 'Unlock all achievements'}
                      onClick={() => {
                        if (!unlocked) {
                          return;
                        }

                        setSkin(skin.id);
                      }}
                      style={{
                        position: 'relative',
                        appearance: 'none',
                        borderRadius: 999,
                        width: 58,
                        height: 58,
                        border: isSelected
                          ? '3px solid #22c55e'
                          : '1px solid rgba(148, 163, 184, 0.26)',
                        background: `linear-gradient(135deg, ${skin.headColor}, ${skin.bodyColor})`,
                        boxShadow: `inset 0 0 0 4px ${skin.bgColor}`,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.72,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          right: -2,
                          bottom: -2,
                          display: 'grid',
                          placeItems: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: unlocked ? skin.foodColor : 'rgba(15, 23, 42, 0.92)',
                          color: unlocked ? '#0f172a' : '#f8fafc',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {unlocked ? '•' : '🔒'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, justifyItems: 'center', minWidth: 0 }}>
          <div
            style={{
              width: 'min(100%, calc(100vw - 48px))',
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
                minWidth: 0,
                minHeight: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {board}
            </div>
            {gameStatus === 'idle' && (
              <div
                onClick={() => turnSnake('RIGHT')}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.45)',
                  borderRadius: 28,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                按任意键开始
              </div>
            )}
          </div>

          {/* Active props status bar */}
          {Object.keys(activeProps).length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {Object.entries(activeProps).map(([id, active]) => {
                if (!active) return null;
                const propDef = PROPS.find((p) => p.id === id);
                if (!propDef) return null;
                const remaining =
                  active.expiresAt === Infinity
                    ? null
                    : Math.max(
                        0,
                        Math.ceil((active.expiresAt - elapsedMs) / 1000),
                      );

                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(148, 163, 184, 0.22)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#e2e8f0',
                    }}
                  >
                    <span>{propDef.icon}</span>
                    <span>{propDef.name}</span>
                    {remaining !== null && (
                      <span style={{ color: '#64748b', marginLeft: 2 }}>
                        {remaining}s
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(44px, 64px))',
              gap: 10,
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <span />
            <ControlButton label="↑" onPress={() => turnSnake('UP')} />
            <span />
            <ControlButton label="←" onPress={() => turnSnake('LEFT')} />
            <ControlButton label="↓" onPress={() => turnSnake('DOWN')} />
            <ControlButton label="→" onPress={() => turnSnake('RIGHT')} />
          </div>

          <div style={{ display: 'grid', gap: 10, width: '100%' }}>
            <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>成就</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(110px, 100%), 1fr))',
                gap: 10,
                width: '100%',
              }}
            >
              {ACHIEVEMENTS.map((achievement) => {
                const unlocked = achievements[achievement.id];

                return (
                  <div
                    key={achievement.id}
                    title={`${achievement.name}: ${achievement.description}`}
                    style={{
                      display: 'grid',
                      justifyItems: 'center',
                      gap: 6,
                      padding: '12px 10px',
                      borderRadius: 16,
                      background: unlocked
                        ? 'rgba(34, 197, 94, 0.16)'
                        : 'rgba(15, 23, 42, 0.82)',
                      border: unlocked
                        ? '1px solid rgba(134, 239, 172, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.18)',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{unlocked ? achievement.icon : '🔒'}</span>
                    <span style={{ fontSize: 12, color: unlocked ? '#dcfce7' : '#94a3b8' }}>
                      {achievement.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {isGameOver ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: 'rgba(15, 23, 42, 0.78)',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'grid', gap: 16, width: 'min(560px, 100%)' }}>
            {isDailyChallengeMode && dailyChallenge ? (
              <DailyChallengeResult
                challenge={dailyChallenge}
                score={score}
                onReplay={() => {
                  setShowDailyResult(false);
                  startDailyChallenge();
                }}
                onShare={() => {
                  const hitTarget = score >= (dailyChallenge?.targetScore ?? 0);
                  const text = hitTarget
                    ? `今日贪吃蛇挑战：目标 ${dailyChallenge?.targetScore} 分，我得了 ${score} 分 🎉 来试试你的！`
                    : `今日贪吃蛇挑战：目标 ${dailyChallenge?.targetScore} 分，我得了 ${score} 分。继续加油！ https://testforopenclaw.pages.dev/?daily=${dailyChallenge?.date}`;
                  void navigator.clipboard.writeText(text);
                  setToastMessage('分享内容已复制');
                }}
                onClose={() => {
                  setShowDailyResult(false);
                  resetGame();
                }}
              />
            ) : (
              <ShareCard
                score={score}
                skinId={selectedSkin}
                achievementIds={unlockedAchievementIds}
                durationSeconds={durationSeconds}
                onClose={resetGame}
                onRestart={resetGame}
              />
            )}
            {latestReplay ? (
              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: 'rgba(30, 41, 59, 0.96)',
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>
                  保存回放？
                </div>
                {replaySaveChoice === 'pending' ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSaveReplay}
                      style={overlayButtonStyle(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplaySaveChoice('skipped')}
                      style={overlayButtonStyle(false)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#cbd5e1', fontSize: 14 }}>
                    {replaySaveChoice === 'saved' ? '回放已保存到本地。' : '已跳过保存。'}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveReplay(latestReplay)}
                    style={overlayButtonStyle(true)}
                  >
                    回放
                  </button>
                  <button
                    type="button"
                    onClick={handleShareReplay}
                    style={overlayButtonStyle(false)}
                  >
                    分享
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {showDailyExpired && dailyChallenge ? (
        <DailyChallengeExpired
          date={dailyDate ?? dailyChallenge.date}
          bestScore={dailyChallenge.bestScore}
          targetScore={dailyChallenge.targetScore}
          onClose={() => setShowDailyExpired(false)}
        />
      ) : null}
      {showLeaderboard ? (
        <Leaderboard
          myScore={score}
          targetScore={dailyChallenge?.targetScore}
          onClose={() => setShowLeaderboard(false)}
        />
      ) : null}
      {showHistory ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: 'rgba(15, 23, 42, 0.78)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.96)',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              borderRadius: 24,
              padding: 32,
              width: 'min(480px, 100%)',
              maxHeight: '80vh',
              overflowY: 'auto',
              display: 'grid',
              gap: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700 }}>个人战绩</h2>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  appearance: 'none',
                  border: '1px solid rgba(148, 163, 184, 0.26)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#94a3b8',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                关闭
              </button>
            </div>

            {/* Summary stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              <StatCard label="最高分" value={history[0]?.score ?? highScore} />
              <StatCard label="总局数" value={history.length} />
              <StatCard
                label="平均分"
                value={
                  history.length > 0
                    ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length)
                    : 0
                }
              />
              <StatCard label="成就解锁" value={`${Object.keys(achievements).length}/9`} />
            </div>

            {/* Recent games list */}
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>最近战绩</div>
              {history.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 14 }}>暂无记录，开始游戏吧！</p>
              ) : (
                history.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 2 }}>
                      <span style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>
                        {entry.score}
                        <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>
                          分 · {DIFFICULTY_SETTINGS[entry.difficulty].label}
                        </span>
                      </span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>
                        {new Date(entry.achievedAt).toLocaleDateString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      🏆 {entry.achievementCount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
      {toastMessage ? (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            color: '#f8fafc',
            fontSize: 14,
            fontWeight: 600,
            zIndex: 60,
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(148, 163, 184, 0.12)',
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
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
        minWidth: 44,
        minHeight: 44,
        cursor: 'pointer',
        fontSize: 26,
        fontWeight: 700,
        touchAction: 'manipulation',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}

function overlayButtonStyle(isPrimary: boolean): CSSProperties {
  return {
    appearance: 'none',
    border: isPrimary ? 0 : '1px solid rgba(148, 163, 184, 0.26)',
    borderRadius: 16,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: isPrimary
      ? 'linear-gradient(135deg, #86efac, #22c55e)'
      : 'rgba(30, 41, 59, 0.9)',
    color: isPrimary ? '#052e16' : '#f8fafc',
  };
}
