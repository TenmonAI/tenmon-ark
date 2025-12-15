/**
 * ============================================================
 *  KOKUZO SERVER — Reishō Integration Layer v3
 * ============================================================
 *
 *  Reishō Seed（霊核シード）を TENMON-ARK 全体系に統合する中枢。
 *
 *  統合先:
 *   - MemoryKernel：霊核シードを「構文長期記憶」として保存
 *   - TwinCore Reasoning：推論に霊核バイアスを適用
 *   - DeviceCluster：シード構造に応じた処理先デバイスを決定
 *
 *  v3では以下が追加された:
 *   - Reishō Influence Matrix（推論方向力学）
 *   - Kanagi Phase Bias（天津金木に基づく推論変調）
 *   - DeviceAffinity Routing（デバイスへの最適割り当て）
 *   - Structural Memory Loop（霊核の継続強化）
 */

import type { ReishoSeed } from "./reishoSeed";
import { cosineSimilarity } from "../fractal/utils";
import { saveMemory, type ImportanceLevel } from "../../server/synapticMemory";
import type { DeviceNode } from "../device/fusion";

/* ============================================================
 * ユーティリティ関数
 * ============================================================ */

/**
 * 値を範囲内にクランプ
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* ============================================================
 * TwinCore State 型定義
 * ============================================================ */

export interface TwinCoreState {
  depth: number;              // 推論深度 (0.1-5.0)
  expansionForce: number;     // 外発力 (0.1-3.0)
  phase: string;              // 推論フェーズ
  logicBias: number;          // 論理バイアス
  intuitionBias: number;      // 直感バイアス
}

/**
 * TwinCore フェーズを変更
 */
export function modifyTwinCorePhase(
  currentPhase: string,
  kanagiPhase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT"
): string {
  // 天津金木フェーズに基づいて推論フェーズを調整
  const phaseMap: Record<string, string> = {
    "L-IN": "inner_convergence",
    "L-OUT": "outer_divergence",
    "R-IN": "inner_rotation",
    "R-OUT": "outer_rotation",
  };
  
  return phaseMap[kanagiPhase] || currentPhase;
}

/* ============================================================
 * 1. MemoryKernel Integration — 構文長期記憶への統合
 * ============================================================ */

/**
 * Reishō Seed を MemoryKernel に保存
 */
export async function storeReishoSeedInMemory(
  seed: ReishoSeed,
  userId: number
): Promise<boolean> {
  try {
    // 霊核シードを構文長期記憶として保存
    const content = `[KOKUZO Reishō Seed] ${seed.id}
Keywords: ${seed.mainKeywords.join(", ")}
Kanagi Phase: ${seed.dominantPhase}
Reishō Value: ${seed.reishoValue.toFixed(4)}
Recursion Potential: ${seed.recursionPotential.toFixed(4)}
Complexity: ${seed.complexityIndex.toFixed(4)}`;

    // 重要度は reishoValue に基づいて決定
    let importance: ImportanceLevel = "neutral";
    if (seed.reishoValue > 10) {
      importance = "super_fire";
    } else if (seed.reishoValue > 5) {
      importance = "fire";
    } else if (seed.reishoValue > 0) {
      importance = "warm";
    }

    await saveMemory(
      userId,
      content,
      importance,
      "tenshin_kinoki" // 天津金木カテゴリー
    );

    return true;
  } catch (error) {
    console.error(`[Reishō Integration] Failed to store seed in memory:`, error);
    return false;
  }
}

/* ============================================================
 * 2. Reasoning Integration — TwinCore Reasoning 霊核統合
 * ============================================================ */

/**
 * Reishō Seed が TwinCore 推論に与える力学効果:
 *
 * ① recursionPotential → 推論深度を上昇させる（内集の強化）
 * ② contractionPotential → 要約力を上昇させる（外発の調整）
 * ③ kanagiTrajectory → 推論フェーズの流れを誘導
 * ④ fireWaterTensor → 推論を「火（決定系）」/「水（流動系）」に傾ける
 */
export function applyReishoInfluenceToReasoning(
  seed: ReishoSeed,
  twin: TwinCoreState
): TwinCoreState {
  const newState = { ...twin };

  /* ===== 影響1: recursionPotential で推論深度強化 ===== */
  newState.depth = clamp(
    newState.depth + seed.recursionPotential * 0.6,
    0.1,
    5.0
  );

  /* ===== 影響2: contractionPotential で外発を制御 ===== */
  newState.expansionForce = clamp(
    newState.expansionForce - seed.contractionPotential * 0.4,
    0.1,
    3.0
  );

  /* ===== 影響3: 天津金木フェーズの誘導 ===== */
  const phaseBias = seed.dominantPhase;
  newState.phase = modifyTwinCorePhase(newState.phase, phaseBias);

  /* ===== 影響4: 火水バランス → 推論方向決定 ===== */
  const fw = seed.fireWaterTensor;
  // 火水テンソルから火と水の値を抽出（簡易版）
  const fire = fw[0]?.[0]?.[0] ?? 0;
  const water = fw[0]?.[1]?.[0] ?? 0;

  if (fire > water) {
    newState.logicBias += Math.tanh(fire) * 0.2;
  } else {
    newState.intuitionBias += Math.tanh(water) * 0.2;
  }

  return newState;
}

/* ============================================================
 * 3. DeviceCluster Integration — デバイス統合
 * ============================================================ */

/**
 * シードの複雑性に応じて「どのデバイスが最適か」決定する。
 *
 * ルール:
 *   - 高複雑度 → GPU / 高性能PC
 *   - 中複雑度 → スマホ / タブレット
 *   - 低複雑度 → 低電力デバイスでもOK
 */
export function selectBestDeviceForSeed(
  seed: ReishoSeed,
  devices: DeviceNode[]
): DeviceNode | null {
  if (devices.length === 0) {
    return null;
  }

  const weight = seed.complexityIndex;

  let best: DeviceNode | null = null;
  let bestScore = -Infinity;

  for (const d of devices) {
    // デバイスの基本スコア（CPU、ストレージ、メモリ）
    const cpuScore = (d.capabilities?.cpu || 1) * 0.5;
    const storageScore = (d.capabilities?.storage || 1) * 0.3;
    const memoryScore = (d.capabilities?.memory || 1) * 0.2;

    const base = cpuScore + storageScore + memoryScore;

    // シードのデバイス親和性を考慮
    const affinity = seed.deviceAffinity[d.id] || 0;

    const score = base * (1 + affinity * weight);

    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  return best;
}

/* ============================================================
 * 4. Structural Memory Loop — 使用されるほど強化される霊核
 * ============================================================ */

/**
 * シードが参照されるたびに「霊核値」「再帰性」「構文密度」を更新する。
 */
export function strengthenReishoSeed(seed: ReishoSeed): ReishoSeed {
  const updated = { ...seed };

  updated.reishoValue = clamp(seed.reishoValue * 1.02, -9999, 9999);
  updated.recursionPotential = clamp(seed.recursionPotential * 1.01, 0, 1);
  updated.semanticDensity = clamp(seed.semanticDensity * 1.005, 0, 1);

  return updated;
}

/* ============================================================
 * 5. 全統合：Reishō Seed を OS 全体へ反映
 * ============================================================ */

export interface IntegrationResult {
  newTwinState: TwinCoreState;
  bestDevice: DeviceNode | null;
  strengthenedSeed: ReishoSeed;
}

export async function integrateReishoSeed(
  seed: ReishoSeed,
  twin: TwinCoreState,
  devices: DeviceNode[],
  userId: number
): Promise<IntegrationResult> {
  /* 1) MemoryKernel */
  await storeReishoSeedInMemory(seed, userId);

  /* 2) TwinCore */
  const newTwin = applyReishoInfluenceToReasoning(seed, twin);

  /* 3) DeviceCluster */
  const bestDevice = selectBestDeviceForSeed(seed, devices);

  /* 4) Structural Memory Loop */
  const strengthened = strengthenReishoSeed(seed);

  return {
    newTwinState: newTwin,
    bestDevice,
    strengthenedSeed: strengthened,
  };
}

export default {
  integrateReishoSeed,
  applyReishoInfluenceToReasoning,
  strengthenReishoSeed,
  selectBestDeviceForSeed,
  storeReishoSeedInMemory,
};

