/**
 * TENMON-ARK MobileOS Alpha Flow Engine
 * α波同調遷移速度制御
 * 
 * GPT超えの画面遷移・アニメーション速度最適化
 * 全遷移を0.25s（α波周期の1/4）に統一
 */

/**
 * α波周期（8-13Hz）の平均値 = 10.5Hz = 約95ms
 * 遷移時間 = α波周期 × 2.5 ≈ 250ms
 */
export const ALPHA_TRANSITION_DURATION = 250; // ms

/**
 * α波同調イージング関数
 * 緩やかな開始と終了（α波の波形に近似）
 */
export const ALPHA_EASING = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

/**
 * 遷移タイプ
 */
export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale';

/**
 * 遷移設定
 */
export interface TransitionConfig {
  duration: number; // ms
  easing: string;
  type: TransitionType;
}

/**
 * デフォルト遷移設定
 */
export const DEFAULT_TRANSITION: TransitionConfig = {
  duration: ALPHA_TRANSITION_DURATION,
  easing: ALPHA_EASING,
  type: 'fade',
};

/**
 * 遷移タイプ別の設定
 */
export const TRANSITION_CONFIGS: Record<TransitionType, TransitionConfig> = {
  fade: {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'fade',
  },
  'slide-left': {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'slide-left',
  },
  'slide-right': {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'slide-right',
  },
  'slide-up': {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'slide-up',
  },
  'slide-down': {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'slide-down',
  },
  scale: {
    duration: ALPHA_TRANSITION_DURATION,
    easing: ALPHA_EASING,
    type: 'scale',
  },
};

/**
 * Framer Motion用のバリアント生成
 */
export function createTransitionVariants(type: TransitionType = 'fade') {
  const config = TRANSITION_CONFIGS[type];
  
  const baseTransition = {
    duration: config.duration / 1000, // Framer Motionは秒単位
    ease: [0.4, 0.0, 0.2, 1], // cubic-bezier
  };

  switch (type) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: baseTransition,
      };
    
    case 'slide-left':
      return {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: baseTransition,
      };
    
    case 'slide-right':
      return {
        initial: { x: '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
        transition: baseTransition,
      };
    
    case 'slide-up':
      return {
        initial: { y: '100%', opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '-100%', opacity: 0 },
        transition: baseTransition,
      };
    
    case 'slide-down':
      return {
        initial: { y: '-100%', opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 },
        transition: baseTransition,
      };
    
    case 'scale':
      return {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
        transition: baseTransition,
      };
    
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: baseTransition,
      };
  }
}

/**
 * CSS Transition用のスタイル生成
 */
export function createCSSTransition(type: TransitionType = 'fade'): string {
  const config = TRANSITION_CONFIGS[type];
  return `all ${config.duration}ms ${config.easing}`;
}

/**
 * スクロール慣性強化（iOS 120%）
 * 標準より20%滑らかなスクロール
 */
export interface ScrollConfig {
  friction: number; // 摩擦係数（0-1、低いほど滑らか）
  tension: number; // 張力（0-1、高いほど反発が強い）
  velocity: number; // 初速度倍率（1.0 = 標準、1.2 = 120%）
}

export const ENHANCED_SCROLL_CONFIG: ScrollConfig = {
  friction: 0.8, // 標準より20%低い摩擦
  tension: 0.5,
  velocity: 1.2, // 120%の初速度
};

/**
 * スクロール慣性を強化するためのスタイル
 */
export function getEnhancedScrollStyle(): React.CSSProperties {
  return {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollBehavior: 'smooth',
  };
}

/**
 * タイプライター速度（α波同調）
 * 文字表示速度をα波周期に同調
 */
export const TYPEWRITER_SPEED = 30; // ms per character（約33文字/秒 ≈ α波周期の1/3）

/**
 * タイプライター効果のディレイ計算
 * @param index - 文字のインデックス
 * @returns ディレイ（ms）
 */
export function calculateTypewriterDelay(index: number): number {
  return index * TYPEWRITER_SPEED;
}

/**
 * パーティクル出現タイミング（α波同調）
 */
export const PARTICLE_SPAWN_INTERVAL = 95; // ms（α波周期 ≈ 95ms）

/**
 * パーティクル出現のディレイ計算
 * @param index - パーティクルのインデックス
 * @returns ディレイ（ms）
 */
export function calculateParticleDelay(index: number): number {
  return index * PARTICLE_SPAWN_INTERVAL;
}

/**
 * 緩やかな終了アニメーション（α波調整）
 * スクロール終了時の減速カーブ
 */
export const DECELERATION_CURVE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

/**
 * 減速アニメーション用のバリアント生成
 */
export function createDecelerationVariants() {
  return {
    initial: { y: 0 },
    animate: { y: 0 },
    exit: { y: 0 },
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  };
}

