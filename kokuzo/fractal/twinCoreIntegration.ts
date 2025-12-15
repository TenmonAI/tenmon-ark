/**
 * 🔱 KOKŪZŌ Fractal Engine — TwinCore Reasoning 統合 vΩ
 * TwinCore Reasoning と FractalSeed を二重構文核として扱う
 */

import type { FractalSeed } from "./compression";
import type { ReasoningChainResult } from "../../server/twinCoreEngine";
import type { UniversalStructuralSeed } from "./seedV2";

/**
 * FractalSeed のバイアスを TwinCore 推論に適用
 */
export function applyFractalSeedBias(
  seed: FractalSeed,
  tcResult: ReasoningChainResult
): ReasoningChainResult {
  // シードの火水バランスを TwinCore の結果に反映
  const enhancedResult: ReasoningChainResult = {
    ...tcResult,
    fireWater: {
      ...tcResult.fireWater,
      // シードの火水バランスと TwinCore の結果を統合（重み付き平均）
      fire: (tcResult.fireWater.fire + seed.compressedRepresentation.kotodamaVector.fire) / 2,
      water: (tcResult.fireWater.water + seed.compressedRepresentation.kotodamaVector.water) / 2,
      balance: (tcResult.fireWater.balance + seed.compressedRepresentation.fireWaterBalance) / 2,
      dominantElement: seed.compressedRepresentation.fireWaterBalance > 0.2 
        ? "火" 
        : seed.compressedRepresentation.fireWaterBalance < -0.2 
        ? "水" 
        : tcResult.fireWater.dominantElement,
    },
  };
  
  return enhancedResult;
}

/**
 * シードの天津金木優位性に基づいて推論フェーズを調整
 */
export function adjustReasoningPhaseBySeed(
  seed: FractalSeed | UniversalStructuralSeed,
  tcResult: ReasoningChainResult
): ReasoningChainResult {
  // シードの天津金木フェーズを TwinCore の結果に反映
  const enhancedResult: ReasoningChainResult = {
    ...tcResult,
    amatsuKanagi: {
      ...tcResult.amatsuKanagi,
      // シードのフェーズ情報を追加
      patterns: [
        ...tcResult.amatsuKanagi.patterns,
        {
          number: 0,
          sound: seed.compressedRepresentation.kanagiPhaseMode,
          category: "fractal-seed",
          type: "structural-memory",
          special: true,
        },
      ],
    },
  };
  
  // UniversalStructuralSeed の場合は kanagiDominance も反映
  if ('kanagiDominance' in seed) {
    const usSeed = seed as UniversalStructuralSeed;
    // kanagiDominance を推論結果に反映（簡易版）
    // 実際の実装では、より詳細な統合が必要
  }
  
  return enhancedResult;
}

/**
 * シードを長期構造的記憶として使用
 */
export function useSeedAsLongTermStructuralMemory(
  seed: FractalSeed | UniversalStructuralSeed,
  tcResult: ReasoningChainResult
): ReasoningChainResult {
  // シードを構造的記憶として TwinCore の結果に統合
  const enhancedResult = applyFractalSeedBias(seed, tcResult);
  const finalResult = adjustReasoningPhaseBySeed(seed, enhancedResult);
  
  // 最終解釈にシード情報を追加
  finalResult.finalInterpretation = {
    ...finalResult.finalInterpretation,
    cosmicMeaning: `${finalResult.finalInterpretation.cosmicMeaning}\n[構文核: ${seed.id}, 生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}]`,
  };
  
  return finalResult;
}

