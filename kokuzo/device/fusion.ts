/**
 * Device Fusion Engine
 * DeviceNode と KZFile / SemanticUnit / FractalSeed を関連付ける
 */

import type { KZFile } from "../storage/osCore";

// DeviceNode の型定義（DeviceCluster-v3から推測）
export interface DeviceNode {
  id: string;
  name: string;
  type: string;
  capabilities?: {
    cpu?: number;
    storage?: number;
    memory?: number;
  };
}

export interface TaskAllocation {
  deviceId: string;
  score: number;
  reason: string;
}

/**
 * タスクを最適なデバイスに割り当て
 */
export function allocateTaskToDevice(
  task: { type: string; size: number },
  devices: DeviceNode[]
): string {
  if (devices.length === 0) {
    throw new Error("No devices available");
  }

  // TODO: qFactor を今後定義
  // 現在は簡易的なスコアリング
  const scored: TaskAllocation[] = devices.map(d => {
    let score = 1.0;
    let reason = "default";
    
    // デバイスの能力に基づいてスコアリング
    if (d.capabilities?.cpu && d.capabilities.cpu > 0) {
      score *= d.capabilities.cpu;
      reason = "CPU capability";
    }
    
    // タスクサイズに応じた調整
    if (task.size > 1000000) { // 1MB以上
      // 大容量タスクは高CPUデバイスを優先
      if (d.capabilities?.cpu && d.capabilities.cpu > 2) {
        score *= 1.5;
        reason = "High CPU for large task";
      }
    }
    
    return {
      deviceId: d.id,
      score,
      reason,
    };
  });
  
  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted[0].deviceId;
}

/**
 * ファイルをデバイスに分散配置
 */
export function distributeFileToDevices(
  file: KZFile,
  devices: DeviceNode[]
): string[] {
  const allocatedDevices: string[] = [];
  
  // ファイルサイズに応じて複数デバイスに分散
  if (file.sizeBytes > 10 * 1024 * 1024) { // 10MB以上
    // 大容量ファイルは複数デバイスに分散
    const sortedDevices = devices
      .map(d => ({ id: d.id, score: d.capabilities?.storage || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, devices.length));
    
    allocatedDevices.push(...sortedDevices.map(d => d.id));
  } else {
    // 小容量ファイルは1デバイスに配置
    const deviceId = allocateTaskToDevice(
      { type: "file", size: file.sizeBytes },
      devices
    );
    allocatedDevices.push(deviceId);
  }
  
  return allocatedDevices;
}

