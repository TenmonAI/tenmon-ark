/**
 * Edge Transition
 * カーソルが境界を超えた時に next device に渡す処理
 */

export interface EdgeTransition {
  fromDeviceId: string;
  toDeviceId: string;
  direction: 'left' | 'right' | 'up' | 'down';
  position: { x: number; y: number };
}

/**
 * 境界を超えたデバイスを検出（stub）
 * TODO: 実装
 */
export function detectEdgeTransition(
  deviceId: string,
  localX: number,
  localY: number,
  deviceWidth: number,
  deviceHeight: number
): EdgeTransition | null {
  // TODO: 境界を超えたデバイスを検出するロジックを実装
  return null;
}

/**
 * 次のデバイスにカーソルを渡す（stub）
 * TODO: 実装
 */
export async function transferCursor(transition: EdgeTransition): Promise<void> {
  // TODO: カーソルを次のデバイスに渡すロジックを実装
}

