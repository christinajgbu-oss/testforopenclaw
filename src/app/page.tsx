'use client';

import { useEffect, useState } from 'react';

import { SnakeGame } from '@/components/SnakeGame/SnakeGame';
import type { ReplayData } from '@/components/SnakeGame/types';
import {
  decodeReplayData,
  getTodayDateString,
  resolveSharedModeState,
} from '@/components/SnakeGame/useSnakeGame';

import styles from './page.module.css';

export { resolveSharedModeState };

export default function Home() {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [dailyDate, setDailyDate] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedReplay = params.get('replay');
    const dailyParam = params.get('daily');

    setReplayData(encodedReplay ? decodeReplayData(encodedReplay) : null);
    setDailyDate(dailyParam ?? null);

    const syncReplayData = () => {
      const p = new URLSearchParams(window.location.search);
      setReplayData(p.get('replay') ? decodeReplayData(p.get('replay')!) : null);
    };

    window.addEventListener('popstate', syncReplayData);
    window.addEventListener('snake-replay-url-change', syncReplayData as EventListener);

    return () => {
      window.removeEventListener('popstate', syncReplayData);
      window.removeEventListener('snake-replay-url-change', syncReplayData as EventListener);
    };
  }, []);

  return (
    <main className={styles.page}>
      <SnakeGame replayData={replayData} dailyDate={dailyDate} />
    </main>
  );
}
