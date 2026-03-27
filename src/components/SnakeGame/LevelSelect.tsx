'use client';

import { useState } from 'react';

import { LEVELS } from './levels';
import type { Level } from './levels';
import type { LevelProgressStore } from './levels';

type Props = {
  progress: LevelProgressStore;
  onSelect: (levelId: number) => void;
  onClose: () => void;
};

export function LevelSelect({ progress, onSelect, onClose }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        background: '#0f172a',
        borderRadius: 28,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(148,163,184,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 0',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎮</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>关卡模式</span>
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
        </div>

        {/* Level list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'grid',
          gap: 8,
        }}>
          {LEVELS.map((level) => {
            const isUnlocked = level.id <= progress.unlockedLevelId;
            const isCompleted = progress.completedLevels.includes(level.id);
            const isSelected = selectedLevel?.id === level.id;

            return (
              <button
                key={level.id}
                onClick={() => {
                  if (isUnlocked) setSelectedLevel(level);
                }}
                disabled={!isUnlocked}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: isSelected
                    ? 'rgba(34,197,94,0.15)'
                    : isCompleted
                    ? 'rgba(34,197,94,0.08)'
                    : isUnlocked
                    ? 'rgba(30,41,59,0.9)'
                    : 'rgba(15,23,42,0.6)',
                  border: isSelected
                    ? '1.5px solid rgba(34,197,94,0.5)'
                    : isCompleted
                    ? '1px solid rgba(34,197,94,0.2)'
                    : '1px solid rgba(148,163,184,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  opacity: isUnlocked ? 1 : 0.5,
                  textAlign: 'left',
                }}
              >
                {/* Level number badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isCompleted
                    ? 'linear-gradient(135deg, #22c55e, #15803d)'
                    : isUnlocked
                    ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                    : '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff',
                  flexShrink: 0,
                }}>
                  {isCompleted ? '✅' : level.id}
                </div>

                {/* Level info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: isUnlocked ? '#f8fafc' : '#666',
                    marginBottom: 2,
                  }}>
                    {level.name}
                  </div>
                  <div style={{
                    fontSize: 11, color: '#64748b',
                    display: 'flex', gap: 8,
                  }}>
                    <span>🎯 {level.targetScore}分</span>
                    <span>⚡ {level.tickMs}ms</span>
                  </div>
                </div>

                {/* Status */}
                <div style={{ flexShrink: 0 }}>
                  {!isUnlocked && (
                    <span style={{ fontSize: 16 }}>🔒</span>
                  )}
                  {isUnlocked && !isCompleted && (
                    <span style={{ fontSize: 14, color: '#fbbf24' }}>▶</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {selectedLevel && (
          <div style={{
            padding: '0 16px 16px',
            flexShrink: 0,
            display: 'grid',
            gap: 10,
          }}>
            {/* Selected level info */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(30,41,59,0.8)',
              border: '1px solid rgba(148,163,184,0.15)',
              display: 'grid',
              gap: 6,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                {selectedLevel.name}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {selectedLevel.description}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                <span>🎯 目标 {selectedLevel.targetScore} 分</span>
                <span>⚡ 速度 {selectedLevel.tickMs}ms</span>
              </div>
            </div>

            <button
              onClick={() => {
                onSelect(selectedLevel.id);
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none',
                color: '#1c1917',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              开始挑战
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
