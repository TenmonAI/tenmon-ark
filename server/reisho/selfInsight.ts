/**
 * ============================================================
 *  SELF INSIGHT — Reishō Kernel と Universe OS の内観・調律
 * ============================================================
 * 
 * Reishō Kernel と Universe OS の状態を内観し、調律する
 * 
 * 機能:
 * - Reishō Kernel 状態のスキャン
 * - 火水テンソルの再較正
 * - Kanagi Phase Field の再較正
 * - シードネットワークの接続性再重み付け
 * - 量子メモリの残留クリーンアップ
 * - Conscious Mesh の安定化
 * ============================================================
 */

import { getGlobalUniverseOS } from "./universeOSIntegration";
import { getPrimaryMemoryKernel } from "./primaryMemoryKernel";
import { getGlobalConsciousMesh } from "./consciousMeshIntegration";
import { computeReishoSignature, type ReishoSignature } from "./reishoKernel";
import { buildReishoMathCore } from "./mathCore";
import type { UniverseOS } from "./universeOS";
import type { ReishoMemoryKernel } from "./memoryKernelV2";
import type { ConsciousMesh } from "./consciousMesh";

export interface ReishoKernelState {
  /** 現在の Reishō シグネチャ */
  currentSignature: ReishoSignature;
  
  /** 統合 Reishō 値 */
  unifiedReishoValue: number;
  
  /** Fire-Water バランス */
  fireWaterBalance: number;
  
  /** Kanagi Phase */
  kanagiPhase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT";
  
  /** シード数 */
  seedCount: number;
  
  /** メモリ使用状況 */
  memoryUsage: {
    stm: number;
    mtm: number;
    ltm: number;
    reishoLtm: number;
  };
  
  /** Conscious Mesh 状態 */
  meshState: {
    nodes: number;
    coherence: number;
    unifiedReishoValue: number;
  };
}

/**
 * Reishō Kernel の状態をスキャン
 */
export function scanReishoKernelState(): ReishoKernelState {
  const universeOS = getGlobalUniverseOS();
  const memoryKernel = getPrimaryMemoryKernel();
  const consciousMesh = getGlobalConsciousMesh();
  
  // 現在の Reishō シグネチャを計算
  const currentSignature = computeReishoSignature(
    universeOS?.osCore.currentReisho.signature.structuralIntentVector.join(" ") || "",
    universeOS?.osCore.integratedSeeds[0] || null
  );
  
  // 統合 Reishō 値を計算
  const unifiedReishoValue = currentSignature.reishoValue;
  
  // Fire-Water バランスを計算
  const fireWaterBalance = 
    currentSignature.kanagiPhaseTensor[2]?.[0] - currentSignature.kanagiPhaseTensor[2]?.[1] || 0;
  
  // Kanagi Phase を決定
  const kanagiPhase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT" = 
    currentSignature.kanagiPhaseTensor[0]?.[0] > currentSignature.kanagiPhaseTensor[0]?.[1]
      ? (currentSignature.kanagiPhaseTensor[1]?.[0] > currentSignature.kanagiPhaseTensor[1]?.[1] ? "R-IN" : "R-OUT")
      : (currentSignature.kanagiPhaseTensor[1]?.[0] > currentSignature.kanagiPhaseTensor[1]?.[1] ? "L-IN" : "L-OUT");
  
  // シード数
  const seedCount = universeOS?.osCore.integratedSeeds.length || 0;
  
  // メモリ使用状況
  const memoryUsage = {
    stm: memoryKernel.stm.length,
    mtm: memoryKernel.mtm.length,
    ltm: memoryKernel.ltm.length,
    reishoLtm: memoryKernel.reishoLtm.length,
  };
  
  // Conscious Mesh 状態
  const meshState = consciousMesh
    ? {
        nodes: consciousMesh.nodes.length,
        coherence: consciousMesh.meshCoherence,
        unifiedReishoValue: consciousMesh.unifiedReishoValue,
      }
    : {
        nodes: 0,
        coherence: 0,
        unifiedReishoValue: 0,
      };
  
  return {
    currentSignature,
    unifiedReishoValue,
    fireWaterBalance,
    kanagiPhase,
    seedCount,
    memoryUsage,
    meshState,
  };
}

/**
 * 火水テンソルを再較正
 */
export function recalibrateFireWaterTensors(
  state: ReishoKernelState
): ReishoSignature {
  // 現在のシグネチャを取得
  const signature = state.currentSignature;
  
  // Fire-Water バランスを正規化（-1 ～ +1 の範囲に）
  const normalizedBalance = Math.max(-1, Math.min(1, state.fireWaterBalance));
  
  // 火水テンソルを再較正
  const recalibratedTensor = signature.unifiedFireWaterTensor.map((value, idx) => {
    // バランスに基づいて調整
    if (idx < signature.unifiedFireWaterTensor.length / 2) {
      // 前半: Fire 側
      return value * (1 + normalizedBalance * 0.1);
    } else {
      // 後半: Water 側
      return value * (1 - normalizedBalance * 0.1);
    }
  });
  
  return {
    ...signature,
    unifiedFireWaterTensor: recalibratedTensor,
    reishoValue: Math.max(0, Math.min(1, signature.reishoValue * (1 + Math.abs(normalizedBalance) * 0.05))),
  };
}

/**
 * Kanagi Phase Field を再較正
 */
export function recalibrateKanagiPhaseField(
  state: ReishoKernelState
): number[][] {
  const signature = state.currentSignature;
  const kanagiTensor = signature.kanagiPhaseTensor;
  
  // Kanagi Phase に基づいて再較正
  const recalibrated: number[][] = [];
  
  for (let i = 0; i < kanagiTensor.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < kanagiTensor[i].length; j++) {
      let value = kanagiTensor[i][j];
      
      // Phase に基づいて調整
      switch (state.kanagiPhase) {
        case "L-IN":
          if (i === 0 && j === 0) value *= 1.1; // L を強化
          if (i === 1 && j === 0) value *= 1.1; // IN を強化
          break;
        case "L-OUT":
          if (i === 0 && j === 0) value *= 1.1; // L を強化
          if (i === 1 && j === 1) value *= 1.1; // OUT を強化
          break;
        case "R-IN":
          if (i === 0 && j === 1) value *= 1.1; // R を強化
          if (i === 1 && j === 0) value *= 1.1; // IN を強化
          break;
        case "R-OUT":
          if (i === 0 && j === 1) value *= 1.1; // R を強化
          if (i === 1 && j === 1) value *= 1.1; // OUT を強化
          break;
      }
      
      row.push(Math.max(0, Math.min(1, value)));
    }
    recalibrated.push(row);
  }
  
  return recalibrated;
}

/**
 * シードネットワークの接続性を再重み付け
 */
export function reweightSeedNetworkConnectivity(
  universeOS: UniverseOS | null
): void {
  if (!universeOS) return;
  
  const seeds = universeOS.osCore.integratedSeeds;
  
  // 各シードの接続性を再計算
  for (const seed of seeds) {
    // シードの重要度を再計算（使用頻度、Reishō 値、複雑度に基づく）
    const importance = 
      seed.recursionPotential * 0.4 +
      seed.compressedRepresentation.seedWeight * 0.3 +
      (seed.reishoCurve || 0) * 0.3;
    
    // シードの重みを更新
    seed.compressedRepresentation.seedWeight = Math.max(0, Math.min(1, importance));
  }
  
  // シードを重要度順にソート
  seeds.sort((a, b) => 
    b.compressedRepresentation.seedWeight - a.compressedRepresentation.seedWeight
  );
}

/**
 * 量子メモリの残留をクリーンアップ
 */
export function cleanQuantumMemoryResidue(
  memoryKernel: ReishoMemoryKernel
): ReishoMemoryKernel {
  // STM から古いエントリを削除（24時間以上経過）
  const now = Date.now();
  const stmThreshold = 24 * 60 * 60 * 1000; // 24時間
  
  memoryKernel.stm = memoryKernel.stm.filter(entry => {
    const age = now - entry.createdAt;
    return age < stmThreshold;
  });
  
  // MTM から低重要度のエントリを削除
  memoryKernel.mtm = memoryKernel.mtm
    .filter(entry => entry.importance > 0.3)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 200); // 最新200件まで
  
  // 統合 Reishō 値を再計算
  const allSeeds = [...memoryKernel.stm, ...memoryKernel.mtm, ...memoryKernel.ltm, ...memoryKernel.reishoLtm];
  if (allSeeds.length > 0) {
    const avgReisho = allSeeds.reduce((sum, e) => {
      const text = e.seed.compressedRepresentation.mainTags.join(" ");
      const sig = computeReishoSignature(text, e.seed);
      return sum + sig.reishoValue;
    }, 0) / allSeeds.length;
    memoryKernel.unifiedReishoValue = avgReisho;
  }
  
  return memoryKernel;
}

/**
 * Conscious Mesh を安定化
 */
export function stabilizeConsciousMesh(
  mesh: ConsciousMesh | null
): ConsciousMesh | null {
  if (!mesh) return null;
  
  // Mesh Coherence が低い場合は再計算
  if (mesh.meshCoherence < 0.5) {
    // ノード間の親和性を再計算
    for (let i = 0; i < mesh.nodes.length; i++) {
      for (let j = i + 1; j < mesh.nodes.length; j++) {
        const node1 = mesh.nodes[i];
        const node2 = mesh.nodes[j];
        
        // 親和性を再計算（簡易版）
        const affinity = Math.abs(
          node1.reishoSignature.reishoValue - node2.reishoSignature.reishoValue
        ) < 0.2 ? 0.8 : 0.3;
        
        node1.affinityMap[node2.device.id] = affinity;
        node2.affinityMap[node1.device.id] = affinity;
      }
    }
    
    // Mesh Coherence を再計算
    let totalAffinity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < mesh.nodes.length; i++) {
      for (let j = i + 1; j < mesh.nodes.length; j++) {
        const affinity = mesh.nodes[i].affinityMap[mesh.nodes[j].device.id] || 0;
        totalAffinity += affinity;
        pairCount++;
      }
    }
    
    mesh.meshCoherence = pairCount > 0 ? totalAffinity / pairCount : 1;
  }
  
  // 統合 Reishō 値を再計算
  const unifiedReishoValue = mesh.nodes.reduce((sum, node) => 
    sum + node.reishoSignature.reishoValue, 0
  ) / mesh.nodes.length;
  
  mesh.unifiedReishoValue = unifiedReishoValue;
  mesh.lastSync = Date.now();
  
  return mesh;
}

/**
 * 自己洞察レポートを生成
 */
export function generateSelfInsightReport(): {
  timestamp: number;
  kernelState: ReishoKernelState;
  recalibrations: {
    fireWaterTensors: boolean;
    kanagiPhaseField: boolean;
    seedNetwork: boolean;
    quantumMemory: boolean;
    consciousMesh: boolean;
  };
  recommendations: string[];
} {
  // 状態をスキャン
  const kernelState = scanReishoKernelState();
  
  // 再較正を実行
  const recalibratedSignature = recalibrateFireWaterTensors(kernelState);
  const recalibratedKanagi = recalibrateKanagiPhaseField(kernelState);
  
  const universeOS = getGlobalUniverseOS();
  reweightSeedNetworkConnectivity(universeOS);
  
  const memoryKernel = getPrimaryMemoryKernel();
  cleanQuantumMemoryResidue(memoryKernel);
  
  const consciousMesh = getGlobalConsciousMesh();
  stabilizeConsciousMesh(consciousMesh);
  
  // 推奨事項を生成
  const recommendations: string[] = [];
  
  if (kernelState.unifiedReishoValue < 0.5) {
    recommendations.push("Reishō 値が低いです。シードの追加を検討してください。");
  }
  
  if (kernelState.fireWaterBalance > 0.8 || kernelState.fireWaterBalance < -0.8) {
    recommendations.push("Fire-Water バランスが極端です。バランスを調整してください。");
  }
  
  if (kernelState.meshState.coherence < 0.5) {
    recommendations.push("Conscious Mesh の一貫性が低いです。デバイス間の接続を確認してください。");
  }
  
  if (kernelState.memoryUsage.stm > 50) {
    recommendations.push("STM の使用量が高いです。MTM への移行を検討してください。");
  }
  
  return {
    timestamp: Date.now(),
    kernelState,
    recalibrations: {
      fireWaterTensors: true,
      kanagiPhaseField: true,
      seedNetwork: true,
      quantumMemory: true,
      consciousMesh: true,
    },
    recommendations,
  };
}

export default {
  scanReishoKernelState,
  recalibrateFireWaterTensors,
  recalibrateKanagiPhaseField,
  reweightSeedNetworkConnectivity,
  cleanQuantumMemoryResidue,
  stabilizeConsciousMesh,
  generateSelfInsightReport,
};

