/**
 * User-Sync Evolution: ジェスチャー学習
 * - 個々のユーザーのスワイプ速度を記録
 * - その速度にUI慣性を調整して最適化
 */

interface SwipeEvent {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number; // ms
  velocity: number; // px/ms
  timestamp: number;
}

interface GestureProfile {
  averageSwipeVelocity: number;
  preferredInertia: number; // 0-1
  swipeThreshold: number; // px
  gestureStyle: 'slow' | 'medium' | 'fast';
}

const SWIPE_HISTORY_KEY = 'ark_swipe_history';
const GESTURE_PROFILE_KEY = 'ark_gesture_profile';
const MAX_HISTORY_SIZE = 500;

/**
 * スワイプイベントを記録
 */
export function recordSwipe(event: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
}): void {
  const distance = Math.sqrt(
    Math.pow(event.endX - event.startX, 2) + Math.pow(event.endY - event.startY, 2)
  );
  const velocity = distance / event.duration;

  const swipeEvent: SwipeEvent = {
    ...event,
    velocity,
    timestamp: Date.now(),
  };

  const history = getSwipeHistory();
  history.push(swipeEvent);

  // 履歴サイズ制限
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
  }

  localStorage.setItem(SWIPE_HISTORY_KEY, JSON.stringify(history));

  // ジェスチャープロファイル更新
  updateGestureProfile();
}

/**
 * スワイプ履歴を取得
 */
export function getSwipeHistory(): SwipeEvent[] {
  const stored = localStorage.getItem(SWIPE_HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * ジェスチャープロファイルを取得
 */
export function getGestureProfile(): GestureProfile {
  const stored = localStorage.getItem(GESTURE_PROFILE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // デフォルトプロファイル
  return {
    averageSwipeVelocity: 1.0,
    preferredInertia: 0.5,
    swipeThreshold: 50,
    gestureStyle: 'medium',
  };
}

/**
 * ジェスチャープロファイルを更新
 */
function updateGestureProfile(): void {
  const history = getSwipeHistory();

  if (history.length < 10) return; // 最低10回のスワイプが必要

  // 平均スワイプ速度を計算
  const averageVelocity =
    history.reduce((sum, e) => sum + e.velocity, 0) / history.length;

  // ジェスチャースタイルを判定
  let gestureStyle: 'slow' | 'medium' | 'fast';
  if (averageVelocity < 0.5) {
    gestureStyle = 'slow';
  } else if (averageVelocity < 1.5) {
    gestureStyle = 'medium';
  } else {
    gestureStyle = 'fast';
  }

  // 慣性を計算（速いスワイプ → 高い慣性）
  const preferredInertia = Math.min(averageVelocity / 2, 1);

  // スワイプ閾値を計算（速いスワイプ → 高い閾値）
  const swipeThreshold = Math.max(30, Math.min(averageVelocity * 50, 100));

  const profile: GestureProfile = {
    averageSwipeVelocity: averageVelocity,
    preferredInertia,
    swipeThreshold,
    gestureStyle,
  };

  localStorage.setItem(GESTURE_PROFILE_KEY, JSON.stringify(profile));
}

/**
 * UI慣性を取得（0-1）
 */
export function getUIInertia(): number {
  const profile = getGestureProfile();
  return profile.preferredInertia;
}

/**
 * スワイプ閾値を取得（px）
 */
export function getSwipeThreshold(): number {
  const profile = getGestureProfile();
  return profile.swipeThreshold;
}

/**
 * ジェスチャースタイルを取得
 */
export function getGestureStyle(): 'slow' | 'medium' | 'fast' {
  const profile = getGestureProfile();
  return profile.gestureStyle;
}

/**
 * スワイプ履歴をクリア
 */
export function clearSwipeHistory(): void {
  localStorage.removeItem(SWIPE_HISTORY_KEY);
  localStorage.removeItem(GESTURE_PROFILE_KEY);
}

/**
 * スワイプ方向を判定
 */
export function detectSwipeDirection(event: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}): 'left' | 'right' | 'up' | 'down' | 'none' {
  const dx = event.endX - event.startX;
  const dy = event.endY - event.startY;
  const threshold = getSwipeThreshold();

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return 'none';
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}

/**
 * スワイプ統計を取得
 */
export function getSwipeStatistics(): {
  totalSwipes: number;
  averageVelocity: number;
  averageDuration: number;
  gestureStyle: 'slow' | 'medium' | 'fast';
  directionCounts: {
    left: number;
    right: number;
    up: number;
    down: number;
  };
} {
  const history = getSwipeHistory();
  const profile = getGestureProfile();

  const totalSwipes = history.length;
  const averageVelocity = profile.averageSwipeVelocity;
  const averageDuration =
    history.reduce((sum, e) => sum + e.duration, 0) / (totalSwipes || 1);

  const directionCounts = {
    left: 0,
    right: 0,
    up: 0,
    down: 0,
  };

  history.forEach((event) => {
    const direction = detectSwipeDirection(event);
    if (direction !== 'none') {
      directionCounts[direction]++;
    }
  });

  return {
    totalSwipes,
    averageVelocity,
    averageDuration: Math.round(averageDuration),
    gestureStyle: profile.gestureStyle,
    directionCounts,
  };
}

/**
 * CSSトランジション時間を取得（ジェスチャースタイルに基づく）
 */
export function getTransitionDuration(): number {
  const style = getGestureStyle();

  switch (style) {
    case 'slow':
      return 400; // ms
    case 'medium':
      return 250; // ms
    case 'fast':
      return 150; // ms
    default:
      return 250; // ms
  }
}

/**
 * CSS慣性カーブを取得
 */
export function getInertiaCurve(): string {
  const inertia = getUIInertia();

  if (inertia < 0.3) {
    return 'cubic-bezier(0.4, 0, 0.6, 1)'; // 低慣性
  } else if (inertia < 0.7) {
    return 'cubic-bezier(0.4, 0, 0.2, 1)'; // 中慣性
  } else {
    return 'cubic-bezier(0.2, 0, 0.1, 1)'; // 高慣性
  }
}
