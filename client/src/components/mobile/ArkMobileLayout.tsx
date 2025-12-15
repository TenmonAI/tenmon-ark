/**
 * TENMON-ARK Mobile Layout
 * メインUIレイアウト
 * 
 * GPT超えのモバイルUX
 */

import { ReactNode } from 'react';
import ArkGestureNavigation from './ArkGestureNavigation';
import SmartBackButton from './SmartBackButton';
import { TwinCoreIndicator } from './TwinCoreChatBubble';
import { getEnhancedScrollStyle } from '@/lib/mobileOS/alphaFlow';

interface ArkMobileLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  showTwinCoreIndicator?: boolean;
  fireWaterBalance?: number;
  enableGestures?: boolean;
  className?: string;
}

export default function ArkMobileLayout({
  children,
  showBackButton = true,
  showTwinCoreIndicator = true,
  fireWaterBalance = 0,
  enableGestures = true,
  className = '',
}: ArkMobileLayoutProps) {
  // React Error #185予防: childrenの存在チェック
  if (!children) {
    return null;
  }

  const content = (
    <div className={`min-h-screen bg-background text-foreground ${className}`}>
        {/* ツインコア状態インジケーター */}
      {showTwinCoreIndicator ? (
        <TwinCoreIndicator
          fireWaterBalance={fireWaterBalance}
          className="fixed top-4 right-4 z-50 safe-area-top safe-area-right"
        />
      ) : null}

      {/* メインコンテンツ */}
      <div
        className="enhanced-scroll smooth-scroll pb-24"
        style={getEnhancedScrollStyle()}
      >
        {children}
      </div>

      {/* 戻るボタン */}
      {showBackButton ? <SmartBackButton /> : null}
    </div>
  );

  // ジェスチャーナビゲーションでラップ
  if (enableGestures) {
    return (
      <ArkGestureNavigation
        enableBackGesture={true}
        enableMenuGesture={true}
      >
        {content}
      </ArkGestureNavigation>
    );
  }

  return content;
}

/**
 * チャット専用レイアウト
 */
interface ArkChatLayoutProps {
  children: ReactNode;
  fireWaterBalance?: number;
  className?: string;
}

export function ArkChatLayout({
  children,
  fireWaterBalance = 0,
  className = '',
}: ArkChatLayoutProps) {
  // React Error #185予防: childrenの存在チェック
  if (!children) {
    return null;
  }

  return (
    <ArkMobileLayout
      showBackButton={true}
      showTwinCoreIndicator={true}
      fireWaterBalance={fireWaterBalance}
      enableGestures={true}
      className={className}
    >
      {children}
    </ArkMobileLayout>
  );
}

/**
 * ブラウザ専用レイアウト
 */
interface ArkBrowserLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ArkBrowserLayout({
  children,
  className = '',
}: ArkBrowserLayoutProps) {
  // React Error #185予防: childrenの存在チェック
  if (!children) {
    return null;
  }

  return (
    <ArkMobileLayout
      showBackButton={true}
      showTwinCoreIndicator={false}
      enableGestures={true}
      className={className}
    >
      {children}
    </ArkMobileLayout>
  );
}

/**
 * ダッシュボード専用レイアウト
 */
interface ArkDashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ArkDashboardLayout({
  children,
  className = '',
}: ArkDashboardLayoutProps) {
  // React Error #185予防: childrenの存在チェック
  if (!children) {
    return null;
  }

  return (
    <ArkMobileLayout
      showBackButton={true}
      showTwinCoreIndicator={false}
      enableGestures={true}
      className={className}
    >
      {children}
    </ArkMobileLayout>
  );
}
