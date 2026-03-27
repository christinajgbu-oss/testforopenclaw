'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';

import type { DailyChallenge as DailyChallengeType } from './types';

type Props = {
  challenge: DailyChallengeType;
  onStart: () => void;
  onShare: () => void;
};

export function DailyChallengeCard({ challenge, onStart, onShare }: Props) {
  const [showRules, setShowRules] = useState(false);

  const statusText = challenge.completed
    ? '🎉 已完成'
    : '⏳ 进行中';

  const statusColor = challenge.completed ? '#86efac' : '#fbbf24';

  return (
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
      <div style={{ display: 'grid', gap: 4 }}>
        <span
          style={{
            color: '#fbbf24',
            fontSize: 13,
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}
        >
          今日挑战
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          {challenge.date}
        </h2>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>目标分数</span>
          <span
            style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}
          >
            {challenge.targetScore > 0 ? challenge.targetScore : '计算中...'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>你的最佳</span>
          <span
            style={{ color: '#86efac', fontSize: 15, fontWeight: 700 }}
          >
            {challenge.bestScore > 0 ? challenge.bestScore : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>尝试次数</span>
          <span style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700 }}>
            {challenge.attempts}次
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>状态</span>
          <span style={{ color: statusColor, fontSize: 13, fontWeight: 700 }}>
            {statusText}
          </span>
        </div>
      </div>

      {showRules ? (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>
            挑战规则
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            每天生成一个挑战种子，所有玩家面对相同关卡。目标分数由 Monte Carlo 模拟确定。挑战期间可以无限次尝试，每局结束都会更新最佳成绩。
          </div>
          <button
            type="button"
            onClick={() => setShowRules(false)}
            style={secondaryButtonStyle}
          >
            关闭
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onStart}
            style={primaryButtonStyle}
          >
            {challenge.completed ? '再来一局' : '开始挑战'}
          </button>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            style={secondaryButtonStyle}
          >
            查看规则
          </button>
          {challenge.bestScore > 0 && (
            <button
              type="button"
              onClick={onShare}
              style={secondaryButtonStyle}
            >
              分享结果
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type ResultProps = {
  challenge: DailyChallengeType;
  score: number;
  onReplay: () => void;
  onShare: () => void;
  onClose: () => void;
};

export function DailyChallengeResult({
  challenge,
  score,
  onReplay,
  onShare,
  onClose,
}: ResultProps) {
  const hitTarget = score >= challenge.targetScore;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          padding: 28,
          borderRadius: 28,
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          display: 'grid',
          gap: 20,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              fontSize: 48,
              lineHeight: 1,
            }}
          >
            {hitTarget ? '🎉' : '😢'}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#f8fafc',
            }}
          >
            {hitTarget ? '挑战完成！' : '未达标'}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#94a3b8',
            }}
          >
            {challenge.date} · 每日挑战
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.18)',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 12 }}>你的得分</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#86efac',
              }}
            >
              {score}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.18)',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 12 }}>目标分数</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#fbbf24',
              }}
            >
              {challenge.targetScore}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onReplay}
            style={primaryButtonStyle}
          >
            再来一局
          </button>
          <button
            type="button"
            onClick={onShare}
            style={secondaryButtonStyle}
          >
            分享结果
          </button>
          <button
            type="button"
            onClick={onClose}
            style={secondaryButtonStyle}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

type ExpiredProps = {
  date: string;
  bestScore: number;
  targetScore: number;
  onClose: () => void;
};

export function DailyChallengeExpired({
  date,
  bestScore,
  targetScore,
  onClose,
}: ExpiredProps) {
  const hitTarget = bestScore >= targetScore;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          padding: 28,
          borderRadius: 28,
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          display: 'grid',
          gap: 20,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>⏰</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#f8fafc',
            }}
          >
            挑战已结束
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            {date} 每日挑战
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
            {hitTarget ? '🎉 已完成' : '未达标'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>最佳得分</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#86efac',
                }}
              >
                {bestScore}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>目标分数</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fbbf24',
                }}
              >
                {targetScore}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={primaryButtonStyle}
        >
          查看今日挑战
        </button>
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  appearance: 'none',
  border: 'none',
  borderRadius: 16,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #86efac, #22c55e)',
  color: '#052e16',
};

const secondaryButtonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  borderRadius: 16,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  background: 'rgba(30, 41, 59, 0.9)',
  color: '#f8fafc',
};
