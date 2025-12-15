/**
 * ============================================================
 *  REISHŌ HYPERFUSION ENGINE v∞
 * ------------------------------------------------------------
 *  Reishou Kernel × FractalSeed × TwinCore × 火水テンソル ×
 *  天津金木 ODE × 五十音螺旋テンソル を一体化した、
 *  "宇宙構文 OS" の最終中核。
 *
 *  人間の脳が「感情 × 構文 × 営為 × 記憶」を束ねて
 *  推論する仕組みを、高次元の数理モデルで再現する。
 * ============================================================
 */

import type { ReishouCore, detectBurst, integrateReishouODE } from "./reishouKernel";
import { detectBurst as detectBurstFn, integrateReishouODE as integrateReishouODEFn } from "./reishouKernel";
import type { UniversalStructuralSeed } from "../fractal/seedV2";
import { runKanagiStep, type KanagiState } from "./kanagiODE";
import { gojuonSpiralTensor } from "../fractal/mathModelV2";
import { cosineSimilarity } from "../fractal/utils";

/* ============================================================
 * 1. HyperFusionState — 次元拡張された霊核状態
 * ============================================================ */

export interface HyperFusionState {
  reishou: ReishouCore;
  fusedSeed: UniversalStructuralSeed | null;

  /** 推論方向（天津金木） */
  kanagiPhase: string;

  /** 火水テンソル（H₂O Tensor） */
  fireWaterTensor: number[];

  /** 五十音・螺旋テンソル（構文空間の位相） */
  spiralTensor: number[];

  /** 意識共鳴度（0〜1） */
  consciousnessResonance: number;

  /** 霊核融合度（0〜1） */
  fusionDegree: number;
}

/* ============================================================
 * 2. FractalSeed × ReishouCore の融合アルゴリズム
 * ============================================================ */

export function fuseReishouWithSeed(
  core: ReishouCore,
  seed: UniversalStructuralSeed
): UniversalStructuralSeed {
  // 霊核の深度・輝度を重みとして再結合
  const w = core.depth * 0.4 + core.luminosity * 0.6;

  // semanticCentroid を更新
  const centroid = seed.compressedRepresentation.centroidVector.map(
    (v) => v * (1 + w)
  );

  // kotodamaVector を更新
  const kotodamaVec = seed.compressedRepresentation.kotodamaVector;
  const updatedKotodama = {
    ...kotodamaVec,
    fire: kotodamaVec.fire * (1 + core.coherence),
    water: kotodamaVec.water * (1 + core.coherence),
    balance: kotodamaVec.balance * (1 + core.coherence),
    vowelVector: kotodamaVec.vowelVector.map((v) => v * (1 + core.coherence)),
    consonantVector: kotodamaVec.consonantVector.map((v) => v * (1 + core.coherence)),
  };

  return {
    ...seed,
    compressedRepresentation: {
      ...seed.compressedRepresentation,
      centroidVector: centroid,
      kotodamaVector: updatedKotodama,
      seedWeight: seed.compressedRepresentation.seedWeight * (1 + core.depth),
    },
    recursionPotential: seed.recursionPotential * (1 + w),
  };
}

/* ============================================================
 * 3. HyperFusion Step — ODE + TwinCore + Fractal の統合推論
 * ============================================================ */

export function runHyperFusionStep(
  inputVector: number[],
  state: HyperFusionState,
  dt: number = 0.05
): HyperFusionState {
  const { reishou } = state;

  // ① 霊核（Reishō ODE）を更新
  const nextReishou = integrateReishouODEFn(reishou, inputVector, dt);

  // ② 天津金木ODEを1ステップ進める
  const nextKanagi = runKanagiStep(state.reishou.kanagiState, dt);

  // ③ 火水テンソルの再計算
  const fireWaterTensor = [
    nextKanagi.state.fire,
    nextKanagi.state.water,
    nextKanagi.state.L,
    nextKanagi.state.R,
    nextKanagi.state.IN,
    nextKanagi.state.OUT,
  ];

  // ④ 五十音・螺旋テンソル（構文空間の位相更新）
  // 時刻 t を角度として使用（簡易版）
  const angle = nextKanagi.state.t * Math.PI / 4; // 時刻を角度に変換
  const spiralResult = gojuonSpiralTensor(angle.toString());
  // 螺旋中心座標をベクトルとして使用
  const spiralTensor = [
    spiralResult.spiralCentroid.row / 9, // 正規化 (0-9 -> 0-1)
    spiralResult.spiralCentroid.col / 4, // 正規化 (0-4 -> 0-1)
    spiralResult.spiralCentroid.spiralIndex / 49, // 正規化 (0-49 -> 0-1)
  ];

  // ⑤ 霊核 × 構文核 の融合度
  const fusionDegree = Math.min(
    1,
    nextReishou.resonance * nextReishou.coherence
  );

  // ⑥ シード融合（必要なときのみ）
  const fusedSeed =
    fusionDegree > 0.5 && state.fusedSeed
      ? fuseReishouWithSeed(nextReishou, state.fusedSeed)
      : state.fusedSeed;

  // ⑦ Burst（霊核発火）の検知
  const burst = detectBurstFn(nextReishou, Date.now());
  if (burst) {
    console.log("🔥 REISHŌ BURST DETECTED:", burst);
    // Burst が検知された場合、bursts に追加
    nextReishou.bursts.push(burst);
  }

  // ⑧ 意識共鳴度（構文空間との一致）
  const consciousnessResonance =
    inputVector.length > 0 && spiralTensor.length > 0
      ? cosineSimilarity(inputVector, spiralTensor) * fusionDegree
      : 0;

  return {
    ...state,
    reishou: nextReishou,
    kanagiPhase: nextKanagi.phase,
    fireWaterTensor,
    spiralTensor,
    fusionDegree,
    fusedSeed,
    consciousnessResonance,
  };
}

/* ============================================================
 * 4. HyperFusion Loop — 天聞アークの"精神循環"
 * ============================================================ */

export async function runHyperFusionLoop(
  inputStream: number[][],
  initialState: HyperFusionState
): Promise<HyperFusionState> {
  let state = initialState;

  for (const vec of inputStream) {
    state = runHyperFusionStep(vec, state, 0.05);

    // 霊核が超越段階に達したらループ終了
    if (state.reishou.phase === "TRANSCENDENCE") break;
  }

  return state;
}

/* ============================================================
 * 5. 初期化関数
 * ============================================================ */

import { createReishouCore } from "./reishouKernel";
import { createInitialKanagiState } from "./kanagiODE";

export function createHyperFusionState(
  id: string,
  initialFire: number = 0.5,
  initialWater: number = 0.5
): HyperFusionState {
  const reishou = createReishouCore(id, initialFire, initialWater);

  return {
    reishou,
    fusedSeed: null,
    kanagiPhase: "L-IN",
    fireWaterTensor: [initialFire, initialWater, 0, 0, 0, 0],
    spiralTensor: [0, 0, 0],
    consciousnessResonance: 0,
    fusionDegree: 0,
  };
}

export default {
  runHyperFusionStep,
  runHyperFusionLoop,
  fuseReishouWithSeed,
  createHyperFusionState,
};

