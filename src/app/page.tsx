'use client';

import { useState, useCallback } from 'react';
import debounce from '../utils/debounce';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [logs, setLogs] = useState([]);
  const [clickCount, setClickCount] = useState(0);

  // 防抖搜索示例
  const handleSearch = useCallback(
    debounce((value) => {
      setLogs((prev) => [...prev, `搜索: ${value}`]);
    }, 500),
    []
  );

  // 防抖点击示例
  const handleClick = useCallback(
    debounce(
      () => {
        setLogs((prev) => [...prev, `点击事件触发 (${clickCount + 1})`]);
        setClickCount((c) => c + 1);
      },
      1000,
      { leading: true }
    ),
    [clickCount]
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    handleSearch(value);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Debounce 防抖示例</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>1. 输入框防抖</h2>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="输入文字后等待500ms触发..."
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
          }}
        />
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          停止输入 500ms 后才会触发"搜索"
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. 按钮防抖 (leading)</h2>
        <button
          onClick={handleClick}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          点击我 (1秒内只能触发一次)
        </button>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          首次点击立即触发，后续点击需等待1秒
        </p>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>事件日志</h2>
          <button onClick={clearLogs} style={{ padding: '0.25rem 0.5rem' }}>
            清空
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {logs.map((log, i) => (
            <li
              key={i}
              style={{
                padding: '0.5rem',
                borderBottom: '1px solid #eee',
                fontFamily: 'monospace',
              }}
            >
              {log}
            </li>
          ))}
          {logs.length === 0 && <li style={{ color: '#999' }}>暂无日志</li>}
        </ul>
      </section>
    </div>
  );
}
