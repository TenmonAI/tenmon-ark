/**
 * 🔱 KOKŪZŌ Fractal Engine — 宇宙構文核（Universal Structural Seed）vΩ
 * FractalSeed を宇宙構文核へ拡張
 */

import type { FractalSeed } from "./compression";
import type { SemanticUnit } from "../semantic/engine";

// 再エクスポート
export type { FractalSeed };

/**
 * 宇宙構文核（Universal Structural Seed）
 */
export interface UniversalStructuralSeed extends FractalSeed {
  structuralLawTensor: number[][]; // 構造法則テンソル
  recursionPotential: number; // 再帰的生成力 (0-1)
  contractionPotential: number; // 収縮力 (0-1)
  fireWaterFlowMap: {
    fireFlow: number; // 火の流れ
    waterFlow: number; // 水の流れ
    flowBalance: number; // 流れのバランス (-1: 水優勢 ～ +1: 火優勢)
  };
  kanagiDominance: {
    lIn: number;
    lOut: number;
    rIn: number;
    rOut: number;
  };
  deviceAffinityProfile: {
    cpuAffinity: number; // CPU親和性 (0-1)
    storageAffinity: number; // ストレージ親和性 (0-1)
    networkAffinity: number; // ネットワーク親和性 (0-1)
    gpuAffinity: number; // GPU親和性 (0-1)
  };
  /** Reishō フェーズ（天津金木フェーズ） */
  reishoPhase?: "L-IN" | "L-OUT" | "R-IN" | "R-OUT";
  /** Reishō 曲線（成長曲線） */
  reishoCurve?: number; // 0-1
  /** 再帰的生成力ブースト（Reishō による強化） */
  recursionPotentialBoost?: number; // 0-1
}

/**
 * シードの再帰的生成力を計算
 */
export function computeSeedRecursionPotential(seed: FractalSeed): number {
  // 再帰的生成力 = ユニット数 × エッジ数 × 生成力 × タグ多様性
  const unitCount = seed.semanticUnitIds.length;
  const edgeCount = seed.compressedRepresentation.semanticEdges.length;
  const weight = seed.compressedRepresentation.seedWeight;
  const tagDiversity = seed.compressedRepresentation.mainTags.length / 10; // 正規化
  
  // 正規化（0-1）
  const recursion = Math.min(1.0, (unitCount * 0.1 + edgeCount * 0.05 + weight * 0.5 + tagDiversity * 0.3));
  return recursion;
}

/**
 * シードの収縮力を計算
 */
export function computeSeedContractionPotential(seed: FractalSeed): number {
  // 収縮力 = 圧縮率 × 統合度 × 構造的安定性
  const compressionRatio = 1.0 / (seed.semanticUnitIds.length || 1); // ユニット数が少ないほど圧縮率が高い
  const integration = seed.compressedRepresentation.semanticEdges.length / (seed.semanticUnitIds.length || 1); // エッジ密度
  const stability = seed.compressedRepresentation.seedWeight; // 生成力 = 安定性の指標
  
  // 正規化（0-1）
  const contraction = Math.min(1.0, (compressionRatio * 0.3 + integration * 0.4 + stability * 0.3));
  return contraction;
}

/**
 * デバイス親和性プロファイルを計算
 */
export function computeDeviceAffinityProfile(seed: FractalSeed): {
  cpuAffinity: number;
  storageAffinity: number;
  networkAffinity: number;
  gpuAffinity: number;
} {
  const unitCount = seed.semanticUnitIds.length;
  const edgeCount = seed.compressedRepresentation.semanticEdges.length;
  const tagCount = seed.compressedRepresentation.mainTags.length;
  const weight = seed.compressedRepresentation.seedWeight;
  
  // CPU親和性: 計算量が多い（ユニット数、エッジ数）
  const cpuAffinity = Math.min(1.0, (unitCount * 0.05 + edgeCount * 0.1 + weight * 0.3));
  
  // ストレージ親和性: データ量が多い（ユニット数、タグ数）
  const storageAffinity = Math.min(1.0, (unitCount * 0.1 + tagCount * 0.05 + weight * 0.2));
  
  // ネットワーク親和性: 分散が必要（エッジ数、複雑度）
  const networkAffinity = Math.min(1.0, (edgeCount * 0.1 + (unitCount > 5 ? 0.5 : 0.2)));
  
  // GPU親和性: 並列処理が必要（タグ数、生成力）
  const gpuAffinity = Math.min(1.0, (tagCount * 0.1 + weight * 0.4));
  
  return {
    cpuAffinity,
    storageAffinity,
    networkAffinity,
    gpuAffinity,
  };
}

/**
 * 構造法則テンソルを計算
 */
export function computeStructuralLawTensor(units: SemanticUnit[]): number[][] {
  // 構造法則テンソル: [法則ID][次元]
  // 各法則をベクトルとして表現
  
  const laws: string[] = [];
  const lawVectors: number[][] = [];
  
  for (const unit of units) {
    if (unit.amatsuKanagiPhase) {
      const lawId = `kanagi:${unit.amatsuKanagiPhase}`;
      if (!laws.includes(lawId)) {
        laws.push(lawId);
        // 法則をベクトル化（簡易版）
        const vector: number[] = [];
        if (unit.enhancedSignature) {
          vector.push(...unit.enhancedSignature.unifiedVector.slice(0, 10)); // 最初の10次元
        } else if (unit.kotodamaSignature) {
          vector.push(...unit.kotodamaSignature.vowelVector);
          vector.push(...unit.kotodamaSignature.consonantVector.slice(0, 5));
        }
        // パディング
        while (vector.length < 10) {
          vector.push(0);
        }
        lawVectors.push(vector.slice(0, 10));
      }
    }
  }
  
  // デフォルト: 空の場合は単位ベクトル
  if (lawVectors.length === 0) {
    return [[1, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  }
  
  return lawVectors;
}

/**
 * 火水流れマップを計算
 */
export function computeFireWaterFlowMap(seed: FractalSeed): {
  fireFlow: number;
  waterFlow: number;
  flowBalance: number;
} {
  const { fire, water, balance } = seed.compressedRepresentation.kotodamaVector;
  
  // 流れ = バランス × 生成力
  const fireFlow = fire * seed.compressedRepresentation.seedWeight;
  const waterFlow = water * seed.compressedRepresentation.seedWeight;
  const flowBalance = balance;
  
  return {
    fireFlow,
    waterFlow,
    flowBalance,
  };
}

/**
 * 天津金木優位性を計算
 */
export function computeKanagiDominance(units: SemanticUnit[]): {
  lIn: number;
  lOut: number;
  rIn: number;
  rOut: number;
} {
  const dominance = {
    lIn: 0,
    lOut: 0,
    rIn: 0,
    rOut: 0,
  };
  
  for (const unit of units) {
    if (unit.amatsuKanagiPhase) {
      dominance[unit.amatsuKanagiPhase]++;
    }
  }
  
  // 正規化
  const total = dominance.lIn + dominance.lOut + dominance.rIn + dominance.rOut;
  if (total > 0) {
    dominance.lIn /= total;
    dominance.lOut /= total;
    dominance.rIn /= total;
    dominance.rOut /= total;
  }
  
  return dominance;
}

/**
 * FractalSeed を宇宙構文核に拡張
 */
export function upgradeToUniversalStructuralSeed(
  seed: FractalSeed,
  units: SemanticUnit[]
): UniversalStructuralSeed {
  const recursionPotential = computeSeedRecursionPotential(seed);
  const contractionPotential = computeSeedContractionPotential(seed);
  const deviceAffinityProfile = computeDeviceAffinityProfile(seed);
  const structuralLawTensor = computeStructuralLawTensor(units);
  const fireWaterFlowMap = computeFireWaterFlowMap(seed);
  const kanagiDominance = computeKanagiDominance(units);
  
  return {
    ...seed,
    structuralLawTensor,
    recursionPotential,
    contractionPotential,
    fireWaterFlowMap,
    kanagiDominance,
    deviceAffinityProfile,
  };
}

