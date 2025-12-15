/**
 * Time Sync
 * Date.now() を正規化する仕組み
 */

let timeOffset = 0; // サーバーとの時間差（ミリ秒）

/**
 * サーバー時刻と同期
 */
export async function syncTime(): Promise<void> {
  try {
    const startTime = Date.now();
    const response = await fetch('/api/deviceCluster-v3/sync/ping');
    const endTime = Date.now();
    const roundTripTime = endTime - startTime;

    if (response.ok) {
      const data = await response.json() as { serverTime: number };
      const estimatedServerTime = data.serverTime + (roundTripTime / 2);
      timeOffset = estimatedServerTime - Date.now();
    }
  } catch (error) {
    console.error('[Time Sync] Error:', error);
  }
}

/**
 * 正規化された時刻を取得
 */
export function getNormalizedTime(): number {
  return Date.now() + timeOffset;
}

/**
 * 時間差を取得
 */
export function getTimeOffset(): number {
  return timeOffset;
}

