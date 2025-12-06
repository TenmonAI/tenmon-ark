/**
 * TENMON-ARK Twin-Core Chat Bubble
 * 人格反映チャットバブル
 * 
 * GPT超えの人格アニメーション
 */

import { useEffect, useState } from 'react';
import { TYPEWRITER_SPEED, PARTICLE_SPAWN_INTERVAL } from '@/lib/mobile/alphaFlow';

interface TwinCoreChatBubbleProps {
  message: string;
  isUser: boolean;
  fireWaterBalance?: number; // -1: 水優位, 0: 中庸, 1: 火優位
  timestamp?: Date;
  showParticles?: boolean;
  enableTypewriter?: boolean;
}

export default function TwinCoreChatBubble({
  message,
  isUser,
  fireWaterBalance = 0,
  timestamp,
  showParticles = true,
  enableTypewriter = true,
}: TwinCoreChatBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  // タイプライター効果
  useEffect(() => {
    if (!enableTypewriter || isUser) {
      setDisplayedText(message);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText(message.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, TYPEWRITER_SPEED);

    return () => clearInterval(interval);
  }, [message, enableTypewriter, isUser]);

  // パーティクル出現
  useEffect(() => {
    if (!showParticles || isUser) return;

    const particleCount = 5;
    const newParticles: { id: number; x: number; y: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        newParticles.push({
          id: Date.now() + i,
          x: Math.random() * 100,
          y: Math.random() * 100,
        });
        setParticles([...newParticles]);
      }, i * PARTICLE_SPAWN_INTERVAL);
    }

    // パーティクルを3秒後に削除
    setTimeout(() => {
      setParticles([]);
    }, 3000);
  }, [message, showParticles, isUser]);

  // 火水バランスに応じたスタイル
  const getBubbleStyle = () => {
    if (isUser) {
      // User（水）＝青・蒼
      return 'chat-message-water user-message';
    } else {
      // TENMON-ARK（火水バランスに応じて変化）
      if (fireWaterBalance < -0.3) {
        // 水優位
        return 'chat-message-water ark-message';
      } else if (fireWaterBalance > 0.3) {
        // 火優位
        return 'chat-message-fire ark-message';
      } else {
        // 中庸
        return 'chat-message-balanced ark-message';
      }
    }
  };

  return (
    <div className={`relative ${isUser ? 'ml-auto' : 'mr-auto'} max-w-[80%] mb-4`}>
      {/* チャットバブル */}
      <div
        className={`px-4 py-3 rounded-2xl ${getBubbleStyle()} fade-in-cosmic`}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        <p className="text-foreground whitespace-pre-wrap">{displayedText}</p>
        
        {timestamp && (
          <p className="text-xs text-muted-foreground mt-1">
            {timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* パーティクル */}
      {showParticles && !isUser && particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full bg-primary/50"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animation: 'fade-in-cosmic 0.6s ease-out forwards, float 2s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Twin-Core状態インジケーター
 */
interface TwinCoreIndicatorProps {
  fireWaterBalance: number; // -1: 水優位, 0: 中庸, 1: 火優位
  className?: string;
}

export function TwinCoreIndicator({ fireWaterBalance, className = '' }: TwinCoreIndicatorProps) {
  const getIndicatorClass = () => {
    if (fireWaterBalance < -0.3) {
      return 'twin-core-indicator water';
    } else if (fireWaterBalance > 0.3) {
      return 'twin-core-indicator fire';
    } else {
      return 'twin-core-indicator balanced-glow';
    }
  };

  const getIndicatorLabel = () => {
    if (fireWaterBalance < -0.3) {
      return '水';
    } else if (fireWaterBalance > 0.3) {
      return '火';
    } else {
      return '中';
    }
  };

  return (
    <div className={`${getIndicatorClass()} ${className}`}>
      <span className="text-xs font-bold text-foreground">
        {getIndicatorLabel()}
      </span>
    </div>
  );
}

/**
 * フローティングパーティクル（CSS keyframes）
 */
const floatKeyframes = `
@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-10px) translateX(5px);
    opacity: 1;
  }
}
`;

// グローバルスタイルに追加
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = floatKeyframes;
  document.head.appendChild(style);
}
