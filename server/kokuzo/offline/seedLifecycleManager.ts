/**
 * ============================================================
 *  SEED LIFECYCLE MANAGER — 学習データのライフサイクル制御
 * ============================================================
 * 
 * Kokūzōに入った学習データを自動で強化・弱化・自然消滅させる
 * UIには出さない（完全内部）
 * ============================================================
 */

import type { FractalSeed } from "../db/schema/fractalSeed";
import type { SemanticUnit } from "../db/schema/semanticUnit";

/**
 * Weight 管理パラメータ
 */
export interface LifecycleConfig {
  /** Weight 増加率（参照時） */
  weightIncreaseRate: number; // デフォルト: 0.1
  /** Weight 減衰率（未参照時） */
  weightDecayRate: number; // デフォルト: 0.05
  /** Weight 減衰間隔（ミリ秒） */
  decayInterval: number; // デフォルト: 7日 (604800000ms)
  /** Weight 閾値（これ以下は推論に使わない） */
  weightThreshold: number; // デフォルト: 0.1
  /** 最大 Weight */
  maxWeight: number; // デフォルト: 1.0
  /** 最小 Weight */
  minWeight: number; // デフォルト: 0.0
}

const DEFAULT_CONFIG: LifecycleConfig = {
  weightIncreaseRate: 0.1,
  weightDecayRate: 0.05,
  decayInterval: 7 * 24 * 60 * 60 * 1000, // 7日
  weightThreshold: 0.1,
  maxWeight: 1.0,
  minWeight: 0.0,
};

/**
 * Seed を参照した時に Weight を増加
 */
export function increaseSeedWeight(
  seed: FractalSeed,
  config: Partial<LifecycleConfig> = {}
): FractalSeed {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentWeight = seed.lifecycle?.weight || seed.compressedRepresentation.seedWeight || 0.5;
  
  const newWeight = Math.min(
    currentWeight + cfg.weightIncreaseRate,
    cfg.maxWeight
  );

  return {
    ...seed,
    lifecycle: {
      weight: newWeight,
      lastReferencedAt: Date.now(),
      ttlHint: seed.lifecycle?.ttlHint || undefined,
    },
    compressedRepresentation: {
      ...seed.compressedRepresentation,
      seedWeight: newWeight,
    },
    updatedAt: Date.now(),
  };
}

/**
 * SemanticUnit を参照した時に Weight を増加
 */
export function increaseUnitWeight(
  unit: SemanticUnit,
  config: Partial<LifecycleConfig> = {}
): SemanticUnit {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentWeight = unit.lifecycle?.weight || unit.importance || 0.5;
  
  const newWeight = Math.min(
    currentWeight + cfg.weightIncreaseRate,
    cfg.maxWeight
  );

  return {
    ...unit,
    lifecycle: {
      weight: newWeight,
      lastReferencedAt: Date.now(),
      ttlHint: unit.lifecycle?.ttlHint || undefined,
    },
    importance: newWeight,
    updatedAt: Date.now(),
  };
}

/**
 * 一定期間参照されていない Seed の Weight を減衰
 */
export function decaySeedWeight(
  seed: FractalSeed,
  config: Partial<LifecycleConfig> = {}
): FractalSeed {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentWeight = seed.lifecycle?.weight || seed.compressedRepresentation.seedWeight || 0.5;
  const lastReferencedAt = seed.lifecycle?.lastReferencedAt || seed.createdAt;
  const now = Date.now();

  // 減衰間隔を過ぎているかチェック
  if (now - lastReferencedAt < cfg.decayInterval) {
    return seed; // 減衰不要
  }

  // Weight を減衰
  const newWeight = Math.max(
    currentWeight - cfg.weightDecayRate,
    cfg.minWeight
  );

  return {
    ...seed,
    lifecycle: {
      weight: newWeight,
      lastReferencedAt,
      ttlHint: seed.lifecycle?.ttlHint || undefined,
    },
    compressedRepresentation: {
      ...seed.compressedRepresentation,
      seedWeight: newWeight,
    },
    updatedAt: Date.now(),
  };
}

/**
 * 一定期間参照されていない SemanticUnit の Weight を減衰
 */
export function decayUnitWeight(
  unit: SemanticUnit,
  config: Partial<LifecycleConfig> = {}
): SemanticUnit {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const currentWeight = unit.lifecycle?.weight || unit.importance || 0.5;
  const lastReferencedAt = unit.lifecycle?.lastReferencedAt || unit.createdAt;
  const now = Date.now();

  // 減衰間隔を過ぎているかチェック
  if (now - lastReferencedAt < cfg.decayInterval) {
    return unit; // 減衰不要
  }

  // Weight を減衰
  const newWeight = Math.max(
    currentWeight - cfg.weightDecayRate,
    cfg.minWeight
  );

  return {
    ...unit,
    lifecycle: {
      weight: newWeight,
      lastReferencedAt,
      ttlHint: unit.lifecycle?.ttlHint || undefined,
    },
    importance: newWeight,
    updatedAt: Date.now(),
  };
}

/**
 * Seed が推論に使えるかチェック（weight >= threshold）
 */
export function canUseSeedForReasoning(
  seed: FractalSeed,
  config: Partial<LifecycleConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const weight = seed.lifecycle?.weight || seed.compressedRepresentation.seedWeight || 0.5;
  return weight >= cfg.weightThreshold;
}

/**
 * SemanticUnit が推論に使えるかチェック（weight >= threshold）
 */
export function canUseUnitForReasoning(
  unit: SemanticUnit,
  config: Partial<LifecycleConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const weight = unit.lifecycle?.weight || unit.importance || 0.5;
  return weight >= cfg.weightThreshold;
}

/**
 * Seed リストから推論に使えるものだけをフィルタ
 */
export function filterUsableSeeds(
  seeds: FractalSeed[],
  config: Partial<LifecycleConfig> = {}
): FractalSeed[] {
  return seeds.filter((seed) => canUseSeedForReasoning(seed, config));
}

/**
 * SemanticUnit リストから推論に使えるものだけをフィルタ
 */
export function filterUsableUnits(
  units: SemanticUnit[],
  config: Partial<LifecycleConfig> = {}
): SemanticUnit[] {
  return units.filter((unit) => canUseUnitForReasoning(unit, config));
}

/**
 * バッチで Weight 減衰を実行
 */
export async function batchDecayWeights(
  seeds: FractalSeed[],
  units: SemanticUnit[],
  config: Partial<LifecycleConfig> = {}
): Promise<{
  decayedSeeds: FractalSeed[];
  decayedUnits: SemanticUnit[];
}> {
  const decayedSeeds = seeds.map((seed) => decaySeedWeight(seed, config));
  const decayedUnits = units.map((unit) => decayUnitWeight(unit, config));

  return {
    decayedSeeds,
    decayedUnits,
  };
}

