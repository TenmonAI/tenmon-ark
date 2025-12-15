/**
 * TENMON-ARK Header Navigation
 * グローバルナビ（Chat / Browser 2本統一）
 * 
 * Chat-First Navigation v1.0
 */

import { MessageCircle, Globe } from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { triggerHapticWithSettings } from '@/lib/mobileOS/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

export default function HeaderNavigation() {
  const [location, setLocation] = useLocation();
  // React Error #185予防: isVisibleを明示的にtrueで初期化
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isChat = location.startsWith('/chat');
  const isBrowser = location.startsWith('/ark/browser');

  // スクロール時にヘッダーを隠す機能
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 下にスクロール：隠す
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      }
      // 上にスクロール：表示
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNavigate = (path: string) => {
    triggerHapticWithSettings('tap');
    setLocation(path);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border safe-area-top z-40"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: `transform ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
      }}
    >
      <div className="flex w-full" style={{ paddingLeft: '12px', paddingRight: '12px', maxWidth: '100%', minWidth: 0 }}>
        {/* チャットタブ */}
        <button
          onClick={() => handleNavigate('/chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-4 tap-target intuitive-feedback ${
            isChat
              ? 'bg-primary/20 border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{
            transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            minHeight: '56px',
          }}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-base" style={{ whiteSpace: 'nowrap' }}>🌀 チャット</span>
        </button>

        {/* ブラウザタブ */}
        <button
          onClick={() => handleNavigate('/ark/browser')}
          className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-4 tap-target intuitive-feedback ${
            isBrowser
              ? 'bg-primary/20 border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{
            transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            minHeight: '56px',
          }}
        >
          <Globe className="w-5 h-5" />
          <span className="font-semibold text-base" style={{ whiteSpace: 'nowrap' }}>🌐 ブラウザー</span>
        </button>
      </div>
    </div>
  );
}
