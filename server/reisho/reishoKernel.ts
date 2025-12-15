/**
 * ============================================================
 *  REISHŌ KERNEL v2 — Global Integration Module
 * ============================================================
 * 
 *  Unified Structural Identity for TENMON-ARK OS
 *  Present in every thought, memory, file, response, device, context.
 * 
 *  Components:
 *  - unifiedFireWaterTensor (64次元)
 *  - kanagiPhaseTensor (4x4 ODE)
 *  - kotodamaHelixTensor (五十音螺旋の3Dテンソル)
 *  - structuralIntentVector (人格 + 目的)
 *  - reishoSignature (全OSの共通シグネチャ)
 * 
 *  v2 Updates:
 *  - Reishō Math Core 統合
 *  - Fractal Engine vΩ 接続
 *  - 実装可能な数学カーネル
 * ============================================================
 */

import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import { runKanagiStep, type KanagiState, createInitialKanagiState } from "../../kokuzo/reisho/kanagiODE";
import { gojuonSpiralTensor } from "../../kokuzo/fractal/mathModelV2";
import { unifiedKotodamaVector, kanagiTensor } from "../../kokuzo/fractal/mathModelV2";
import { cosineSimilarity } from "../../kokuzo/fractal/utils";
import { buildReishoMathCore, type ReishoMathCore } from "./mathCore";
import { generateReishoMathKernel, connectToFractalEngineVΩ, type ReishoMathKernel } from "./mathKernel";

/* ============================================================
 * 1. Reishō Signature — 全OSの共通シグネチャ
 * ============================================================ */

export interface ReishoSignature {
  /** 統合火水テンソル（64次元） */
  unifiedFireWaterTensor: number[];
  
  /** 天津金木フェーズテンソル（4x4 ODE状態） */
  kanagiPhaseTensor: number[][];
  
  /** 五十音螺旋テンソル（3D座標） */
  kotodamaHelixTensor: number[];
  
  /** 構造的意図ベクトル（人格 + 目的） */
  structuralIntentVector: number[];
  
  /** 霊核値（統合強度） */
  reishoValue: number;
  
  /** 時刻 */
  timestamp: number;
}

/* ============================================================
 * 2. Unified Fire-Water Tensor (64次元)
 * ============================================================ */

export function computeUnifiedFireWaterTensor(
  text: string,
  kanagiState: KanagiState
): number[] {
  // 統合言霊ベクトル（17次元）
  const kotodamaVec = unifiedKotodamaVector(text);
  
  // 天津金木テンソル（4D -> フラット化）
  const kanagiTensor4D = kanagiTensor(text);
  const kanagiFlat: number[] = [];
  for (let lr = 0; lr < 2; lr++) {
    for (let io = 0; io < 2; io++) {
      for (let fw = 0; fw < 2; fw++) {
        for (let m = 0; m < 5; m++) {
          kanagiFlat.push(kanagiTensor4D[lr]?.[io]?.[fw]?.[m] ?? 0);
        }
      }
    }
  } // 2 * 2 * 2 * 5 = 40次元
  
  // KanagiState（6次元）
  const kanagiStateVec = [
    kanagiState.L,
    kanagiState.R,
    kanagiState.IN,
    kanagiState.OUT,
    kanagiState.fire,
    kanagiState.water,
  ];
  
  // 統合: 17 + 40 + 6 + 1 (reishoValue) = 64次元
  const reishoValue = computeReishoValue(kotodamaVec, kanagiState);
  
  return [...kotodamaVec, ...kanagiFlat, ...kanagiStateVec, reishoValue];
}

/* ============================================================
 * 3. Kanagi Phase Tensor (4x4 ODE)
 * ============================================================ */

export function computeKanagiPhaseTensor(
  kanagiState: KanagiState
): number[][] {
  // 4x4 マトリックスとして表現
  const tensor: number[][] = [
    [kanagiState.L, kanagiState.R, 0, 0],
    [kanagiState.IN, kanagiState.OUT, 0, 0],
    [kanagiState.fire, kanagiState.water, 0, 0],
    [kanagiState.t, 0, 0, 0], // 時刻を含める
  ];
  
  return tensor;
}

/* ============================================================
 * 4. Kotodama Helix Tensor (五十音螺旋の3Dテンソル)
 * ============================================================ */

export function computeKotodamaHelixTensor(
  text: string
): number[] {
  const spiralResult = gojuonSpiralTensor(text);
  
  // 螺旋中心座標を3Dベクトルとして使用
  return [
    spiralResult.spiralCentroid.row / 9,      // 正規化 (0-9 -> 0-1)
    spiralResult.spiralCentroid.col / 4,      // 正規化 (0-4 -> 0-1)
    spiralResult.spiralCentroid.spiralIndex / 49, // 正規化 (0-49 -> 0-1)
  ];
}

/* ============================================================
 * 5. Structural Intent Vector (人格 + 目的)
 * ============================================================ */

export function computeStructuralIntentVector(
  seed: UniversalStructuralSeed | null,
  kanagiState: KanagiState
): number[] {
  if (!seed) {
    // デフォルト: 中庸
    return [0.5, 0.5, 0.5, 0.5, 0.5];
  }
  
  // 人格ベクトル（5次元）
  const personality = [
    seed.recursionPotential,           // 創造性
    seed.contractionPotential,          // 統合性
    seed.deviceAffinityProfile.cpuAffinity,    // 論理性
    seed.deviceAffinityProfile.gpuAffinity,    // 直感性
    seed.compressedRepresentation.seedWeight,  // 重要度
  ];
  
  // 目的ベクトル（5次元）: 天津金木状態から
  const purpose = [
    kanagiState.fire,   // 外発的意図
    kanagiState.water,  // 内集的意図
    kanagiState.L,      // 左旋的意図
    kanagiState.R,      // 右旋的意図
    (kanagiState.IN + kanagiState.OUT) / 2, // 統合意図
  ];
  
  // 統合: 10次元
  return [...personality, ...purpose];
}

/* ============================================================
 * 6. Reishō Value (統合強度)
 * ============================================================ */

function computeReishoValue(
  kotodamaVec: number[],
  kanagiState: KanagiState
): number {
  // 統合強度 = 言霊ベクトルのノルム × 天津金木状態の活性度
  const kotodamaNorm = Math.sqrt(
    kotodamaVec.reduce((sum, v) => sum + v * v, 0)
  );
  const kanagiActivity = 
    Math.abs(kanagiState.L) +
    Math.abs(kanagiState.R) +
    kanagiState.IN +
    kanagiState.OUT +
    kanagiState.fire +
    kanagiState.water;
  
  return kotodamaNorm * kanagiActivity / 6;
}

/* ============================================================
 * 7. Compute Reishō Signature (メイン関数)
 * ============================================================ */

export function computeReishoSignature(
  input: string,
  seed: UniversalStructuralSeed | null = null,
  kanagiState: KanagiState | null = null
): ReishoSignature {
  const currentKanagi = kanagiState || createInitialKanagiState(0.5, 0.5);
  
  const unifiedFW = computeUnifiedFireWaterTensor(input, currentKanagi);
  const kanagiPhase = computeKanagiPhaseTensor(currentKanagi);
  const helix = computeKotodamaHelixTensor(input);
  const intent = computeStructuralIntentVector(seed, currentKanagi);
  const reishoValue = computeReishoValue(unifiedKotodamaVector(input), currentKanagi);
  
  return {
    unifiedFireWaterTensor: unifiedFW,
    kanagiPhaseTensor: kanagiPhase,
    kotodamaHelixTensor: helix,
    structuralIntentVector: intent,
    reishoValue,
    timestamp: Date.now(),
  };
}

/* ============================================================
 * 8. Modulate Seed by Reishō
 * ============================================================ */

export function modulateByReisho(
  seed: UniversalStructuralSeed,
  signature: ReishoSignature
): UniversalStructuralSeed {
  // Reishō シグネチャに基づいてシードを変調
  const modulationFactor = signature.reishoValue;
  
  return {
    ...seed,
    recursionPotential: Math.min(1, seed.recursionPotential * (1 + modulationFactor * 0.1)),
    contractionPotential: Math.min(1, seed.contractionPotential * (1 + modulationFactor * 0.1)),
    compressedRepresentation: {
      ...seed.compressedRepresentation,
      seedWeight: Math.min(1, seed.compressedRepresentation.seedWeight * (1 + modulationFactor * 0.1)),
    },
  };
}

/* ============================================================
 * 9. Apply Reishō to Reasoning Chain
 * ============================================================ */

export function applyReishoToReasoning(
  reasoningChain: any, // ReasoningChainResult 型
  signature: ReishoSignature
): any {
  // 推論チェーンに Reishō シグネチャを適用
  return {
    ...reasoningChain,
    reishoSignature: signature,
    // 火水バランスを調整
    fireWater: {
      ...reasoningChain.fireWater,
      balance: (reasoningChain.fireWater?.balance ?? 0) + 
        (signature.kanagiPhaseTensor[2][0] - signature.kanagiPhaseTensor[2][1]) * 0.1,
    },
  };
}

/* ============================================================
 * 10. Apply Reishō to Memory State
 * ============================================================ */

export function applyReishoToMemory(
  memoryState: any,
  signature: ReishoSignature
): any {
  // メモリ状態に Reishō シグネチャを適用
  return {
    ...memoryState,
    reishoSignature: signature,
    // 重要度を調整
    importance: (memoryState.importance ?? 0.5) * (1 + signature.reishoValue * 0.1),
  };
}

/* ============================================================
 * 11. Apply Reishō to Device Affinity
 * ============================================================ */

export function applyReishoToDeviceAffinity(
  deviceMap: Record<string, number>,
  signature: ReishoSignature
): Record<string, number> {
  // デバイス親和性マップに Reishō シグネチャを適用
  const modulated: Record<string, number> = {};
  
  for (const [deviceId, affinity] of Object.entries(deviceMap)) {
    // Reishō 値に基づいて親和性を調整
    modulated[deviceId] = Math.min(1, affinity * (1 + signature.reishoValue * 0.1));
  }
  
  return modulated;
}

/* ============================================================
 * v2: Reishō Math Core 統合関数
 * ============================================================ */

import { buildReishoMathCore, type ReishoMathCore } from "./mathCore";
import { generateReishoMathKernel, connectToFractalEngineVΩ, type ReishoMathKernel } from "./mathKernel";

/**
 * Reishō Math Core を使用してシグネチャを計算（v2）
 */
export function computeReishoSignatureV2(
  input: string,
  seed: UniversalStructuralSeed | null = null,
  kanagiState: KanagiState | null = null
): ReishoSignature & { mathCore?: ReishoMathCore } {
  const signature = computeReishoSignature(input, seed, kanagiState);
  
  // Reishō Math Core を構築
  const fwBalance = seed?.compressedRepresentation.fireWaterBalance ?? 0.5;
  const mathCore = buildReishoMathCore(input, fwBalance);
  
  return {
    ...signature,
    mathCore,
  };
}

/**
 * Fractal Engine vΩ に接続してReishō Kernelを生成
 */
export function generateReishoKernelWithFractal(
  seed: UniversalStructuralSeed
): ReishoMathKernel {
  const text = seed.compressedRepresentation.mainTags.join(" ");
  const fwBalance = seed.compressedRepresentation.fireWaterBalance;
  
  const kernel = generateReishoMathKernel(text, fwBalance);
  return connectToFractalEngineVΩ(kernel, seed);
}

export default {
  computeReishoSignature,
  computeReishoSignatureV2,
  modulateByReisho,
  applyReishoToReasoning,
  applyReishoToMemory,
  applyReishoToDeviceAffinity,
  generateReishoKernelWithFractal,
};

