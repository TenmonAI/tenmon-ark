/**
 * TENMON-ARK Smart Back Button
 * 画面下部中央常駐の戻るボタン
 * 
 * GPT超えの片手操作完全対応
 */

import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { triggerHapticWithSettings } from '@/lib/mobileOS/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

interface SmartBackButtonProps {
  onBack?: () => void;
  className?: string;
}

export default function SmartBackButton({ onBack, className = '' }: SmartBackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    triggerHapticWithSettings('transition');
    
    if (onBack) {
      onBack();
    } else {
      // デフォルトの戻る動作
      window.history.back();
    }
  };

  return (
    <div className={`mobile-nav-bottom ${className}`}>
      <button
        onClick={handleBack}
        className="mobile-back-button tap-target"
        aria-label="戻る"
        style={{
          transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
        }}
      >
        <ArrowLeft className="w-6 h-6 text-primary" />
      </button>
    </div>
  );
}

/**
 * ミナカ中心構造の戻るボタン
 * 中央に配置され、放射状のナビゲーションの一部として機能
 */
interface MinakaBackButtonProps {
  onBack?: () => void;
  className?: string;
}

export function MinakaBackButton({ onBack, className = '' }: MinakaBackButtonProps) {
  const handleBack = () => {
    triggerHapticWithSettings('transition');
    
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className={`minaka-center ${className}`}>
      <div className="minaka-center-core">
        <button
          onClick={handleBack}
          className="tap-target"
          aria-label="戻る"
          style={{
            transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
          }}
        >
          <ArrowLeft className="w-8 h-8 text-primary" />
        </button>
      </div>
    </div>
  );
}
