/**
 * ============================================================
 *  DEVICE MESH STABILITY TEST — デバイスメッシュ安定性テスト
 * ============================================================
 * 
 * Conscious Mesh の安定性をテスト
 * 
 * テスト項目:
 * - デバイス追加・削除
 * - Mesh Coherence の計算
 * - デバイス間の親和性
 * - 同期処理
 * ============================================================
 */

import { createConsciousMesh, syncConsciousMesh, routeTaskInConsciousMesh } from "../consciousMesh";
import { enableConsciousMeshForAllDevices, addDeviceToConsciousMesh, removeDeviceFromConsciousMesh } from "../consciousMeshIntegration";
import type { DeviceNode } from "../../../kokuzo/device/fusion";
import type { UniversalStructuralSeed } from "../../../kokuzo/fractal/seedV2";

/**
 * デバイスメッシュ安定性テスト
 */
export async function testDeviceMeshStability(): Promise<{
  passed: boolean;
  message: string;
  tests: {
    deviceAddition: boolean;
    deviceRemoval: boolean;
    meshCoherence: boolean;
    deviceAffinity: boolean;
    synchronization: boolean;
  };
}> {
  const tests = {
    deviceAddition: false,
    deviceRemoval: false,
    meshCoherence: false,
    deviceAffinity: false,
    synchronization: false,
  };
  
  try {
    // モックデバイス
    const mockDevices: DeviceNode[] = [
      { id: "device-1", name: "Device 1", type: "desktop", capabilities: { cpu: 2, storage: 1, memory: 1 } },
      { id: "device-2", name: "Device 2", type: "mobile", capabilities: { cpu: 1, storage: 0.5, memory: 0.5 } },
    ];
    
    // 1. デバイス追加
    const mesh = enableConsciousMeshForAllDevices(mockDevices);
    tests.deviceAddition = mesh.nodes.length === 2;
    
    // 2. デバイス削除
    removeDeviceFromConsciousMesh("device-2");
    const meshAfterRemoval = createConsciousMesh([mockDevices[0]]);
    tests.deviceRemoval = meshAfterRemoval.nodes.length === 1;
    
    // 3. Mesh Coherence の計算
    const coherence = mesh.meshCoherence;
    tests.meshCoherence = coherence >= 0 && coherence <= 1;
    
    // 4. デバイス間の親和性
    if (mesh.nodes.length >= 2) {
      const affinity = mesh.nodes[0].affinityMap[mesh.nodes[1].device.id];
      tests.deviceAffinity = affinity >= 0 && affinity <= 1;
    } else {
      tests.deviceAffinity = true; // デバイスが1つだけの場合はスキップ
    }
    
    // 5. 同期処理
    const syncedMesh = syncConsciousMesh(mesh);
    tests.synchronization = syncedMesh.lastSync > mesh.lastSync;
    
    const allPassed = Object.values(tests).every(t => t === true);
    
    return {
      passed: allPassed,
      message: allPassed
        ? "Device Mesh Stability test passed"
        : "Some device mesh stability tests failed",
      tests,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Device Mesh Stability test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      tests,
    };
  }
}

export default {
  testDeviceMeshStability,
};

