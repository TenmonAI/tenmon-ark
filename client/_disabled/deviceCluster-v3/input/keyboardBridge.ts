/**
 * Keyboard Bridge
 * キーボード入力を capture し server に送信
 */

export interface KeyboardEvent {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  deviceId?: string;
}

/**
 * キーボードイベントを capture し server に送信
 */
export async function sendKeyboardEvent(event: KeyboardEvent): Promise<void> {
  try {
    const response = await fetch('/api/deviceCluster-v3/cursor/keyboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Keyboard Bridge] Error:', error);
    throw error;
  }
}

/**
 * キーボードイベントリスナーを設定
 */
export function setupKeyboardCapture(deviceId?: string): () => void {
  const handler = (e: KeyboardEvent) => {
    sendKeyboardEvent({
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      deviceId,
    }).catch(console.error);
  };

  window.addEventListener('keydown', handler);
  window.addEventListener('keyup', handler);

  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener('keydown', handler);
    window.removeEventListener('keyup', handler);
  };
}

