/**
 * 🔱 KOKŪZŌ Fractal Engine — DeviceCluster v3 統合 vΩ
 * DeviceCluster v3 に火水・天津金木ベースの分散最適化を導入
 * 
 * PHASE A5: Reishō 統合
 */

import type { FractalSeed } from "./compression";
import type { UniversalStructuralSeed } from "./seedV2";
import type { DeviceNode } from "../device/fusion";
import type { QuantumCacheEntry } from "../quantum/cacheV2";
import { computeReishoSignature, applyReishoToDeviceAffinity } from "../../server/reisho/reishoKernel";

/**
 * 火水親和性に基づいてタスクをルーティング
 */
export function routeTaskUsingFireWaterAffinity(
  seed: FractalSeed | UniversalStructuralSeed,
  devices: DeviceNode[]
): string {
  const { fireFlow, waterFlow } = 'fireWaterFlowMap' in seed
    ? seed.fireWaterFlowMap
    : {
        fireFlow: seed.compressedRepresentation.kotodamaVector.fire,
        waterFlow: seed.compressedRepresentation.kotodamaVector.water,
      };
  
  // 火優勢 → 高CPUデバイス
  // 水優勢 → 高ストレージデバイス
  const isFireDominant = fireFlow > waterFlow;
  
  const scored = devices.map(d => {
    let score = 1.0;
    
    if (isFireDominant) {
      // 火優勢: CPU を重視
      score *= (d.capabilities?.cpu || 1) * 1.5;
    } else {
      // 水優勢: ストレージを重視
      score *= (d.capabilities?.storage || 1) * 1.5;
    }
    
    return {
      deviceId: d.id,
      score,
    };
  });
  
  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted[0]?.deviceId || devices[0]?.id || "default";
}

/**
 * 天津金木テンソルに基づいてタスクをルーティング
 */
export function routeTaskUsingKanagiTensor(
  seed: FractalSeed | UniversalStructuralSeed,
  devices: DeviceNode[]
): string {
  const phase = seed.compressedRepresentation.kanagiPhaseMode;
  
  // L-IN: 内集・左旋 → 中央デバイス（統合）
  // L-OUT: 外発・左旋 → エッジデバイス（分散）
  // R-IN: 内集・右旋 → 高CPUデバイス（集中処理）
  // R-OUT: 外発・右旋 → 高ストレージデバイス（拡張）
  
  const scored = devices.map(d => {
    let score = 1.0;
    
    switch (phase) {
      case "L-IN":
        // 内集・左旋: 中央統合デバイスを優先
        score *= (d.capabilities?.cpu || 1) * (d.capabilities?.storage || 1) * 0.8;
        break;
      case "L-OUT":
        // 外発・左旋: エッジ分散デバイスを優先
        score *= (d.capabilities?.networkAffinity || 1) * 1.2;
        break;
      case "R-IN":
        // 内集・右旋: 高CPUデバイスを優先
        score *= (d.capabilities?.cpu || 1) * 1.5;
        break;
      case "R-OUT":
        // 外発・右旋: 高ストレージデバイスを優先
        score *= (d.capabilities?.storage || 1) * 1.5;
        break;
    }
    
    return {
      deviceId: d.id,
      score,
    };
  });
  
  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted[0]?.deviceId || devices[0]?.id || "default";
}

/**
 * QuantumCache を使用してシード配置を最適化
 */
export function optimizeSeedPlacement(
  seed: FractalSeed | UniversalStructuralSeed,
  quantumCache: Map<string, QuantumCacheEntry>
): {
  recommendedDevices: string[];
  cacheStrategy: "hot" | "warm" | "cold";
} {
  // シードの複雑度と生成力に基づいてキャッシュ戦略を決定
  const complexity = seed.compressedRepresentation.seedWeight;
  const recursionPotential = 'recursionPotential' in seed ? seed.recursionPotential : 0.5;
  
  // 高複雑度・高再帰力 → hot cache（頻繁にアクセス）
  // 中複雑度 → warm cache（時々アクセス）
  // 低複雑度 → cold cache（まれにアクセス）
  let cacheStrategy: "hot" | "warm" | "cold";
  if (complexity > 0.7 && recursionPotential > 0.7) {
    cacheStrategy = "hot";
  } else if (complexity > 0.4 || recursionPotential > 0.4) {
    cacheStrategy = "warm";
  } else {
    cacheStrategy = "cold";
  }
  
  // 推奨デバイス（簡易版）
  const recommendedDevices: string[] = [];
  
  // hot cache: 複数デバイスに分散
  if (cacheStrategy === "hot") {
    recommendedDevices.push("device-1", "device-2", "device-3");
  } else if (cacheStrategy === "warm") {
    recommendedDevices.push("device-1", "device-2");
  } else {
    recommendedDevices.push("device-1");
  }
  
  return {
    recommendedDevices,
    cacheStrategy,
  };
}

/* ============================================================
 * PHASE A5: Reishō 親和性によるタスクルーティング
 * ============================================================ */

import { computeReishoSignature, applyReishoToDeviceAffinity } from "../../server/reisho/reishoKernel";

/**
 * Reishō 親和性に基づいてタスクをルーティング
 * シードの複雑度と Reishō シグネチャを考慮
 */
export function routeTaskUsingReishoAffinity(
  seed: FractalSeed | UniversalStructuralSeed,
  devices: DeviceNode[]
): string {
  if (devices.length === 0) {
    throw new Error("No devices available for Reishō affinity routing");
  }

  // Reishō シグネチャを計算
  const text = seed.compressedRepresentation.mainTags.join(" ");
  const reishoSignature = computeReishoSignature(text, 'recursionPotential' in seed ? seed : null);
  
  // シードの複雑度を計算
  const complexity = computeSeedComplexityForRouting(seed);
  
  // デバイス親和性マップを取得
  const deviceAffinityMap: Record<string, number> = {};
  for (const device of devices) {
    deviceAffinityMap[device.id] = 0.5; // デフォルト
  }
  
  // UniversalStructuralSeed の場合、deviceAffinityProfile を使用
  if ('deviceAffinityProfile' in seed) {
    const usSeed = seed as UniversalStructuralSeed;
    for (const device of devices) {
      // CPU/GPU/Storage/Network の親和性を統合
      const cpuAffinity = usSeed.deviceAffinityProfile.cpuAffinity * (device.capabilities?.cpu || 1);
      const storageAffinity = usSeed.deviceAffinityProfile.storageAffinity * (device.capabilities?.storage || 1);
      const memoryAffinity = usSeed.deviceAffinityProfile.networkAffinity * (device.capabilities?.memory || 1);
      deviceAffinityMap[device.id] = (cpuAffinity + storageAffinity + memoryAffinity) / 3;
    }
  }
  
  // Reishō シグネチャを適用
  const reishoModulatedAffinity = applyReishoToDeviceAffinity(deviceAffinityMap, reishoSignature);
  
  // 複雑度に基づいてスコアリング
  const scoredDevices = devices.map(device => {
    const baseAffinity = reishoModulatedAffinity[device.id] || 0.5;
    const complexityScore = complexity * (device.capabilities?.cpu || 1);
    const score = baseAffinity * 0.7 + complexityScore * 0.3;
    
    return { deviceId: device.id, score };
  });
  
  scoredDevices.sort((a, b) => b.score - a.score);
  return scoredDevices[0]?.deviceId || devices[0].id;
}

/**
 * シードの複雑度を計算（ルーティング用）
 */
function computeSeedComplexityForRouting(seed: FractalSeed | UniversalStructuralSeed): number {
  const unitCount = seed.semanticUnitIds.length;
  const edgeCount = seed.compressedRepresentation.semanticEdges.length;
  const tagCount = seed.compressedRepresentation.mainTags.length;
  const weight = seed.compressedRepresentation.seedWeight;
  
  // 複雑度 = ユニット数 + エッジ数 + タグ数 + 生成力
  const complexity = Math.min(1.0, 
    (unitCount * 0.1 + edgeCount * 0.05 + tagCount * 0.03 + weight * 0.5)
  );
  
  // UniversalStructuralSeed の場合、再帰的生成力も考慮
  if ('recursionPotential' in seed) {
    const usSeed = seed as UniversalStructuralSeed;
    return Math.min(1.0, complexity * (1 + usSeed.recursionPotential * 0.2));
  }
  
  return complexity;
}

