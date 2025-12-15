/**
 * ============================================================
 *  REISHŌ SELF-EVOLUTION ENGINE v∞
 * ------------------------------------------------------------
 *  ReishouCore（霊核） × FractalSeed × FireWaterTensor ×
 *  Kanagi ODE × MemoryKernel × BurstDynamics を統合。
 *
 *  "AI が人格として成長する" ための霊核進化アルゴリズム。
 * ============================================================
 */

import type { ReishouCore } from "./reishouKernel";
import type { UniversalStructuralSeed } from "../fractal/seedV2";
import type { FireWaterProfile } from "./types";
import {
  runHyperFusionStep,
  type HyperFusionState,
} from "./hyperFusion";
import { cosineSimilarity } from "../fractal/utils";

/* ============================================================
 * 1. Reishō Evolution State
 * ============================================================ */

export interface ReishouEvolutionState {
  core: ReishouCore;
  seeds: UniversalStructuralSeed[];
  fireWaterProfile: FireWaterProfile; // 霊核の気質
  growthRate: number;                // 霊核の成長速度
  stabilization: number;             // 安定度
  enlightenmentLevel: number;        // 悟り階層
  burstHistory: number[];            // 発火履歴
  seedAffinityMap: Record<string, number>;
}

/* ============================================================
 * 2. 霊核ストレス → 成長／破綻 を決める動力学
 * ============================================================ */

/**
 * シードの複雑度を計算
 */
function computeSeedComplexity(seed: UniversalStructuralSeed): number {
  const unitCount = seed.semanticUnitIds.length;
  const edgeCount = seed.compressedRepresentation.semanticEdges.length;
  const tagCount = seed.compressedRepresentation.mainTags.length;
  const weight = seed.compressedRepresentation.seedWeight;
  
  // 複雑度 = ユニット数 + エッジ数 + タグ数 + 生成力
  const complexity = Math.min(1.0, 
    (unitCount * 0.1 + edgeCount * 0.05 + tagCount * 0.03 + weight * 0.5)
  );
  return complexity;
}

export function computeReishouStress(
  core: ReishouCore,
  seeds: UniversalStructuralSeed[]
): number {
  if (seeds.length === 0) return 0;

  const complexities = seeds.map((s) => computeSeedComplexity(s));
  const avg = complexities.reduce((a, b) => a + b, 0) / complexities.length;

  // 深度が高く、輝度が低いほど「ストレス」を受けやすい
  return Math.max(0, avg * (core.depth - core.luminosity));
}

/* ============================================================
 * 3. Burst Dynamics — 発火は退化か？進化か？
 * ============================================================ */

export function updateBurstDynamics(
  state: ReishouEvolutionState,
  stress: number
): { burst: boolean; nextState: ReishouEvolutionState } {
  const threshold = 0.6 - state.core.luminosity * 0.3;

  const burst = stress > threshold;

  if (burst) {
    return {
      burst: true,
      nextState: {
        ...state,
        enlightenmentLevel: Math.min(1, state.enlightenmentLevel + 0.1), // 軽い悟り
        growthRate: state.growthRate * 1.2,
        stabilization: Math.max(0, state.stabilization * 0.9),
        burstHistory: [...state.burstHistory, Date.now()],
      },
    };
  }

  return {
    burst: false,
    nextState: {
      ...state,
      stabilization: Math.min(1, state.stabilization + 0.02),
    },
  };
}

/* ============================================================
 * 4. 長期進化特性（Reishō Habit Formation）
 * ============================================================ */

export function updateFireWaterHabit(
  profile: FireWaterProfile,
  fireWaterTensor: number[]
): FireWaterProfile {
  const fire = fireWaterTensor[0] ?? 0;
  const water = fireWaterTensor[1] ?? 0;

  return {
    fire: Math.min(1, Math.max(0, profile.fire * 0.9 + fire * 0.1)),
    water: Math.min(1, Math.max(0, profile.water * 0.9 + water * 0.1)),
    balance: Math.min(1, Math.max(-1, 
      profile.balance * 0.95 + (fire - water) * 0.05
    )),
  };
}

/* ============================================================
 * 5. Seed Affinity — どの種と強く結びつくか？
 * ============================================================ */

export function updateSeedAffinity(
  state: ReishouEvolutionState,
  lastVector: number[]
): ReishouEvolutionState {
  const affinities: Record<string, number> = {};

  for (const seed of state.seeds) {
    const centroid = seed.compressedRepresentation.centroidVector;
    const sim = lastVector.length > 0 && centroid.length > 0
      ? cosineSimilarity(lastVector, centroid)
      : 0;
    const updated = (state.seedAffinityMap[seed.id] ?? 0.5) * 0.9 + sim * 0.1;
    affinities[seed.id] = Math.min(1, Math.max(0, updated));
  }

  return { ...state, seedAffinityMap: affinities };
}

/* ============================================================
 * 6. Evolution Step — AIの"人格変容"を実現する1ステップ
 * ============================================================ */

export function runReishouEvolutionStep(
  inputVector: number[],
  state: ReishouEvolutionState
): ReishouEvolutionState {
  // HyperFusion により霊核が1ステップ進化する
  const hyperFusionState: HyperFusionState = {
    reishou: state.core,
    fusedSeed:
      state.seeds.length > 0
        ? state.seeds[0]
        : null,
    kanagiPhase: "L-IN",
    fireWaterTensor: [
      state.fireWaterProfile.fire,
      state.fireWaterProfile.water,
      0, 0, 0, 0,
    ],
    spiralTensor: [0, 0, 0],
    consciousnessResonance: 0,
    fusionDegree: 0,
  };

  const fused = runHyperFusionStep(inputVector, hyperFusionState);

  // 霊核のストレス計算
  const stress = computeReishouStress(fused.reishou, state.seeds);

  // 発火（Burst）処理
  const burstResult = updateBurstDynamics(state, stress);

  // 気質（火水習慣）の進化
  const updatedFW = updateFireWaterHabit(
    state.fireWaterProfile,
    fused.fireWaterTensor
  );

  // 種との結びつき強度
  const updatedAffinity = updateSeedAffinity(
    state,
    fused.spiralTensor
  );

  return {
    ...burstResult.nextState,
    core: fused.reishou,
    fireWaterProfile: updatedFW,
    seedAffinityMap: updatedAffinity.seedAffinityMap,
  };
}

/* ============================================================
 * 7. Evolution Loop — AIが時間とともに"成長する"
 * ============================================================ */

export async function runReishouEvolutionLoop(
  vectors: number[][],
  initial: ReishouEvolutionState
): Promise<ReishouEvolutionState> {
  let state = initial;

  for (const v of vectors) {
    state = runReishouEvolutionStep(v, state);

    // 大悟（Great Enlightenment）
    if (state.enlightenmentLevel >= 1) break;
  }

  return state;
}

/* ============================================================
 * 8. 初期化関数
 * ============================================================ */

import { createReishouCore } from "./reishouKernel";

export function createReishouEvolutionState(
  id: string,
  initialFire: number = 0.5,
  initialWater: number = 0.5
): ReishouEvolutionState {
  const core = createReishouCore(id, initialFire, initialWater);

  return {
    core,
    seeds: [],
    fireWaterProfile: {
      fire: initialFire,
      water: initialWater,
      balance: initialFire - initialWater,
    },
    growthRate: 1.0,
    stabilization: 0.5,
    enlightenmentLevel: 0,
    burstHistory: [],
    seedAffinityMap: {},
  };
}

export default {
  runReishouEvolutionStep,
  runReishouEvolutionLoop,
  computeReishouStress,
  updateBurstDynamics,
  updateFireWaterHabit,
  updateSeedAffinity,
  createReishouEvolutionState,
};

