# testforopenclaw

一个演示 Next.js 和防抖函数的示例项目。

## 功能

- 展示 `debounce` 防抖函数的使用方法
- 输入框防抖示例
- 按钮防抖示例

## 安装

```bash
npm install
```

## 运行

```bash
npm run dev
```

然后访问 http://localhost:3000

## 使用 debounce

### 基本用法

```javascript
import debounce from './utils/debounce';

const handleSearch = debounce((query) => {
  console.log('搜索:', query);
}, 500);
```

### 选项

```javascript
// 首次立即执行
const handler = debounce(fn, 1000, { leading: true });

// 停止后执行
const handler = debounce(fn, 1000, { trailing: true });

// 两者都启用
const handler = debounce(fn, 1000, { leading: true, trailing: true });
```

### 方法

- `cancel()` - 取消待执行的函数
- `flush()` - 立即执行
- `pending()` - 检查是否有待执行的函数

```javascript
const handler = debounce(fn, 1000);

handler.cancel();   // 取消
handler.flush();   // 立即执行
handler.pending(); // 检查状态
```

## 部署

本项目已关联 GitHub，可以通过 Vercel 部署：

1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 自动部署

## 技术栈

- Next.js 16
- React
- TypeScript
