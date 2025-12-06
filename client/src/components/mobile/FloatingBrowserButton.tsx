/**
 * TENMON-ARK Floating Browser Button
 * 左下ブラウザ浮遊ボタン（常時表示）
 * 
 * Chat-First Navigation v1.0
 */

import { Globe } from 'lucide-react';
import { useLocation } from 'wouter';
import { triggerHapticWithSettings } from '@/lib/mobile/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobile/alphaFlow';

interface FloatingBrowserButtonProps {
  className?: string;
}

export function FloatingBrowserButton({ className = '' }: FloatingBrowserButtonProps) {
  const [location, setLocation] = useLocation();

  // ブラウザページでは非表示
  if (location.startsWith('/ark/browser')) {
    return null;
  }

  const handleClick = () => {
    triggerHapticWithSettings('tap');
    setLocation('/ark/browser');
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-20 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-xl tap-target intuitive-feedback safe-area-bottom z-50 ${className}`}
      style={{
        transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
      }}
      aria-label="ブラウザを開く"
    >
      <div className="flex items-center justify-center w-full h-full">
        <Globe className="w-6 h-6" />
      </div>
      
      {/* ミナカ放射状エフェクト */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent animate-pulse" />
    </button>
  );
}
