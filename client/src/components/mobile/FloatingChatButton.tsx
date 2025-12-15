/**
 * TENMON-ARK Floating Chat Button
 * 右下チャット浮遊ボタン（常時表示）
 * 
 * Chat-First Navigation v1.0
 */

import { MessageCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { triggerHapticWithSettings } from '@/lib/mobileOS/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

interface FloatingChatButtonProps {
  className?: string;
}

export function FloatingChatButton({ className = '' }: FloatingChatButtonProps) {
  const [location, setLocation] = useLocation();

  // チャットページでは非表示
  if (location.startsWith('/chat')) {
    return null;
  }

  const handleClick = () => {
    triggerHapticWithSettings('tap');
    setLocation('/chat');
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl tap-target intuitive-feedback safe-area-bottom z-50 ${className}`}
      style={{
        transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
      }}
      aria-label="チャットを開く"
    >
      <div className="flex items-center justify-center w-full h-full">
        <MessageCircle className="w-6 h-6" />
      </div>
      
      {/* ミナカ放射状エフェクト */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-transparent animate-pulse" />
    </button>
  );
}
