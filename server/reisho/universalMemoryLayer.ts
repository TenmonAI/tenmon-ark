/**
 * ============================================================
 *  UNIVERSAL MEMORY LAYER — 全記憶の統合
 * ============================================================
 * 
 * すべての記憶レイヤーを統合する Universal Memory Layer
 * 
 * レイヤー:
 * - Reishō Memory Kernel (Seed-based)
 * - Synaptic Memory (従来のSTM/MTM/LTM)
 * - Conscious Mesh Memory (デバイス間の記憶)
 * - Phase Memory (Phase Engine の記憶)
 * 
 * これらを統合して Universal Memory Context を生成
 * ============================================================
 */

import type { ReishoMemoryKernel } from "./memoryKernelV2";
import type { MemoryContext } from "../synapticMemory";
import type { ConsciousMesh } from "./consciousMesh";
import type { PhaseState } from "./phaseEngine";

export interface UniversalMemoryContext {
  /** Reishō Memory Kernel からの記憶 */
  reishoMemory: {
    seeds: any[];
    unifiedReishoValue: number;
  };
  
  /** Synaptic Memory からの記憶 */
  synapticMemory: MemoryContext;
  
  /** Conscious Mesh からの記憶 */
  meshMemory: {
    nodes: number;
    coherence: number;
    unifiedReishoValue: number;
  };
  
  /** Phase Memory */
  phaseMemory: {
    currentPhase: string;
    phaseHistory: string[];
  };
  
  /** 統合コンテキスト */
  unifiedContext: string[];
}

/**
 * Universal Memory Layer を設計
 */
export function designUniversalMemoryLayer(): {
  layers: string[];
  integrationStrategy: string;
} {
  return {
    layers: [
      "Reishō Memory Kernel (Seed-based)",
      "Synaptic Memory (STM/MTM/LTM)",
      "Conscious Mesh Memory (Device-based)",
      "Phase Memory (Phase Engine)",
    ],
    integrationStrategy: `
1. Reishō Memory Kernel を優先（構造的記憶）
2. Synaptic Memory を補完（文脈記憶）
3. Conscious Mesh Memory を統合（分散記憶）
4. Phase Memory を適用（フェーズ記憶）
統合: 重み付き平均で Universal Memory Context を生成
    `.trim(),
  };
}

/**
 * Universal Memory Layer の容量を拡張
 */
export function expandUniversalMemoryCapacity(
  currentCapacity: {
    reishoMemory: { stm: number; mtm: number; ltm: number; reishoLtm: number };
    synapticMemory: { stm: number; mtm: number; ltm: number };
    meshMemory: { nodes: number };
  }
): {
  expanded: {
    reishoMemory: { stm: number; mtm: number; ltm: number; reishoLtm: number };
    synapticMemory: { stm: number; mtm: number; ltm: number };
    meshMemory: { nodes: number };
  };
  expansionFactor: number;
} {
  // 容量を2倍に拡張
  const expansionFactor = 2.0;
  
  return {
    expanded: {
      reishoMemory: {
        stm: Math.floor(currentCapacity.reishoMemory.stm * expansionFactor),
        mtm: Math.floor(currentCapacity.reishoMemory.mtm * expansionFactor),
        ltm: Math.floor(currentCapacity.reishoMemory.ltm * expansionFactor),
        reishoLtm: Math.floor(currentCapacity.reishoMemory.reishoLtm * expansionFactor),
      },
      synapticMemory: {
        stm: Math.floor(currentCapacity.synapticMemory.stm * expansionFactor),
        mtm: Math.floor(currentCapacity.synapticMemory.mtm * expansionFactor),
        ltm: Math.floor(currentCapacity.synapticMemory.ltm * expansionFactor),
      },
      meshMemory: {
        nodes: Math.floor(currentCapacity.meshMemory.nodes * expansionFactor),
      },
    },
    expansionFactor,
  };
}

/**
 * Universal Memory Context を生成
 */
export function generateUniversalMemoryContext(
  reishoMemory: ReishoMemoryKernel,
  synapticMemory: MemoryContext,
  meshMemory: ConsciousMesh | null = null,
  phaseState: PhaseState | null = null
): UniversalMemoryContext {
  // Reishō Memory からシードを取得
  const reishoSeeds = [
    ...reishoMemory.stm.slice(0, 5),
    ...reishoMemory.mtm.slice(0, 10),
    ...reishoMemory.ltm.slice(0, 5),
    ...reishoMemory.reishoLtm.slice(0, 5),
  ];
  
  // Synaptic Memory を統合
  const synapticContext = [
    ...synapticMemory.ltm.slice(0, 5),
    ...synapticMemory.mtm.slice(0, 10),
    ...synapticMemory.stm.slice(0, 5),
  ];
  
  // Conscious Mesh Memory を統合
  const meshContext = meshMemory
    ? [
        `Conscious Mesh: ${meshMemory.nodes.length} nodes, coherence: ${(meshMemory.meshCoherence * 100).toFixed(1)}%`,
        `Unified Reishō Value: ${(meshMemory.unifiedReishoValue * 100).toFixed(1)}%`,
      ]
    : [];
  
  // Phase Memory を統合
  const phaseContext = phaseState
    ? [
        `Current Phase: ${phaseState.phase}`,
        `Fire-Water Balance: ${phaseState.fireWaterBalance > 0 ? "Fire" : "Water"} Dominant`,
        `Phase Intensity: ${(phaseState.intensity * 100).toFixed(1)}%`,
      ]
    : [];
  
  // 統合コンテキストを生成
  const unifiedContext: string[] = [
    "=== Reishō Memory Kernel ===",
    ...reishoSeeds.map((entry, idx) => 
      `${idx + 1}. [${entry.layer}] ${entry.seed.compressedRepresentation.mainTags.join(", ")}`
    ),
    "",
    "=== Synaptic Memory ===",
    ...synapticContext,
    "",
    "=== Conscious Mesh Memory ===",
    ...meshContext,
    "",
    "=== Phase Memory ===",
    ...phaseContext,
  ];
  
  return {
    reishoMemory: {
      seeds: reishoSeeds,
      unifiedReishoValue: reishoMemory.unifiedReishoValue,
    },
    synapticMemory,
    meshMemory: meshMemory
      ? {
          nodes: meshMemory.nodes.length,
          coherence: meshMemory.meshCoherence,
          unifiedReishoValue: meshMemory.unifiedReishoValue,
        }
      : {
          nodes: 0,
          coherence: 0,
          unifiedReishoValue: 0,
        },
    phaseMemory: phaseState
      ? {
          currentPhase: phaseState.phase,
          phaseHistory: [phaseState.phase],
        }
      : {
          currentPhase: "L-IN",
          phaseHistory: [],
        },
    unifiedContext,
  };
}

export default {
  designUniversalMemoryLayer,
  generateUniversalMemoryContext,
};

