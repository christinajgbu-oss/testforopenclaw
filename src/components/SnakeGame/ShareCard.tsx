'use client';

import type { CSSProperties, MouseEvent } from 'react';

import { ACHIEVEMENTS, SKINS } from './types';
import type { ShareCardProps } from './types';

function formatDuration(durationSeconds: number) {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : 0;
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildTweetText(score: number, durationText: string) {
  return `我在贪吃蛇增强版中拿到了 ${score} 分，用时 ${durationText}。testforopenclaw.pages.dev`;
}

export function ShareCard({
  score,
  skinId,
  achievementIds,
  durationSeconds,
  onClose,
  onRestart,
}: ShareCardProps) {
  const activeSkin = SKINS.find((skin) => skin.id === skinId) ?? SKINS[0];
  const visibleAchievements = achievementIds
    .slice(0, 3)
    .map((achievementId) =>
      ACHIEVEMENTS.find((achievement) => achievement.id === achievementId),
    )
    .filter(
      (
        achievement,
      ): achievement is (typeof ACHIEVEMENTS)[number] => achievement !== undefined,
    );
  const durationText = formatDuration(durationSeconds);

  const handleSave = async (event: MouseEvent<HTMLButtonElement>) => {
    const cardNode = event.currentTarget.closest(
      '[data-share-card-root="true"]',
    ) as HTMLElement | null;

    if (!cardNode || typeof document === 'undefined') {
      return;
    }

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(cardNode, {
      backgroundColor: null,
      scale: 2,
    });
    const downloadLink = document.createElement('a');

    downloadLink.download = `snake-share-${activeSkin.id}-${score}.png`;
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.click();
  };

  const handleTwitterShare = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildTweetText(score, durationText))}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shadowColor = `${activeSkin.headColor}4d`;
  const insetShadowColor = `${activeSkin.headColor}14`;
  const cardStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: 600,
    height: 400,
    borderRadius: 20,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    background: activeSkin.bgColor,
    border: `2px solid ${activeSkin.headColor}`,
    boxShadow: `0 0 40px ${shadowColor}, inset 0 0 60px ${insetShadowColor}`,
    color: '#ffffff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  return (
    <div data-share-card-root="true" style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          本局结束
        </span>
        <span
          style={{
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid currentColor',
            color: activeSkin.headColor,
            opacity: 0.8,
          }}
        >
          {activeSkin.name}
        </span>
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '24px 0',
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 8,
          }}
        >
          最 终 得 分
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {score}
          <span
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 4,
            }}
          >
            分
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          minHeight: 34,
        }}
      >
        {visibleAchievements.map((achievement) => (
          <div
            key={achievement.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span style={{ fontSize: 14 }}>{achievement.icon}</span>
            <span>{achievement.name}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        游戏时长 {durationText}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 'auto',
          flexWrap: 'wrap',
        }}
      >
        <button
          data-testid="share-card-restart"
          type="button"
          onClick={onRestart}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'linear-gradient(135deg, #86efac, #22c55e)',
            color: '#052e16',
          }}
        >
          🔄 再来一局
        </button>
        <button
          data-testid="share-card-save"
          type="button"
          onClick={handleSave}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: '#ffffff',
            color: '#111111',
          }}
        >
          💾 保存图片
        </button>
        <button
          data-testid="share-card-twitter"
          type="button"
          onClick={handleTwitterShare}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: '#1DA1F2',
            color: '#ffffff',
          }}
        >
          🐦 分享
        </button>
        <button
          data-testid="share-card-close"
          type="button"
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          关闭
        </button>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        testforopenclaw.pages.dev
      </div>
    </div>
  );
}
