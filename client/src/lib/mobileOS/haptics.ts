/**
 * TENMON-ARK MobileOS Haptics Engine
 * α波バイブレーション（低周波の微振動）
 * 
 * GPT超えのタッチフィードバック
 */

export type HapticPattern = 'tap' | 'transition' | 'send' | 'success' | 'error' | 'water' | 'fire';

/**
 * α波同調振動パターン（8-13Hz相当の触覚フィードバック）
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  // タップ（軽い確認）
  tap: [10],
  
  // 画面遷移（柔らかい変化）
  transition: [15, 10, 15],
  
  // 送信完了（明確な完了感）
  send: [20, 15, 10],
  
  // 成功（心地よい達成感）
  success: [10, 5, 10, 5, 20],
  
  // エラー（注意喚起）
  error: [30, 10, 30],
  
  // 水（受容）- 柔らかく波打つ
  water: [8, 5, 8, 5, 8, 5, 12],
  
  // 火（外発）- 鮮やかで力強い
  fire: [25, 10, 25, 10, 30],
};

/**
 * Vibration APIが利用可能かチェック
 */
function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * ハプティックフィードバックを実行
 * @param pattern - 振動パターン
 * @param intensity - 強度（0-1、デフォルト1）
 */
export function triggerHaptic(pattern: HapticPattern, intensity: number = 1): void {
  if (!isVibrationSupported()) {
    return;
  }

  const vibrationPattern = HAPTIC_PATTERNS[pattern];
  if (!vibrationPattern) {
    console.warn(`[Haptics] Unknown pattern: ${pattern}`);
    return;
  }

  // 強度を適用
  const adjustedPattern = vibrationPattern.map(duration => Math.round(duration * intensity));

  try {
    navigator.vibrate(adjustedPattern);
  } catch (error) {
    console.error('[Haptics] Vibration failed:', error);
  }
}

/**
 * Twin-Core状態に応じたハプティックフィードバック
 * @param fireWaterBalance - 火水バランス（-1: 水優位, 0: 中庸, 1: 火優位）
 */
export function triggerTwinCoreHaptic(fireWaterBalance: number): void {
  if (fireWaterBalance < -0.3) {
    // 水優位
    triggerHaptic('water', 0.8);
  } else if (fireWaterBalance > 0.3) {
    // 火優位
    triggerHaptic('fire', 0.9);
  } else {
    // 中庸
    triggerHaptic('tap', 0.7);
  }
}

/**
 * カスタムハプティックパターンを実行
 * @param pattern - 振動パターン（ミリ秒の配列）
 */
export function triggerCustomHaptic(pattern: number[]): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('[Haptics] Custom vibration failed:', error);
  }
}

/**
 * すべての振動を停止
 */
export function stopHaptic(): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch (error) {
    console.error('[Haptics] Stop vibration failed:', error);
  }
}

/**
 * ハプティックフィードバック設定
 */
export interface HapticSettings {
  enabled: boolean;
  intensity: number; // 0-1
}

/**
 * ハプティックフィードバック設定を取得
 */
export function getHapticSettings(): HapticSettings {
  const stored = localStorage.getItem('ark-haptic-settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // フォールバック
    }
  }
  
  return {
    enabled: true,
    intensity: 1.0,
  };
}

/**
 * ハプティックフィードバック設定を保存
 */
export function saveHapticSettings(settings: HapticSettings): void {
  localStorage.setItem('ark-haptic-settings', JSON.stringify(settings));
}

/**
 * 設定を考慮したハプティックフィードバック実行
 */
export function triggerHapticWithSettings(pattern: HapticPattern): void {
  const settings = getHapticSettings();
  if (!settings.enabled) {
    return;
  }
  
  triggerHaptic(pattern, settings.intensity);
}

