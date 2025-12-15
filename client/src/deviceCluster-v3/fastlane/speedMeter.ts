/**
 * Speed Meter
 * 転送速度測定
 */

export interface SpeedMeasurement {
  bytesPerSecond: number;
  megabitsPerSecond: number;
  timestamp: number;
}

const speedHistory: SpeedMeasurement[] = [];
const MAX_HISTORY = 100;

/**
 * 速度を記録
 */
export function recordSpeed(bytes: number, durationMs: number): SpeedMeasurement {
  const bytesPerSecond = (bytes / durationMs) * 1000;
  const megabitsPerSecond = (bytesPerSecond * 8) / (1024 * 1024);

  const measurement: SpeedMeasurement = {
    bytesPerSecond,
    megabitsPerSecond,
    timestamp: Date.now(),
  };

  speedHistory.push(measurement);
  if (speedHistory.length > MAX_HISTORY) {
    speedHistory.shift();
  }

  return measurement;
}

/**
 * 平均速度を取得
 */
export function getAverageSpeed(durationMs: number = 5000): SpeedMeasurement | null {
  const now = Date.now();
  const recentMeasurements = speedHistory.filter(m => now - m.timestamp <= durationMs);

  if (recentMeasurements.length === 0) {
    return null;
  }

  const avgBytesPerSecond = recentMeasurements.reduce((sum, m) => sum + m.bytesPerSecond, 0) / recentMeasurements.length;
  const avgMegabitsPerSecond = recentMeasurements.reduce((sum, m) => sum + m.megabitsPerSecond, 0) / recentMeasurements.length;

  return {
    bytesPerSecond: avgBytesPerSecond,
    megabitsPerSecond: avgMegabitsPerSecond,
    timestamp: now,
  };
}

/**
 * 最大速度を取得
 */
export function getMaxSpeed(): SpeedMeasurement | null {
  if (speedHistory.length === 0) {
    return null;
  }

  return speedHistory.reduce((max, m) => 
    m.megabitsPerSecond > max.megabitsPerSecond ? m : max
  );
}

/**
 * 速度履歴をクリア
 */
export function clearSpeedHistory(): void {
  speedHistory.length = 0;
}

