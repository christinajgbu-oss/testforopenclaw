# 贪吃蛇增强版 - 实施计划

> 版本：v1.0 | 日期：2026-03-24 | 状态：设计完成，待开发

---

## 开发原则

- **TDD 流程**：先写测试 → 写实现 → 验证
- **纯函数不变**：不改动 `advanceGame.ts` 和 `gridHelpers.ts`
- **副作用隔离**：所有增强逻辑在 `useSnakeGame.ts` 和 `SnakeGame.tsx` 层
- **Codex 执行**：所有代码改动通过 Codex 完成，按 Superpowers TDD 流程

---

## Phase 1：最高分记录 ✅ 完成

### 改动范围

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/components/SnakeGame/types.ts` | 修改 | 扩展 GameState，添加 `highScore: number` |
| `src/components/SnakeGame/useSnakeGame.ts` | 修改 | 游戏结束时比较并更新 localStorage |
| `src/components/SnakeGame/SnakeGame.tsx` | 修改 | 得分卡旁显示最高分，新纪录时显示 "NEW!" badge |
| `src/components/SnakeGame/__tests__/highScore.test.ts` | 新增 | 测试 localStorage 读写逻辑 |

### 实现步骤

1. **types.ts**：GameState 新增 `highScore: number` 字段，初始值 0
2. **useSnakeGame.ts**：
   - `useEffect` 初始化时从 `localStorage.getItem('snake_highscore')` 读取 highScore
   - 游戏结束（`isGameOver=true`）时，比较 `score > highScore`，更新两者并写入 `localStorage.setItem('snake_highscore', score)`
3. **SnakeGame.tsx**：
   - 渲染最高分，样式与当前得分区分开
   - 新纪录 badge：`score > previousHighScore` 时显示动画 "NEW!"
4. **测试**：mock `localStorage`，验证读写正确性

### 验收标准

- [ ] 首次加载：最高分显示 0
- [ ] 游戏中：当前得分变化，最高分不变
- [ ] 死亡时：若 score > highScore，最高分更新且显示 "NEW!" badge
- [ ] 刷新页面：最高分从 localStorage 恢复
- [ ] `npm test` 全通过

---

## Phase 2：成就系统

### 改动范围

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/components/SnakeGame/types.ts` | 修改 | 新增 Achievement、AchievementId 类型 |
| `src/components/SnakeGame/useSnakeGame.ts` | 修改 | tick 后检测成就解锁条件 |
| `src/components/SnakeGame/SnakeGame.tsx` | 修改 | 成就网格 UI，hover 显示详情 |
| `src/components/SnakeGame/__tests__/achievements.test.ts` | 新增 | 测试成就解锁逻辑 |

### 成就数据（9个）

| ID | 名称 | 解锁条件 |
|----|------|----------|
| `first_bite` | 初尝禁果 | score 从 0→1 |
| `gourmet_10` | 小有名气 | score ≥ 10 |
| `gourmet_30` | 蛇吞百味 | score ≥ 30 |
| `gourmet_50` | 贪食之王 | score ≥ 50 |
| `half_board` | 半壁江山 | snake.length ≥ 128（棋盘一半）|
| `perfect_fill` | 完美收官 | snake.length === 256（填满棋盘）|
| `comeback_kid` | 绝地反击 | 落后 5 分后反超 |
| `no_miss` | 百发百中 | 连续吃 10 个无死 |
| `speedster` | 极速反应 | 两次吃食物间隔 < 1000ms |

### 实现步骤

1. **types.ts**：定义 `AchievementId`、`AchievementStore`、`ACHIEVEMENTS` 常量数组
2. **useSnakeGame.ts**：
   - `useEffect` 初始化时从 `localStorage.getItem('snake_achievements')` 读取已解锁成就
   - `tick` 后调用成就检测函数（纯函数，在 `advanceGame` 之后）
   - 新成就解锁时，更新 store 并写入 localStorage
3. **SnakeGame.tsx**：成就网格，locked 显示 🔒，unlocked 显示图标，hover 显示名称描述
4. **测试**：每个成就的解锁条件独立测试

### 验收标准

- [ ] 成就网格显示 9 个，locked/unlocked 状态正确
- [ ] 解锁瞬间 UI 更新
- [ ] 刷新页面：成就状态从 localStorage 恢复
- [ ] `npm test` 全通过

---

## Phase 3：皮肤系统

### 改动范围

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/components/SnakeGame/types.ts` | 修改 | 新增 SkinId、Skin 类型 |
| `src/components/SnakeGame/SnakeGame.tsx` | 修改 | CSS 变量实现皮肤切换 |
| `src/components/SnakeGame/__tests__/skins.test.ts` | 新增 | 测试皮肤切换逻辑 |

### 皮肤数据（5个）

| ID | 名称 | 解锁条件 |
|----|------|----------|
| `default` | 经典绿 | 默认解锁 |
| `neon` | 霓虹夜 | 默认解锁 |
| `pixel` | 像素复古 | 默认解锁 |
| `candy` | 糖果风 | 达成所有成就解锁 |
| `mario` | 马里奥 | 达成所有成就解锁 |

### 实现步骤

1. **types.ts**：定义 `SKINS` 常量数组，包含所有颜色配置
2. **useSnakeGame.ts**：
   - 初始化时从 localStorage 读取 `selectedSkin`
   - 提供 `setSkin(skinId)` 方法
3. **SnakeGame.tsx**：
   - CSS 变量（`--snake-head`、`--snake-body`、`--food-color`、`--board-bg`）挂在根元素
   - 皮肤切换时更新 CSS 变量
   - 未解锁皮肤显示锁定状态，点击提示"达成所有成就解锁"

### 验收标准

- [ ] 默认皮肤（经典绿）正确应用
- [ ] 切换皮肤：蛇头/蛇身/食物/棋盘颜色实时变化
- [ ] 锁定皮肤不可选，显示锁定图标
- [ ] 达成所有成就后，candy 和 mario 自动解锁
- [ ] 刷新页面：选中皮肤从 localStorage 恢复
- [ ] `npm test` 全通过

---

## Phase 4：音效与震动

### 改动范围

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/components/SnakeGame/useSnakeGame.ts` | 修改 | 调用音效函数 |
| `src/components/SnakeGame/audio.ts` | 新增 | Web Audio API 音效生成器 |

### 实现步骤

1. **audio.ts**：
   - `playEat()`：上升音调（440Hz→880Hz，100ms）
   - `playDie()`：下沉音调（400Hz→100Hz，300ms）
   - `playNewRecord()`：胜利旋律（C5-E5-G5-C6，500ms）
   - `playAchievement()`：叮咚提示（660Hz + 880Hz，160ms）
   - `playClick()`：按键反馈（200Hz，20ms）
   - `vibrate()`：调用 `navigator.vibrate(30)`
2. **useSnakeGame.ts**：
   - 吃食物：调用 `playEat()` + `vibrate()`
   - 死亡：调用 `playDie()`
   - 新纪录：调用 `playNewRecord()`
   - 成就解锁：调用 `playAchievement()`

### 验收标准

- [ ] 吃食物：听到上升音调
- [ ] 死亡：听到下沉音调
- [ ] 新纪录：听到胜利旋律
- [ ] 移动端：震动反馈
- [ ] 设置中可关闭音效（toggle 开关）

---

## Phase 5：局域网双人对战

### 改动范围

| 文件 | 动作 | 说明 |
|------|------|------|
| 新增 multiplayer/ | 目录 | WebSocket 通信层 |
| `src/components/SnakeGame/useSnakeGame.ts` | 大改 | 扩展支持双人模式 |
| `src/components/SnakeGame/SnakeGame.tsx` | 大改 | 扩展 UI 支持 |

### 架构

- **技术选型**：`ws` npm 包 或 WebSocket native API
- **连接方式**：Servo（无需额外部署）或 WebSocket 公共测试服务器
- **房间码**：4 位数字，创建房间方生成，加入方输入
- **同步内容**：每次 tick 后广播：对方蛇头坐标、方向、得分
- **冲突处理**：同一食物被两蛇同时到达，距食物近的优先

### 实现步骤（概要）

1. 房间创建/加入 UI（输入框 + 房间码显示）
2. WebSocket 连接管理（连接/断开/重连）
3. 状态同步协议定义
4. 双人渲染（自己的蛇 + 对方蛇头位置）

### 验收标准

- [ ] 创建房间：生成 4 位码
- [ ] 加入房间：输入 4 位码连接成功
- [ ] 双向游戏状态同步
- [ ] 其中一人死亡：游戏结束，显示胜负

---

## 技术债务与清理

- [ ] 删除本地 localtunnel/Servo 临时隧道进程
- [ ] Git commit 所有设计文档：`docs/prototypes/` 提交
- [ ] 确认 Next.js 开发服务器仍在 localhost:3000 运行
- [ ] 原型页面移除调试代码（如 console.log、测试数据）

---

## 文件最终目录结构

```
docs/prototypes/v1.0-snake-enhanced/
├── SPEC.md              ← 功能规格（设计文档）
└── index.html           ← 交互原型（已验证）

src/components/SnakeGame/
├── types.ts             ← 核心类型（含增强功能类型）
├── gridHelpers.ts       ← 纯函数（不变）
├── advanceGame.ts        ← 纯函数（不变）
├── useSnakeGame.ts       ← Hook（增强功能核心）
├── SnakeGame.tsx        ← UI 组件（增强功能 UI）
├── audio.ts             ← 音效模块（新增）
├── __tests__/
│   ├── advanceGame.test.ts
│   ├── gridHelpers.test.ts
│   ├── highScore.test.ts      ← 新增
│   ├── achievements.test.ts     ← 新增
│   └── skins.test.ts          ← 新增
```

---

*本实施计划为贪吃蛇增强版的完整开发路线图，按优先级排序。*
