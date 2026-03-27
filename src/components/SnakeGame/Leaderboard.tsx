'use client';

import { useEffect, useState } from 'react';

import type { GlobalLeaderboardData, DailyLeaderboardData } from './types';
import { fetchDailyLeaderboard, fetchGlobalLeaderboard } from './LeaderboardApi';
import { getTodayDateString } from './useSnakeGame';

type Tab = 'global' | 'daily';

function Avatar({ playerId, rank }: { playerId: string; rank: number }) {
  // Generate a consistent color from playerId
  const colors = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635',
    '#34d399', '#22d3ee', '#60a5fa', '#a78bfa',
    '#f472b6', '#e879f9',
  ];
  const colorIndex = playerId.charCodeAt(0) % colors.length;
  const bg = colors[colorIndex];
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  if (medal) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {medal}
      </div>
    );
  }

  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: '#fff', fontWeight: 700,
      flexShrink: 0,
    }}>
      {(playerId.slice(0, 2).toUpperCase())}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  if (medal) {
    return <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{medal}</span>;
  }
  return (
    <span style={{ width: 28, textAlign: 'center', color: '#666', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
      {rank}
    </span>
  );
}

type LeaderboardProps = {
  myScore?: number;
  targetScore?: number;
  onClose: () => void;
};

export function Leaderboard({ myScore, targetScore, onClose }: LeaderboardProps) {
  const [tab, setTab] = useState<Tab>('global');
  const [globalData, setGlobalData] = useState<GlobalLeaderboardData | null>(null);
  const [dailyData, setDailyData] = useState<DailyLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const playerId = globalData?.top100?.[0]?.playerId ?? '';

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [g, d] = await Promise.all([
        fetchGlobalLeaderboard(),
        fetchDailyLeaderboard(getTodayDateString()),
      ]);
      setGlobalData(g);
      setDailyData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function buildList(
    entries: { playerId: string; score: number; rank: number }[],
    myId: string,
    myScoreVal: number | null,
    myRankVal: number | null,
  ): { playerId: string; score: number; rank: number; isMe: boolean }[] | null {
    if (!entries.length && !myScoreVal) return null;

    const myEntry = myScoreVal !== null && myRankVal !== null
      ? { playerId: myId, score: myScoreVal, rank: myRankVal }
      : null;

    if (!myEntry) {
      return entries.map(e => ({ ...e, isMe: e.playerId === myId }));
    }

    const inTop100 = entries.some(e => e.playerId === myEntry.playerId);
    if (inTop100) {
      return entries.map(e => ({ ...e, isMe: e.playerId === myId }));
    }

    // Insert my entry at correct position
    const idx = entries.findIndex(e => e.rank > myEntry.rank);
    const result = entries.map(e => ({ ...e, isMe: e.playerId === myId }));
    const myEntryWithMe = { ...myEntry, isMe: true };
    if (idx === -1) result.push(myEntryWithMe);
    else result.splice(idx, 0, myEntryWithMe);
    return result;
  }

  const today = getTodayDateString();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        maxHeight: '90vh',
        background: '#111128',
        borderRadius: 28,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>排行榜</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: '#666', fontSize: 20,
                cursor: 'pointer', padding: 4,
              }}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#1a1a2e', borderRadius: 12, padding: 4, gap: 4 }}>
            {(['global', 'daily'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: 8,
                  background: tab === t ? '#22c55e' : 'transparent',
                  color: tab === t ? '#fff' : '#666',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'global' ? '🏆 总分榜' : '🎯 今日挑战'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: 14 }}>
              加载中...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, display: 'grid', gap: 12 }}>
              <div style={{ color: '#f87171', fontSize: 14 }}>加载失败，请重试</div>
              <button
                onClick={() => void load()}
                style={{
                  background: '#1e1e3a', border: '1px solid #333',
                  color: '#aaa', borderRadius: 10, padding: '8px 20px',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          ) : tab === 'global' && globalData ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {/* My rank card */}
              {globalData.myRank !== null && (
                <div style={{
                  background: 'linear-gradient(135deg, #1e2a1e, #1a301a)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e, #15803d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: '#fff',
                    }}>
                      {globalData.myRank}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#666' }}>你的排名</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
                        {globalData.myBestScore ?? 0} 分
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#666' }}>历史最佳</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
                      {globalData.myBestScore ?? 0}
                    </div>
                  </div>
                </div>
              )}

              {/* List */}
              {(buildList(globalData.top100, playerId, globalData.myBestScore, globalData.myRank) ?? []).map((entry) => (
                <div
                  key={entry.playerId + entry.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: entry.isMe ? 'rgba(34,197,94,0.1)' : '#1a1a2e',
                    borderRadius: 12,
                    border: entry.isMe ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
                    gap: 10,
                  }}
                >
                  <RankBadge rank={entry.rank} />
                  <Avatar playerId={entry.playerId} rank={entry.rank} />
                  <span style={{
                    flex: 1,
                    fontSize: 14,
                    color: entry.isMe ? '#22c55e' : '#ccc',
                    fontWeight: entry.isMe ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.isMe ? '你' : '匿名玩家'}
                  </span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: entry.isMe ? '#22c55e' : '#f8fafc',
                  }}>
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          ) : tab === 'daily' && dailyData ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {dailyData.myRank !== null && (
                <div style={{
                  background: 'linear-gradient(135deg, #1a2a2e, #1a2a30)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: '#fff',
                    }}>
                      {dailyData.myRank}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#666' }}>今日排名</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
                        {dailyData.myScore ?? 0} 分
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#666' }}>目标</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#06b6d4' }}>
                      {targetScore ?? '—'}
                    </div>
                  </div>
                </div>
              )}

              {(buildList(dailyData.top100, playerId, dailyData.myScore, dailyData.myRank) ?? []).map((entry) => (
                <div
                  key={entry.playerId + entry.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: entry.isMe ? 'rgba(6,182,212,0.1)' : '#1a1a2e',
                    borderRadius: 12,
                    border: entry.isMe ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                    gap: 10,
                  }}
                >
                  <RankBadge rank={entry.rank} />
                  <Avatar playerId={entry.playerId} rank={entry.rank} />
                  <span style={{
                    flex: 1,
                    fontSize: 14,
                    color: entry.isMe ? '#06b6d4' : '#ccc',
                    fontWeight: entry.isMe ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.isMe ? '你' : '匿名玩家'}
                  </span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: entry.isMe ? '#06b6d4' : '#f8fafc',
                  }}>
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: 14 }}>
              暂无数据
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <button
            onClick={() => void load()}
            style={{
              width: '100%',
              background: '#1e1e3a',
              border: '1px solid #333',
              color: '#888',
              padding: '10px',
              borderRadius: 10,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            🔄 刷新
          </button>
        </div>
      </div>
    </div>
  );
}
