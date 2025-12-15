/**
 * DeviceCluster Manager
 * DeviceCluster v3 の統合管理
 * 安全停止フラグ（safeMode）を含む
 */

import * as deviceRegistry from './registry/deviceRegistry';
import type { DeviceInfo, DeviceClusterSafetyState } from './registry/deviceRegistry';

/**
 * DeviceCluster Manager の状態
 */
export interface ClusterManagerState {
  isActive: boolean;
  safeMode: boolean; // 安全モード（安全停止フラグ）
  deviceCount: number;
  lastHealthCheck: string | null;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

// クラスタマネージャーの状態
let clusterState: ClusterManagerState = {
  isActive: true,
  safeMode: false,
  deviceCount: 0,
  lastHealthCheck: null,
  healthStatus: 'healthy',
};

/**
 * 安全モード（safeMode）を有効化
 * すべてのデバイス操作を安全に停止
 * 
 * @param reason 安全モード有効化の理由
 */
export function enableSafeMode(reason?: string): void {
  clusterState.safeMode = true;
  deviceRegistry.setSafeShutdown(reason || 'Safe mode enabled');
  console.log(`[ClusterManager] Safe mode enabled: ${reason || 'Manual activation'}`);
}

/**
 * 安全モード（safeMode）を無効化
 * デバイス操作を再開
 */
export function disableSafeMode(): void {
  clusterState.safeMode = false;
  deviceRegistry.clearSafeShutdown();
  console.log('[ClusterManager] Safe mode disabled');
}

/**
 * 緊急停止を実行
 * 
 * @param reason 緊急停止の理由
 */
export function emergencyStop(reason: string): void {
  clusterState.safeMode = true;
  clusterState.healthStatus = 'critical';
  deviceRegistry.setEmergencyStop(reason);
  console.error(`[ClusterManager] EMERGENCY STOP: ${reason}`);
}

/**
 * クラスタの状態を取得
 */
export function getClusterState(): ClusterManagerState {
  const devices = deviceRegistry.list();
  const safetyState = deviceRegistry.getSafetyState();
  
  return {
    ...clusterState,
    deviceCount: devices.length,
    safeMode: safetyState.isSafeShutdown,
    lastHealthCheck: new Date().toISOString(),
  };
}

/**
 * ヘルスチェックを実行
 * デバイスの状態を確認し、クラスタの健全性を評価
 */
export function performHealthCheck(): {
  healthy: boolean;
  issues: string[];
  deviceStatuses: Array<{ id: string; name: string; status: 'online' | 'offline' | 'error' }>;
} {
  const devices = deviceRegistry.list();
  const safetyState = deviceRegistry.getSafetyState();
  const issues: string[] = [];
  const deviceStatuses: Array<{ id: string; name: string; status: 'online' | 'offline' | 'error' }> = [];

  // 安全停止状態のチェック
  if (safetyState.isSafeShutdown) {
    issues.push(`Safe shutdown active: ${safetyState.shutdownReason || 'Unknown reason'}`);
  }

  if (safetyState.emergencyStop) {
    issues.push(`EMERGENCY STOP active: ${safetyState.emergencyReason || 'Unknown reason'}`);
    clusterState.healthStatus = 'critical';
  }

  // デバイスの状態をチェック
  const now = Date.now();
  for (const device of devices) {
    const lastSeen = new Date(device.lastSeen).getTime();
    const timeSinceLastSeen = now - lastSeen;
    
    // 30秒以上応答がない場合はオフラインとみなす
    if (timeSinceLastSeen > 30000) {
      deviceStatuses.push({
        id: device.id,
        name: device.name,
        status: 'offline',
      });
      issues.push(`Device ${device.name} (${device.id}) is offline`);
    } else {
      deviceStatuses.push({
        id: device.id,
        name: device.name,
        status: 'online',
      });
    }
  }

  // ヘルスステータスを更新
  if (issues.length === 0) {
    clusterState.healthStatus = 'healthy';
  } else if (safetyState.emergencyStop) {
    clusterState.healthStatus = 'critical';
  } else {
    clusterState.healthStatus = 'degraded';
  }

  clusterState.lastHealthCheck = new Date().toISOString();

  return {
    healthy: issues.length === 0 && !safetyState.isSafeShutdown,
    issues,
    deviceStatuses,
  };
}

/**
 * クラスタを起動
 */
export function startCluster(): void {
  clusterState.isActive = true;
  clusterState.safeMode = false;
  deviceRegistry.clearSafeShutdown();
  console.log('[ClusterManager] Cluster started');
}

/**
 * クラスタを停止（安全停止）
 */
export function stopCluster(reason?: string): void {
  enableSafeMode(reason || 'Manual cluster stop');
  clusterState.isActive = false;
  console.log(`[ClusterManager] Cluster stopped: ${reason || 'Manual stop'}`);
}

/**
 * デバイスを登録（安全モードチェック付き）
 */
export function registerDevice(device: DeviceInfo): void {
  if (clusterState.safeMode) {
    throw new Error('Cannot register device: Safe mode is active');
  }
  deviceRegistry.register(device);
  clusterState.deviceCount = deviceRegistry.list().length;
}

/**
 * デバイスを削除（安全モードチェック付き）
 */
export function removeDevice(deviceId: string): void {
  if (clusterState.safeMode) {
    throw new Error('Cannot remove device: Safe mode is active');
  }
  deviceRegistry.remove(deviceId);
  clusterState.deviceCount = deviceRegistry.list().length;
}

/**
 * デバイス情報を更新（安全モードチェック付き）
 */
export function updateDevice(deviceId: string, updates: Partial<DeviceInfo>): void {
  if (clusterState.safeMode) {
    throw new Error('Cannot update device: Safe mode is active');
  }
  deviceRegistry.update(deviceId, updates);
}

/**
 * デバイス一覧を取得
 */
export function listDevices(): DeviceInfo[] {
  return deviceRegistry.list();
}

/**
 * デバイスを取得
 */
export function getDevice(deviceId: string): DeviceInfo | undefined {
  return deviceRegistry.get(deviceId);
}

/**
 * 安全停止状態を取得
 */
export function getSafetyState(): DeviceClusterSafetyState {
  return deviceRegistry.getSafetyState();
}

