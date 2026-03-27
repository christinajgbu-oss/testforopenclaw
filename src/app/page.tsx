'use client';

import { useEffect, useState } from 'react';

import { SnakeGame } from '@/components/SnakeGame/SnakeGame';
import type { ReplayData } from '@/components/SnakeGame/types';
import { decodeReplayData } from '@/components/SnakeGame/useSnakeGame';

import styles from './page.module.css';

export default function Home() {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);

  useEffect(() => {
    const syncReplayData = () => {
      const encodedReplay = new URLSearchParams(window.location.search).get('replay');
      setReplayData(encodedReplay ? decodeReplayData(encodedReplay) : null);
    };

    syncReplayData();
    window.addEventListener('popstate', syncReplayData);
    window.addEventListener('snake-replay-url-change', syncReplayData as EventListener);

    return () => {
      window.removeEventListener('popstate', syncReplayData);
      window.removeEventListener('snake-replay-url-change', syncReplayData as EventListener);
    };
  }, []);

  return (
    <main className={styles.page}>
      <SnakeGame replayData={replayData} />
    </main>
  );
}
