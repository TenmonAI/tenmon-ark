/**
 * ============================================================
 *  UNIVERSE OS INTEGRATION — Universe OS 統合
 * ============================================================
 * 
 * Universe OS をシステム全体に統合
 * すべてのリクエストを Reishō Pipeline 経由で処理
 * 
 * 統合ポイント:
 * - Atlas Chat Router
 * - Memory Kernel
 * - Fractal Engine
 * - DeviceCluster
 * ============================================================
 */

import { finalizeUniverseOS, updateUniverseOS, getUniverseOSState, type UniverseOS } from "./universeOS";
import { executeReishoPipeline, type ReishoPipelineInput, type ReishoPipelineOutput } from "./reishoPipeline";
import { createReishoMemoryKernel, storeSeedInMemoryKernel, retrieveSeedsFromMemoryKernel, type ReishoMemoryKernel } from "./memoryKernelV2";
import { enableFractalOvercompression, type OvercompressedSeed } from "./fractalOvercompression";
import { createConsciousMesh, syncConsciousMesh, type ConsciousMesh } from "./consciousMesh";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import type { DeviceNode } from "../../kokuzo/device/fusion";

/**
 * Universe OS インスタンス（グローバル）
 */
let globalUniverseOS: UniverseOS | null = null;

/**
 * Universe OS をデフォルトパイプラインに設定
 */
export function setUniverseOSAsDefaultPipeline(
  userId: number,
  initialSeeds: UniversalStructuralSeed[] = [],
  devices: DeviceNode[] = []
): UniverseOS {
  // Universe OS を生成
  globalUniverseOS = finalizeUniverseOS(
    `universe-os-${userId}`,
    "",
    initialSeeds,
    devices
  );
  
  return globalUniverseOS;
}

/**
 * グローバル Universe OS を取得
 */
export function getGlobalUniverseOS(): UniverseOS | null {
  return globalUniverseOS;
}

/**
 * すべてのリクエストを Reishō Pipeline 経由でルーティング
 */
export async function routeRequestThroughReishoPipeline(
  input: ReishoPipelineInput
): Promise<ReishoPipelineOutput> {
  // Universe OS が存在しない場合は初期化
  if (!globalUniverseOS) {
    globalUniverseOS = setUniverseOSAsDefaultPipeline(
      input.userId,
      input.existingSeeds || []
    );
  }
  
  // Reishō Pipeline を実行
  const output = await executeReishoPipeline(
    input,
    globalUniverseOS.osCore,
    globalUniverseOS.memoryKernel
  );
  
  // Universe OS を更新
  if (output.memoryContext.retrievedSeeds > 0) {
    // 新しいシードが生成された場合、Universe OS を更新
    globalUniverseOS = updateUniverseOS(
      globalUniverseOS,
      input.message,
      input.existingSeeds || []
    );
  }
  
  return output;
}

/**
 * Fractal Engine をシステムシードジェネレータに昇格
 */
export function promoteFractalEngineAsSystemSeedGenerator(
  semanticUnits: any[]
): UniversalStructuralSeed[] {
  // Fractal Engine を使用してシードを生成
  // 実際の実装では、kokuzo/fractal/ の関数を使用
  const { createFractalSeed } = require("../../kokuzo/fractal/seed");
  const { upgradeToUniversalStructuralSeed } = require("../../kokuzo/fractal/seedV2");
  
  // SemanticUnit から FractalSeed を生成
  const fractalSeed = createFractalSeed(semanticUnits);
  
  // UniversalStructuralSeed にアップグレード
  const universalSeed = upgradeToUniversalStructuralSeed(fractalSeed, semanticUnits);
  
  // 過圧縮を適用
  const overcompressed = enableFractalOvercompression(universalSeed);
  
  // Universe OS に追加
  if (globalUniverseOS) {
    globalUniverseOS.overcompressedSeeds.push(overcompressed);
  }
  
  return [universalSeed];
}

/**
 * Reishō Memory をプライマリカーネルに設定
 */
export function setReishoMemoryAsPrimaryKernel(
  userId: number
): ReishoMemoryKernel {
  // Universe OS が存在しない場合は初期化
  if (!globalUniverseOS) {
    globalUniverseOS = setUniverseOSAsDefaultPipeline(userId);
  }
  
  // Reishō Memory Kernel を返す
  return globalUniverseOS.memoryKernel;
}

/**
 * すべてのデバイスで Conscious Mesh を有効化
 */
export function enableConsciousMeshForAllDevices(
  devices: DeviceNode[]
): ConsciousMesh {
  // Conscious Mesh を生成
  const mesh = createConsciousMesh(devices);
  
  // Universe OS に設定
  if (globalUniverseOS) {
    globalUniverseOS.consciousMesh = mesh;
  }
  
  return mesh;
}

/**
 * Universe OS の状態を取得
 */
export function getUniverseOSStatus(): {
  isActive: boolean;
  state: ReturnType<typeof getUniverseOSState> | null;
} {
  if (!globalUniverseOS) {
    return {
      isActive: false,
      state: null,
    };
  }
  
  return {
    isActive: true,
    state: getUniverseOSState(globalUniverseOS),
  };
}

export default {
  setUniverseOSAsDefaultPipeline,
  getGlobalUniverseOS,
  routeRequestThroughReishoPipeline,
  promoteFractalEngineAsSystemSeedGenerator,
  setReishoMemoryAsPrimaryKernel,
  enableConsciousMeshForAllDevices,
  getUniverseOSStatus,
};

