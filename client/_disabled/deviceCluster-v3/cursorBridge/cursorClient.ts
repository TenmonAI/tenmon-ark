/**
 * Cursor Bridge Client
 * カーソル操作をサーバーに送信
 */

export interface CursorMoveEvent {
  x: number;
  y: number;
  deviceId?: string;
}

export interface CursorClickEvent {
  button: 'left' | 'right' | 'middle';
  x: number;
  y: number;
  deviceId?: string;
}

/**
 * カーソルを移動
 */
export async function move(x: number, y: number, deviceId?: string): Promise<void> {
  try {
    const response = await fetch('/api/deviceCluster-v3/cursor/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ x, y, deviceId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Cursor Bridge] Error:', error);
    throw error;
  }
}

/**
 * クリックを実行
 */
export async function click(button: 'left' | 'right' | 'middle', x: number, y: number, deviceId?: string): Promise<void> {
  try {
    const response = await fetch('/api/deviceCluster-v3/cursor/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ button, x, y, deviceId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Cursor Bridge] Error:', error);
    throw error;
  }
}

