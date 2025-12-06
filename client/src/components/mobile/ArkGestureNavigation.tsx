/**
 * TENMON-ARK Gesture Navigation
 * スワイプ操作統合コンポーネント
 * 
 * GPT超えのジェスチャーナビゲーション
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { GestureEngine, GestureEvent } from '@/lib/mobile/gestureEngine';
import { triggerHapticWithSettings } from '@/lib/mobile/haptics';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobile/alphaFlow';

interface ArkGestureNavigationProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enableBackGesture?: boolean; // 左右スワイプで履歴の戻り/進み
  enableMenuGesture?: boolean; // 上スワイプでメニュー表示
  className?: string;
}

export default function ArkGestureNavigation({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  enableBackGesture = true,
  enableMenuGesture = true,
  className = '',
}: ArkGestureNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureEngineRef = useRef<GestureEngine | null>(null);
  const [, setLocation] = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // ジェスチャーエンジン初期化
    const engine = new GestureEngine(containerRef.current);
    gestureEngineRef.current = engine;

    // 左スワイプ（履歴の進み）
    engine.on('swipe-left', (event: GestureEvent) => {
      if (enableBackGesture) {
        triggerHapticWithSettings('transition');
        window.history.forward();
      }
      onSwipeLeft?.();
    });

    // 右スワイプ（履歴の戻り）
    engine.on('swipe-right', (event: GestureEvent) => {
      if (enableBackGesture) {
        triggerHapticWithSettings('transition');
        window.history.back();
      }
      onSwipeRight?.();
    });

    // 上スワイプ（メニュー表示）
    engine.on('swipe-up', (event: GestureEvent) => {
      if (enableMenuGesture) {
        triggerHapticWithSettings('transition');
        setShowMenu(true);
      }
      onSwipeUp?.();
    });

    // 下スワイプ（メニュー非表示）
    engine.on('swipe-down', (event: GestureEvent) => {
      if (enableMenuGesture && showMenu) {
        triggerHapticWithSettings('transition');
        setShowMenu(false);
      }
      onSwipeDown?.();
    });

    return () => {
      engine.destroy();
    };
  }, [enableBackGesture, enableMenuGesture, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, showMenu]);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative w-full h-full ${className}`}
        style={{
          touchAction: 'pan-y', // 垂直スクロールを許可、水平スワイプを制御
        }}
      >
        {children}
      </div>

      {/* スワイプバックゾーン（画面端） */}
      {enableBackGesture && (
        <div className="swipe-back-zone" />
      )}

      {/* ミナカから湧き出るメニュードロワー */}
      {enableMenuGesture && (
        <MinakaMenuDrawer
          isOpen={showMenu}
          onClose={() => {
            triggerHapticWithSettings('transition');
            setShowMenu(false);
          }}
        />
      )}
    </>
  );
}

/**
 * ミナカから湧き出るメニュードロワー
 */
interface MinakaMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function MinakaMenuDrawer({ isOpen, onClose }: MinakaMenuDrawerProps) {
  const [, setLocation] = useLocation();

  const menuItems = [
    { label: '🏠 ホーム', path: '/' },
    { label: '💬 チャット', path: '/chat' },
    { label: '🌐 ブラウザ', path: '/ark/browser' },
    { label: '🛡️ Guardian', path: '/guardian' },
    { label: '💫 Soul Sync', path: '/soul-sync' },
    { label: '🔮 Fractal OS', path: '/fractal/dashboard' },
    { label: '⚖️ Ethics', path: '/ethics/dashboard' },
    { label: '⚙️ 設定', path: '/settings' },
  ];

  const handleMenuItemClick = (path: string) => {
    triggerHapticWithSettings('tap');
    setLocation(path);
    onClose();
  };

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          style={{
            transition: `opacity ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
            opacity: isOpen ? 1 : 0,
          }}
        />
      )}

      {/* メニュードロワー */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl z-50 safe-area-bottom"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-muted rounded-full" />
        </div>

        {/* メニュー項目 */}
        <div className="px-6 pb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            🌕 TENMON-ARK メニュー
          </h2>
          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => handleMenuItemClick(item.path)}
                className="w-full text-left px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground tap-target intuitive-feedback"
                style={{
                  transition: `all ${ALPHA_TRANSITION_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
