/**
 * User Settings Types
 * ユーザー設定の型定義
 */

/**
 * Typing Animation Speed Preset
 * タイピングアニメーション速度プリセット
 */
export type TypingSpeed = "slow" | "normal" | "fast" | "none";

/**
 * Typing Speed Presets (ms per character)
 * タイピング速度プリセット（文字あたりのms）
 */
export const TYPING_SPEED_PRESETS: Record<TypingSpeed, number> = {
  slow: 30,    // 遅い（約33文字/秒）
  normal: 15,  // 普通（約67文字/秒）
  fast: 5,     // 速い（約200文字/秒）
  none: 0,     // なし（即時表示）
};

/**
 * Centerline Mode
 * Centerlineモード（一般ユーザー/専門家）
 */
export type CenterlineMode = "general" | "expert";

/**
 * Haptic Feedback Setting
 * ハプティックフィードバック設定
 */
export type HapticSetting = "enabled" | "disabled";

/**
 * User Settings Interface
 * ユーザー設定インターフェース
 */
export interface UserSettings {
  /** タイピングアニメーション速度 */
  typingSpeed: TypingSpeed;
  
  /** Centerlineモード（一般ユーザー/専門家） */
  centerlineMode: CenterlineMode;
  
  /** ハプティックフィードバック設定 */
  hapticEnabled: boolean;
}

/**
 * Default User Settings
 * デフォルトユーザー設定
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  typingSpeed: "normal",
  centerlineMode: "general",
  hapticEnabled: true,
};

/**
 * Get User Settings from localStorage
 * localStorageからユーザー設定を取得
 */
export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem("userSettings");
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_USER_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("[UserSettings] Failed to load settings:", error);
  }
  return DEFAULT_USER_SETTINGS;
}

/**
 * Save User Settings to localStorage
 * localStorageにユーザー設定を保存
 */
export function saveUserSettings(settings: Partial<UserSettings>): void {
  try {
    const current = getUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("userSettings", JSON.stringify(updated));
  } catch (error) {
    console.error("[UserSettings] Failed to save settings:", error);
  }
}

/**
 * Get Typing Speed in ms
 * タイピング速度をmsで取得
 */
export function getTypingSpeedMs(speed?: TypingSpeed): number {
  const settings = getUserSettings();
  const targetSpeed = speed || settings.typingSpeed;
  return TYPING_SPEED_PRESETS[targetSpeed];
}
