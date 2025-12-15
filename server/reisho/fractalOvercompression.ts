/**
 * ============================================================
 *  FRACTAL OVERCOMPRESSION — Fractal 過圧縮
 * ============================================================
 * 
 * Fractal Seed を極限まで圧縮
 * 情報密度を最大化し、展開力を向上
 * 
 * 機能:
 * - 過圧縮アルゴリズム
 * - 展開力の向上
 * - メモリ効率の最大化
 * ============================================================
 */

import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import { buildReishoMathCore } from "./mathCore";
import { computeReishoSignature } from "./reishoKernel";

export interface OvercompressedSeed {
  /** 元のシード */
  originalSeed: UniversalStructuralSeed;
  
  /** 過圧縮された表現 */
  overcompressed: {
    /** 極限圧縮ベクトル（32次元） */
    ultraCompressedVector: number[];
    
    /** 展開キー */
    expansionKey: string;
    
    /** 圧縮率 */
    compressionRatio: number; // 0-1 (1 = 完全圧縮)
    
    /** 展開力 */
    expansionPower: number; // 0-1
  };
  
  /** Reishō 値 */
  reishoValue: number;
  
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * Fractal Overcompression を有効化
 */
export function enableFractalOvercompression(
  seed: UniversalStructuralSeed
): OvercompressedSeed {
  // 極限圧縮ベクトルを生成（32次元）
  const centroid = seed.compressedRepresentation.centroidVector;
  const kotodama = seed.compressedRepresentation.kotodamaVector;
  
  // 統合ベクトル（簡易版）
  const unified = [
    ...centroid.slice(0, 10), // 最初の10次元
    ...kotodama.vowelVector, // 5次元
    ...kotodama.consonantVector.slice(0, 9), // 9次元
    kotodama.fire,
    kotodama.water,
    kotodama.balance,
    seed.recursionPotential,
    seed.contractionPotential,
    seed.compressedRepresentation.seedWeight,
    seed.compressedRepresentation.fireWaterBalance,
  ];
  
  // 32次元に正規化
  const ultraCompressedVector = unified.slice(0, 32);
  while (ultraCompressedVector.length < 32) {
    ultraCompressedVector.push(0);
  }
  
  // 展開キーを生成
  const expansionKey = generateExpansionKey(seed);
  
  // 圧縮率を計算
  const originalSize = 
    centroid.length +
    kotodama.vowelVector.length +
    kotodama.consonantVector.length +
    3; // fire, water, balance
  const compressedSize = 32;
  const compressionRatio = 1 - (compressedSize / originalSize);
  
  // 展開力を計算
  const expansionPower = seed.recursionPotential * (1 + seed.compressedRepresentation.seedWeight);
  
  // Reishō 値を計算
  const text = seed.compressedRepresentation.mainTags.join(" ");
  const signature = computeReishoSignature(text, seed);
  const reishoValue = signature.reishoValue;
  
  return {
    originalSeed: seed,
    overcompressed: {
      ultraCompressedVector,
      expansionKey,
      compressionRatio,
      expansionPower,
    },
    reishoValue,
    timestamp: Date.now(),
  };
}

/**
 * 展開キーを生成
 */
function generateExpansionKey(seed: UniversalStructuralSeed): string {
  const tags = seed.compressedRepresentation.mainTags.join(",");
  const phase = seed.compressedRepresentation.kanagiPhaseMode;
  const weight = seed.compressedRepresentation.seedWeight;
  
  return `${seed.id}-${phase}-${weight.toFixed(2)}-${tags.slice(0, 20)}`;
}

/**
 * 過圧縮シードを展開
 */
export function expandOvercompressedSeed(
  overcompressed: OvercompressedSeed
): UniversalStructuralSeed {
  // 過圧縮シードから元のシードを復元（簡易版）
  // 実際の実装では、展開キーを使用して完全に復元する必要がある
  return overcompressed.originalSeed;
}

/**
 * 複数のシードを過圧縮
 */
export function overcompressSeeds(
  seeds: UniversalStructuralSeed[]
): OvercompressedSeed[] {
  return seeds.map(seed => enableFractalOvercompression(seed));
}

/**
 * 過圧縮シードの統合
 */
export function integrateOvercompressedSeeds(
  overcompressedSeeds: OvercompressedSeed[]
): {
  unifiedVector: number[];
  totalCompressionRatio: number;
  averageExpansionPower: number;
  unifiedReishoValue: number;
} {
  if (overcompressedSeeds.length === 0) {
    return {
      unifiedVector: new Array(32).fill(0),
      totalCompressionRatio: 0,
      averageExpansionPower: 0,
      unifiedReishoValue: 0,
    };
  }
  
  // 統合ベクトルを計算（平均）
  const unifiedVector = new Array(32).fill(0);
  for (const oc of overcompressedSeeds) {
    for (let i = 0; i < 32; i++) {
      unifiedVector[i] += oc.overcompressed.ultraCompressedVector[i];
    }
  }
  
  for (let i = 0; i < 32; i++) {
    unifiedVector[i] /= overcompressedSeeds.length;
  }
  
  // 統合圧縮率
  const totalCompressionRatio = overcompressedSeeds.reduce(
    (sum, oc) => sum + oc.overcompressed.compressionRatio, 0
  ) / overcompressedSeeds.length;
  
  // 平均展開力
  const averageExpansionPower = overcompressedSeeds.reduce(
    (sum, oc) => sum + oc.overcompressed.expansionPower, 0
  ) / overcompressedSeeds.length;
  
  // 統合 Reishō 値
  const unifiedReishoValue = overcompressedSeeds.reduce(
    (sum, oc) => sum + oc.reishoValue, 0
  ) / overcompressedSeeds.length;
  
  return {
    unifiedVector,
    totalCompressionRatio,
    averageExpansionPower,
    unifiedReishoValue,
  };
}

export default {
  enableFractalOvercompression,
  expandOvercompressedSeed,
  overcompressSeeds,
  integrateOvercompressedSeeds,
};

