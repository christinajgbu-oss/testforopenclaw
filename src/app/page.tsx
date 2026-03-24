import { SnakeGame } from '@/components/SnakeGame/SnakeGame';

import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <SnakeGame />
    </main>
  );
}
