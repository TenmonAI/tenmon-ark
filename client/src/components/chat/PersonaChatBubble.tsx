/**
 * Persona Chat Bubble Component
 * Personaに応じた色・背景・枠線を適用したチャットバブル
 */

import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';
import { getPersonaConfig, type PersonaType } from '@/lib/atlas/personaDetector';
import { ReactNode } from 'react';

interface PersonaChatBubbleProps {
  persona: PersonaType;
  role: 'user' | 'assistant';
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PersonaChatBubble({
  persona,
  role,
  children,
  className = '',
  style = {},
}: PersonaChatBubbleProps) {
  const config = getPersonaConfig(persona);

  // ユーザーメッセージは通常のスタイル
  if (role === 'user') {
    return (
      <div
        className={`chatgpt-message chatgpt-message-user ${className}`}
        style={style}
      >
        <div className="chatgpt-message-content">{children}</div>
      </div>
    );
  }

  // アシスタントメッセージはpersonaに応じた色を適用
  // alphaFlow同期の立体ambient shadowを追加
  return (
    <div
      className={`chatgpt-message chatgpt-message-assistant ${className}`}
      style={{
        ...style,
        animation: `personaFadeIn ${ALPHA_TRANSITION_DURATION}ms ease-out both`,
        position: 'relative',
      }}
    >
      {/* Ambient Shadow（alphaFlow同期） */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 100%, rgba(0,0,0,0.1) 0%, transparent 70%)`,
          filter: 'blur(8px)',
          transform: 'translateY(2px)',
          opacity: 0.6,
          transition: `opacity ${ALPHA_TRANSITION_DURATION}ms ease-out`,
          zIndex: -1,
        }}
      />
      <div
        className="chatgpt-message-content relative"
        style={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: `1px solid ${config.borderColor}`,
          boxShadow: `0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)`,
          transition: `all ${ALPHA_TRANSITION_DURATION}ms ease-out`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

