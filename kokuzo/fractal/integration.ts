/**
 * 🔱 KOKŪZŌ Fractal Engine — 統合層
 * MemoryKernel / TwinCore / DeviceCluster との統合
 */

import type { SemanticUnit } from "../semantic/engine";
import type { FractalSeed } from "./compression";
import type { ReasoningChainResult } from "../../server/twinCoreEngine";
import type { DeviceNode } from "../device/fusion";

/**
 * MemoryKernel に SemanticUnit と FractalSeed を保存（完全統合版）
 */
export async function storeInMemoryKernel(
  unit: SemanticUnit,
  seed?: FractalSeed,
  userId?: number
): Promise<void> {
  if (!userId) {
    // userId がない場合はログのみ
    console.log(`[KOKUZO Integration] Storing SemanticUnit: ${unit.id} (no userId)`);
    if (seed) {
      console.log(`[KOKUZO Integration] Storing FractalSeed: ${seed.id} (no userId)`);
    }
    return;
  }

  try {
    // MemoryKernel の saveMemory を使用
    const { saveMemory } = await import("../../server/synapticMemory");
    
    // SemanticUnit を記憶として保存
    const unitContent = `[KOKUZO SemanticUnit] ${unit.rawText || unit.id}\nTags: ${unit.tags.join(", ")}\nPhase: ${unit.amatsuKanagiPhase || "N/A"}`;
    await saveMemory(userId, unitContent, "neutral", "tenshin_kinoki");
    
    if (seed) {
      // FractalSeed を記憶として保存
      const seedContent = `[KOKUZO FractalSeed] ${seed.id}\nTags: ${seed.compressedRepresentation.mainTags.join(", ")}\nPhase: ${seed.compressedRepresentation.kanagiPhaseMode}\nWeight: ${seed.compressedRepresentation.seedWeight.toFixed(3)}`;
      await saveMemory(userId, seedContent, "fire", "tenshin_kinoki");
    }
    
    console.log(`[KOKUZO Integration] Stored SemanticUnit: ${unit.id} and ${seed ? `FractalSeed: ${seed.id}` : 'no seed'}`);
  } catch (error) {
    console.error(`[KOKUZO Integration] Failed to store in MemoryKernel:`, error);
    // エラー時も続行（非同期処理のため）
  }
}

/**
 * SemanticUnit と Seed を一緒に保存（完全統合版）
 */
export async function storeSemanticUnitWithSeed(
  unit: SemanticUnit,
  seed: FractalSeed,
  userId: number
): Promise<void> {
  await storeInMemoryKernel(unit, seed, userId);
}

/**
 * 構造的シードを取得
 */
export async function retrieveStructuralSeeds(
  userId: number,
  limit: number = 10
): Promise<FractalSeed[]> {
  // TODO: MemoryKernel から構造的シードを取得
  // 現在はプレースホルダー
  console.log(`[KOKUZO Integration] Retrieving structural seeds for user: ${userId}, limit: ${limit}`);
  return [];
}

/**
 * 使用に基づいてシードを強化
 */
export async function strengthenSeedBasedOnUsage(
  seedId: string,
  usageCount: number,
  userId: number
): Promise<void> {
  // TODO: MemoryKernel でシードの使用回数を記録し、生成力を強化
  console.log(`[KOKUZO Integration] Strengthening seed: ${seedId}, usage: ${usageCount}`);
}

/**
 * TwinCore の推論結果と SemanticUnit を統合して天津金木フェーズを計算
 */
export function computeKanagiPhaseWithTwinCore(
  unit: SemanticUnit,
  tcResult: ReasoningChainResult
): "L-IN" | "L-OUT" | "R-IN" | "R-OUT" {
  // TwinCore の結果から天津金木フェーズを決定
  const { fireWater, rotation, convergenceDivergence } = tcResult;
  
  // 左右旋の判定
  const isLeftRotation = rotation.dominantRotation === "左旋" || rotation.leftRotation > rotation.rightRotation;
  
  // 内集外発の判定
  const isInner = convergenceDivergence.dominantMovement === "内集" || 
                  fireWater.dominantElement === "水" ||
                  fireWater.balance < 0;
  
  // フェーズ決定
  if (isLeftRotation && isInner) return "L-IN";
  if (isLeftRotation && !isInner) return "L-OUT";
  if (!isLeftRotation && isInner) return "R-IN";
  return "R-OUT";
}

/**
 * DeviceCluster でタスクをルーティング（シードの複雑度に基づく）
 */
export function routeTaskBySeedComplexity(
  seed: FractalSeed,
  devices: DeviceNode[]
): string {
  // シードの複雑度を計算
  const complexity = calculateSeedComplexity(seed);
  
  // 複雑度に応じてデバイスを選択
  // 高複雑度 → 高CPUデバイス
  // 低複雑度 → 低CPUデバイスでも可
  const sortedDevices = devices
    .map(d => ({
      id: d.id,
      score: (d.capabilities?.cpu || 1) * (complexity > 0.7 ? 1.5 : 1.0),
    }))
    .sort((a, b) => b.score - a.score);
  
  return sortedDevices[0]?.id || devices[0]?.id || "default";
}

/**
 * シードの複雑度を計算
 */
function calculateSeedComplexity(seed: FractalSeed): number {
  // 複雑度 = ユニット数 + エッジ数 + タグ数 + 生成力
  const unitCount = seed.semanticUnitIds.length;
  const edgeCount = seed.compressedRepresentation.semanticEdges.length;
  const tagCount = seed.compressedRepresentation.mainTags.length;
  const weight = seed.compressedRepresentation.seedWeight;
  
  // 正規化（0-1）
  const complexity = Math.min(1.0, (unitCount * 0.1 + edgeCount * 0.05 + tagCount * 0.03 + weight * 0.5));
  return complexity;
}

/**
 * TwinCore でシードを「構造的記憶」として使用
 */
export function useSeedAsStructuralMemory(
  seed: FractalSeed,
  tcResult: ReasoningChainResult
): ReasoningChainResult {
  // シードの情報を TwinCore の結果に統合
  const enhancedResult: ReasoningChainResult = {
    ...tcResult,
    // シードの火水バランスを TwinCore の結果に反映
    fireWater: {
      ...tcResult.fireWater,
      balance: (tcResult.fireWater.balance + seed.compressedRepresentation.fireWaterBalance) / 2,
    },
    // シードの天津金木フェーズを TwinCore の結果に反映
    amatsuKanagi: {
      ...tcResult.amatsuKanagi,
      // シードのフェーズ情報を追加（簡易版）
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
  
  return enhancedResult;
}

