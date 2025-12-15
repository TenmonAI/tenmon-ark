/**
 * Latency Map
 * 各デバイスの遅延を記録する
 */

export interface LatencyRecord {
  deviceId: string;
  latency: number; // ミリ秒
  timestamp: number;
}

export interface LatencyProbeResult {
  deviceId: string;
  latency: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

const latencyMap: Map<string, LatencyRecord> = new Map();

/**
 * 遅延を記録
 */
export function recordLatency(deviceId: string, latency: number): void {
  latencyMap.set(deviceId, {
    deviceId,
    latency,
    timestamp: Date.now(),
  });
}

/**
 * 遅延を取得
 */
export function getLatency(deviceId: string): number | null {
  const record = latencyMap.get(deviceId);
  if (!record) {
    return null;
  }

  // 古い記録は無効（5秒以上経過）
  if (Date.now() - record.timestamp > 5000) {
    latencyMap.delete(deviceId);
    return null;
  }

  return record.latency;
}

/**
 * すべての遅延記録を取得
 */
export function getAllLatencies(): LatencyRecord[] {
  return Array.from(latencyMap.values());
}

/**
 * 遅延プローブ（latencyProbe）
 * WebRTC接続の遅延を測定する
 * 
 * @param deviceId デバイスID
 * @param endpoint エンドポイント（オプション、デフォルトは /api/deviceCluster-v3/sync/ping）
 * @returns 遅延測定結果
 */
export async function latencyProbe(
  deviceId: string,
  endpoint?: string
): Promise<LatencyProbeResult> {
  const startTime = performance.now();
  const probeEndpoint = endpoint || '/api/deviceCluster-v3/sync/ping';

  try {
    // ピングリクエストを送信
    const response = await fetch(probeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    // 遅延を記録
    recordLatency(deviceId, latency);

    return {
      deviceId,
      latency,
      success: true,
      timestamp: Date.now(),
    };
  } catch (error) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    return {
      deviceId,
      latency,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

/**
 * 複数デバイスの遅延を一括測定
 * 
 * @param deviceIds デバイスIDの配列
 * @returns 遅延測定結果の配列
 */
export async function latencyProbeBatch(
  deviceIds: string[]
): Promise<LatencyProbeResult[]> {
  const results = await Promise.all(
    deviceIds.map(deviceId => latencyProbe(deviceId))
  );
  return results;
}

/**
 * 平均遅延を計算
 * 
 * @param deviceIds デバイスIDの配列（省略時はすべてのデバイス）
 * @returns 平均遅延（ミリ秒）
 */
export function getAverageLatency(deviceIds?: string[]): number | null {
  const records = deviceIds
    ? deviceIds.map(id => latencyMap.get(id)).filter((r): r is LatencyRecord => r !== undefined)
    : getAllLatencies();

  if (records.length === 0) {
    return null;
  }

  const sum = records.reduce((acc, record) => acc + record.latency, 0);
  return Math.round(sum / records.length);
}

/**
 * 最大遅延を取得
 * 
 * @param deviceIds デバイスIDの配列（省略時はすべてのデバイス）
 * @returns 最大遅延（ミリ秒）
 */
export function getMaxLatency(deviceIds?: string[]): number | null {
  const records = deviceIds
    ? deviceIds.map(id => latencyMap.get(id)).filter((r): r is LatencyRecord => r !== undefined)
    : getAllLatencies();

  if (records.length === 0) {
    return null;
  }

  return Math.max(...records.map(r => r.latency));
}

/**
 * 最小遅延を取得
 * 
 * @param deviceIds デバイスIDの配列（省略時はすべてのデバイス）
 * @returns 最小遅延（ミリ秒）
 */
export function getMinLatency(deviceIds?: string[]): number | null {
  const records = deviceIds
    ? deviceIds.map(id => latencyMap.get(id)).filter((r): r is LatencyRecord => r !== undefined)
    : getAllLatencies();

  if (records.length === 0) {
    return null;
  }

  return Math.min(...records.map(r => r.latency));
}

