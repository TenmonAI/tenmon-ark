/**
 * Gesture Bridge
 * タッチジェスチャーを抽象化（後で実装）
 */

export interface GestureEvent {
  type: 'touchstart' | 'touchmove' | 'touchend';
  touches: Array<{
    x: number;
    y: number;
    identifier: number;
  }>;
  deviceId?: string;
}

/**
 * ジェスチャーイベントを送信（stub）
 * TODO: 実装
 */
export async function sendGestureEvent(event: GestureEvent): Promise<void> {
  // TODO: ジェスチャーイベントを server に送信するロジックを実装
}

/**
 * ジェスチャーイベントリスナーを設定（stub）
 * TODO: 実装
 */
export function setupGestureCapture(deviceId?: string): () => void {
  // TODO: タッチイベントを capture するロジックを実装
  return () => {
    // クリーンアップ
  };
}

