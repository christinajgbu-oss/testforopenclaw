# Snake Game Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the snake game out of `src/app/page.tsx` into focused modules with pure game logic covered by Vitest tests, leaving the page responsible only for layout and rendering the composed `SnakeGame` component.

**Architecture:** Extract the game into a `src/components/SnakeGame/` feature folder with small files divided by responsibility: shared types, pure grid helpers, a pure `advanceGame` state transition, a `useSnakeGame` hook for React state/effects, and a `SnakeGame` UI component. Keep the current gameplay and presentation intact while moving page-level styling into `src/app/page.module.css` and preserving the board UI in the new component.

**Tech Stack:** Next.js App Router, React 19, TypeScript, ESLint, Vitest, `@vitejs/plugin-react`

---

## File Structure

- Create: `docs/superpowers/plans/2026-03-24-snake-game-module-refactor.md` — implementation plan for this refactor
- Create: `src/components/SnakeGame/types.ts` — shared snake game domain types and constants
- Create: `src/components/SnakeGame/gridHelpers.ts` — pure helper functions for food placement and collision checks
- Create: `src/components/SnakeGame/advanceGame.ts` — pure game state transition logic
- Create: `src/components/SnakeGame/useSnakeGame.ts` — React hook owning runtime state, timer, input handling, and reset logic
- Create: `src/components/SnakeGame/SnakeGame.tsx` — rendered game UI and controls
- Create: `src/components/SnakeGame/__tests__/advanceGame.test.ts` — behavior tests for the pure game advance function
- Create: `src/components/SnakeGame/__tests__/gridHelpers.test.ts` — behavior tests for helper functions
- Create: `vitest.config.ts` — Vitest config for React + TypeScript path resolution
- Modify: `package.json` — add Vitest dependencies and test script
- Modify: `src/app/page.tsx` — reduce page to layout wrapper + `SnakeGame`
- Modify: `src/app/page.module.css` — replace starter styles with snake page layout styles

### Task 1: Add Test Tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add failing test command entry points**

Update `package.json` scripts so test files can be run directly with Vitest:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install Vitest dependencies**

Run: `npm install -D vitest @vitejs/plugin-react`
Expected: dependencies added to `devDependencies` and install exits `0`

- [ ] **Step 3: Add minimal Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify test runner starts**

Run: `npm test -- --help`
Expected: Vitest help output, exit `0`

### Task 2: Write Helper Tests First

**Files:**
- Create: `src/components/SnakeGame/__tests__/gridHelpers.test.ts`
- Test: `src/components/SnakeGame/gridHelpers.ts`

- [ ] **Step 1: Write the failing food-placement test**

```ts
it('returns the only remaining cell when one grid position is open', () => {
  const snake = [];

  // build a snake occupying every cell except { x: 15, y: 15 }
  // expect randomFoodPosition(snake, 16) to equal { x: 15, y: 15 }
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm test -- src/components/SnakeGame/__tests__/gridHelpers.test.ts`
Expected: FAIL because `gridHelpers.ts` does not exist yet

- [ ] **Step 3: Add the failing collision tests**

```ts
it('detects wall collisions outside the grid', () => {
  expect(isColliding({ x: -1, y: 4 }, [], 16)).toBe(true);
});

it('detects collisions with snake segments', () => {
  expect(isColliding({ x: 3, y: 2 }, [{ x: 3, y: 2 }], 16)).toBe(true);
});

it('does not report collision for an empty in-bounds cell', () => {
  expect(isColliding({ x: 1, y: 1 }, [{ x: 3, y: 2 }], 16)).toBe(false);
});
```

- [ ] **Step 4: Re-run helper tests to verify RED**

Run: `npm test -- src/components/SnakeGame/__tests__/gridHelpers.test.ts`
Expected: FAIL with missing export errors for `randomFoodPosition` and `isColliding`

### Task 3: Write Advance Function Tests First

**Files:**
- Create: `src/components/SnakeGame/__tests__/advanceGame.test.ts`
- Test: `src/components/SnakeGame/advanceGame.ts`
- Test: `src/components/SnakeGame/types.ts`

- [ ] **Step 1: Write the failing movement test**

```ts
it('moves the snake one cell in the queued direction and drops the tail', () => {
  const next = advanceGame(state);
  expect(next.snake).toEqual([
    { x: 6, y: 8 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
  ]);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm test -- src/components/SnakeGame/__tests__/advanceGame.test.ts`
Expected: FAIL because `advanceGame.ts` does not exist yet

- [ ] **Step 3: Add the failing scoring, food, reverse-direction, and game-over tests**

```ts
it('grows the snake and increments score when food is eaten', () => {
  expect(next.score).toBe(1);
  expect(next.snake).toHaveLength(4);
});

it('keeps the current direction when the queued direction is opposite', () => {
  expect(next.direction).toBe('RIGHT');
});

it('marks the game over on wall collision', () => {
  expect(next.isGameOver).toBe(true);
});

it('marks the game over on self collision', () => {
  expect(next.isGameOver).toBe(true);
});
```

- [ ] **Step 4: Re-run advance tests to verify RED**

Run: `npm test -- src/components/SnakeGame/__tests__/advanceGame.test.ts`
Expected: FAIL with missing export/type errors for `advanceGame` and game types

### Task 4: Implement Pure Snake Game Modules

**Files:**
- Create: `src/components/SnakeGame/types.ts`
- Create: `src/components/SnakeGame/gridHelpers.ts`
- Create: `src/components/SnakeGame/advanceGame.ts`

- [ ] **Step 1: Add shared types and constants**

Create `types.ts` with the shared domain types and defaults:

```ts
export type Cell = { x: number; y: number };
export type Food = Cell;
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameState = {
  snake: Cell[];
  food: Food;
  direction: Direction;
  queuedDirection: Direction;
  score: number;
  isGameOver: boolean;
};

export const GRID_SIZE = 16;
export const INITIAL_SNAKE: Cell[] = [
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
];
export const INITIAL_DIRECTION: Direction = 'RIGHT';
export const TICK_MS = 140;
```

- [ ] **Step 2: Implement the minimal helper functions to satisfy helper tests**

Create `gridHelpers.ts` with:

```ts
export function randomFoodPosition(snake: Cell[], gridSize = GRID_SIZE): Food { /* ... */ }
export function isColliding(cell: Cell, snake: Cell[], gridSize = GRID_SIZE): boolean { /* ... */ }
```

- [ ] **Step 3: Run helper tests to verify GREEN**

Run: `npm test -- src/components/SnakeGame/__tests__/gridHelpers.test.ts`
Expected: PASS

- [ ] **Step 4: Implement the minimal `advanceGame(state)` transition**

Create `advanceGame.ts`:

```ts
export function advanceGame(
  state: GameState,
  getFoodPosition = randomFoodPosition,
): GameState {
  // resolve queued direction, move head, detect collisions,
  // grow on food, spawn replacement food, update score
}
```

- [ ] **Step 5: Run advance tests to verify GREEN**

Run: `npm test -- src/components/SnakeGame/__tests__/advanceGame.test.ts`
Expected: PASS

### Task 5: Compose the Hook and Component

**Files:**
- Create: `src/components/SnakeGame/useSnakeGame.ts`
- Create: `src/components/SnakeGame/SnakeGame.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`

- [ ] **Step 1: Build the hook around the pure state transition**

Implement `useSnakeGame.ts` so it:

```ts
// initializes GameState
// resets with fresh food
// queues turns while blocking reverse direction after game over
// advances on an interval using advanceGame()
// listens for Arrow keys / WASD / Enter reset
```

- [ ] **Step 2: Build the `SnakeGame` presentational component**

Implement `SnakeGame.tsx` so it:

```tsx
// renders the current score, game state, board cells, restart button,
// and directional buttons using the hook state/actions
```

- [ ] **Step 3: Simplify the page**

Replace `src/app/page.tsx` with:

```tsx
import styles from './page.module.css';
import { SnakeGame } from '@/components/SnakeGame/SnakeGame';

export default function Home() {
  return (
    <main className={styles.page}>
      <SnakeGame />
    </main>
  );
}
```

- [ ] **Step 4: Move page-level layout styling into `page.module.css`**

Keep only page wrapper responsibilities there, for example:

```css
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: radial-gradient(...), linear-gradient(...);
}
```

- [ ] **Step 5: Run the snake tests again after composition**

Run: `npm test -- src/components/SnakeGame/__tests__/gridHelpers.test.ts src/components/SnakeGame/__tests__/advanceGame.test.ts`
Expected: PASS

### Task 6: Final Verification

**Files:**
- Verify all created and modified files above

- [ ] **Step 1: Run the full snake test suite**

Run: `npm test -- src/components/SnakeGame/__tests__/gridHelpers.test.ts src/components/SnakeGame/__tests__/advanceGame.test.ts`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit `0`

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: exit `0`

- [ ] **Step 4: Report results**

Report:
- every file created
- every file modified
- exact verification results for tests, lint, and build
