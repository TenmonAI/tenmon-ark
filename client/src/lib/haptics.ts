/**
 * Mobile-ARK V2: Haptics (触覚フィードバック)
 * - 遷移時の軽微振動
 * - タップ時に低周波
 * - 送信完了時に「風の余韻」
 */

/**
 * Haptics API が利用可能かチェック
 */
export function isHapticsSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * 遷移時の軽微振動（10ms）
 */
export function hapticsTransition(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(10);
}

/**
 * タップ時に低周波（20ms）
 */
export function hapticsTap(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(20);
}

/**
 * 送信完了時に「風の余韻」（パターン振動）
 * [振動, 休止, 振動, 休止, ...]
 */
export function hapticsSendComplete(): void {
  if (!isHapticsSupported()) return;
  // 風の余韻パターン: 短い振動 → 休止 → 短い振動 → 休止
  navigator.vibrate([15, 50, 10, 30, 5]);
}

/**
 * 長押し時の振動（50ms）
 */
export function hapticsLongPress(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(50);
}

/**
 * エラー時の振動（パターン振動）
 */
export function hapticsError(): void {
  if (!isHapticsSupported()) return;
  // エラーパターン: 短い振動 × 2回
  navigator.vibrate([30, 50, 30]);
}

/**
 * 成功時の振動（パターン振動）
 */
export function hapticsSuccess(): void {
  if (!isHapticsSupported()) return;
  // 成功パターン: 短い振動 → 休止 → 長い振動
  navigator.vibrate([10, 30, 20]);
}

/**
 * スワイプ時の振動（5ms）
 */
export function hapticsSwipe(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(5);
}

/**
 * カスタム振動パターン
 * @param pattern 振動パターン（[振動, 休止, 振動, ...]）
 */
export function hapticsCustom(pattern: number | number[]): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(pattern);
}
