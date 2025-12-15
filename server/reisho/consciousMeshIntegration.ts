/**
 * ============================================================
 *  CONSCIOUS MESH INTEGRATION — Conscious Mesh 統合
 * ============================================================
 * 
 * すべてのデバイスで Conscious Mesh を有効化
 * DeviceCluster を Conscious Mesh に統合
 * 
 * 機能:
 * - デバイス登録時に自動的に Conscious Mesh に追加
 * - デバイス操作を Conscious Mesh 経由で実行
 * - デバイス間の意識的な接続を管理
 * ============================================================
 */

import { createConsciousMesh, syncConsciousMesh, routeTaskInConsciousMesh, type ConsciousMesh } from "./consciousMesh";
import { getGlobalUniverseOS } from "./universeOSIntegration";
import type { DeviceNode } from "../../kokuzo/device/fusion";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";

/**
 * グローバル Conscious Mesh
 */
let globalConsciousMesh: ConsciousMesh | null = null;

/**
 * すべてのデバイスで Conscious Mesh を有効化
 */
export function enableConsciousMeshForAllDevices(
  devices: DeviceNode[]
): ConsciousMesh {
  // 既存の Conscious Mesh がある場合は更新
  if (globalConsciousMesh) {
    // 新しいデバイスを追加（簡易版: 実際には既存デバイスとマージ）
    globalConsciousMesh = createConsciousMesh(devices);
  } else {
    // 新規作成
    globalConsciousMesh = createConsciousMesh(devices);
  }
  
  // Universe OS に設定
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.consciousMesh = globalConsciousMesh;
  }
  
  return globalConsciousMesh;
}

/**
 * デバイスを Conscious Mesh に追加
 */
export function addDeviceToConsciousMesh(device: DeviceNode): void {
  if (!globalConsciousMesh) {
    globalConsciousMesh = createConsciousMesh([device]);
  } else {
    // 既存のデバイスリストに追加
    const existingDevices = globalConsciousMesh.nodes.map(node => node.device);
    existingDevices.push(device);
    
    // Conscious Mesh を再生成
    globalConsciousMesh = createConsciousMesh(existingDevices);
  }
  
  // Universe OS を更新
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.consciousMesh = globalConsciousMesh;
  }
}

/**
 * デバイスを Conscious Mesh から削除
 */
export function removeDeviceFromConsciousMesh(deviceId: string): void {
  if (!globalConsciousMesh) {
    return;
  }
  
  // デバイスを除外
  const remainingDevices = globalConsciousMesh.nodes
    .filter(node => node.device.id !== deviceId)
    .map(node => node.device);
  
  if (remainingDevices.length === 0) {
    globalConsciousMesh = null;
  } else {
    globalConsciousMesh = createConsciousMesh(remainingDevices);
  }
  
  // Universe OS を更新
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.consciousMesh = globalConsciousMesh;
  }
}

/**
 * Conscious Mesh でタスクをルーティング
 */
export function routeTaskThroughConsciousMesh(
  seed: UniversalStructuralSeed
): string {
  if (!globalConsciousMesh) {
    throw new Error("Conscious Mesh is not enabled");
  }
  
  return routeTaskInConsciousMesh(globalConsciousMesh, seed);
}

/**
 * Conscious Mesh を同期
 */
export function syncGlobalConsciousMesh(): void {
  if (!globalConsciousMesh) {
    return;
  }
  
  globalConsciousMesh = syncConsciousMesh(globalConsciousMesh);
  
  // Universe OS を更新
  const universeOS = getGlobalUniverseOS();
  if (universeOS) {
    universeOS.consciousMesh = globalConsciousMesh;
  }
}

/**
 * グローバル Conscious Mesh を取得
 */
export function getGlobalConsciousMesh(): ConsciousMesh | null {
  return globalConsciousMesh;
}

export default {
  enableConsciousMeshForAllDevices,
  addDeviceToConsciousMesh,
  removeDeviceFromConsciousMesh,
  routeTaskThroughConsciousMesh,
  syncGlobalConsciousMesh,
  getGlobalConsciousMesh,
};

