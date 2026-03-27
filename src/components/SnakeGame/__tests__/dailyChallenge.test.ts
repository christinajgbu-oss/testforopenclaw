import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveSharedModeState } from '@/app/page';

import { SnakeGame } from '../SnakeGame';
import type { DailyChallenge, GameState } from '../types';
import {
  DAILY_CHALLENGE_STORAGE_KEY,
  calculateDailyChallengeTargetScore,
  createDailyChallenge,
  getDailySeed,
  readDailyChallengeStore,
  saveDailyChallenge,
  updateStoredDailyChallengeResult,
  useSnakeGame,
} from '../useSnakeGame';

vi.mock('../useSnakeGame', async () => {
  const actual = await vi.importActual<typeof import('../useSnakeGame')>(
    '../useSnakeGame',
  );

  return {
    ...actual,
    useSnakeGame: vi.fn(),
  };
});

const mockedUseSnakeGame = vi.mocked(useSnakeGame);

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createDailyChallengeFixture(
  overrides: Partial<DailyChallenge> = {},
): DailyChallenge {
  return {
    date: overrides.date ?? '2026-03-27',
    seed: overrides.seed ?? 2_024_0327,
    difficulty: overrides.difficulty ?? 'normal',
    obstacleMode: overrides.obstacleMode ?? true,
    obstacleDifficulty: overrides.obstacleDifficulty ?? 'normal',
    targetScore: overrides.targetScore ?? 128,
    bestScore: overrides.bestScore ?? 95,
    completed: overrides.completed ?? false,
    attempts: overrides.attempts ?? 3,
  };
}

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    snake: overrides.snake ?? [
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 },
    ],
    food: overrides.food ?? { x: 10, y: 10 },
    bonusFood: overrides.bonusFood,
    obstacles: overrides.obstacles ?? [],
    direction: overrides.direction ?? 'RIGHT',
    queuedDirection: overrides.queuedDirection ?? 'RIGHT',
    score: overrides.score ?? 3,
    highScore: overrides.highScore ?? 8,
    previousHighScore: overrides.previousHighScore ?? 5,
    isGameOver: overrides.isGameOver ?? false,
    gameStatus: overrides.gameStatus ?? 'running',
    prop: overrides.prop ?? null,
    activeProps: overrides.activeProps ?? {},
    elapsedMs: overrides.elapsedMs ?? 0,
    nextPropSpawnAt: overrides.nextPropSpawnAt ?? 15_000,
  };
}

function renderGame({
  state = {},
  dailyChallenge = createDailyChallengeFixture(),
  isDailyChallengeMode = false,
}: {
  state?: Partial<GameState>;
  dailyChallenge?: DailyChallenge | null;
  isDailyChallengeMode?: boolean;
} = {}) {
  mockedUseSnakeGame.mockReturnValue({
    ...createGameState(state),
    achievements: {},
    difficulty: dailyChallenge?.difficulty ?? 'normal',
    durationSeconds: 12,
    elapsedMs: 1_200,
    highScore: 99,
    history: [],
    latestReplay: null,
    obstacleMode: dailyChallenge?.obstacleMode
      ? dailyChallenge.obstacleDifficulty
      : null,
    resetGame: vi.fn(),
    selectedSkin: 'default',
    setDifficulty: vi.fn(),
    setObstacleMode: vi.fn(),
    setSkin: vi.fn(),
    startDailyChallenge: vi.fn(),
    dailyChallenge,
    isDailyChallengeMode,
    turnSnake: vi.fn(),
    updateDailyChallenge: vi.fn(),
  });

  return renderToStaticMarkup(createElement(SnakeGame));
}

describe('daily challenge helpers', () => {
  it('creates a deterministic seed from the YYYY-MM-DD date string', () => {
    expect(getDailySeed('2026-03-27')).toBe(getDailySeed('2026-03-27'));
    expect(getDailySeed('2026-03-27')).not.toBe(getDailySeed('2026-03-28'));
  });

  it('retains only the latest 30 daily challenge records in storage', () => {
    const storage = createStorageMock();

    for (let day = 1; day <= 31; day += 1) {
      saveDailyChallenge(
        createDailyChallengeFixture({
          date: `2026-03-${String(day).padStart(2, '0')}`,
          seed: day,
        }),
        storage,
      );
    }

    const store = readDailyChallengeStore(storage);

    expect(Object.keys(store.challenges)).toHaveLength(30);
    expect(store.challenges['2026-03-01']).toBeUndefined();
    expect(store.challenges['2026-03-31']).toMatchObject({
      date: '2026-03-31',
      seed: 31,
    });
    expect(storage.getItem(DAILY_CHALLENGE_STORAGE_KEY)).toContain(
      '"challenges"',
    );
  });

  it('updates best score, attempts, and completion when a daily run finishes', () => {
    const storage = createStorageMock();
    saveDailyChallenge(
      createDailyChallengeFixture({
        bestScore: 95,
        attempts: 3,
        completed: false,
        targetScore: 128,
      }),
      storage,
    );

    const completed = updateStoredDailyChallengeResult(
      '2026-03-27',
      145,
      storage,
    );
    const retry = updateStoredDailyChallengeResult('2026-03-27', 80, storage);

    expect(completed).toMatchObject({
      bestScore: 145,
      attempts: 4,
      completed: true,
    });
    expect(retry).toMatchObject({
      bestScore: 145,
      attempts: 5,
      completed: true,
    });
  });

  it('calculates a deterministic target score in async chunks', async () => {
    vi.useFakeTimers();
    const timerSpy = vi.spyOn(globalThis, 'setTimeout');
    const challenge = createDailyChallenge('2026-03-27');

    const firstRun = calculateDailyChallengeTargetScore(challenge, {
      playoutCount: 6,
      chunkSize: 2,
    });
    const secondRun = calculateDailyChallengeTargetScore(challenge, {
      playoutCount: 6,
      chunkSize: 2,
    });

    await vi.runAllTimersAsync();

    expect(await firstRun).toBe(await secondRun);
    expect(timerSpy).toHaveBeenCalled();
    expect(await calculateDailyChallengeTargetScore(challenge, {
      playoutCount: 4,
      chunkSize: 4,
    })).toBeGreaterThanOrEqual(0);
  });
});

describe('daily challenge page routing', () => {
  it('auto-starts only when the shared daily date matches today', () => {
    expect(
      resolveSharedModeState('?daily=2026-03-27', '2026-03-27'),
    ).toMatchObject({
      dailyChallengeDate: '2026-03-27',
      expiredDailyChallengeDate: null,
      replayData: null,
    });

    expect(
      resolveSharedModeState('?daily=2026-03-26', '2026-03-27'),
    ).toMatchObject({
      dailyChallengeDate: null,
      expiredDailyChallengeDate: '2026-03-26',
      replayData: null,
    });
  });
});

describe('SnakeGame daily challenge UI', () => {
  beforeEach(() => {
    mockedUseSnakeGame.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the daily challenge entry card on the main screen', () => {
    const markup = renderGame();

    expect(markup).toContain('今日挑战');
    expect(markup).toContain('目标分数');
    expect(markup).toContain('开始挑战');
    expect(markup).toContain('查看规则');
  });

  it('shows challenge mode status and result content after a daily run ends', () => {
    const markup = renderGame({
      state: {
        isGameOver: true,
        score: 145,
      },
      dailyChallenge: createDailyChallengeFixture({
        completed: true,
        bestScore: 145,
      }),
      isDailyChallengeMode: true,
    });

    expect(markup).toContain('挑战完成');
    expect(markup).toContain('你的得分');
    expect(markup).toContain('再来一局');
    expect(markup).toContain('分享结果');
  });
});
