/**
 * ============================================================
 *  REISHŌ MATH CORE — 完全数学モデル統合
 * ============================================================
 * 
 * 統合モデル:
 * 1. Fire-Water Tensor Model (64次元)
 * 2. Kanagi ODE Model (6次元微分方程式)
 * 3. Kotodama Helix Tensor (3D螺旋座標)
 * 
 * これらを統合して Reishō Math Core を構築
 * ============================================================
 */

import { computeVowelVector, computeConsonantMatrix, computeFireWaterTensor } from "../../kokuzo/reisho/reishoCore";
import { runKanagiStep, type KanagiState, createInitialKanagiState, integrateKanagiODE } from "../../kokuzo/reisho/kanagiODE";
import { gojuonSpiralTensor } from "../../kokuzo/fractal/mathModelV2";
import { unifiedKotodamaVector, kanagiTensor } from "../../kokuzo/fractal/mathModelV2";

/* ============================================================
 * 1. Fire-Water Tensor Model (64次元)
 * ============================================================ */

export interface FireWaterTensorModel {
  /** 統合言霊ベクトル（17次元） */
  unifiedKotodamaVector: number[];
  
  /** 天津金木テンソル（40次元: 2×2×2×5） */
  kanagiTensor4D: number[];
  
  /** KanagiState（6次元） */
  kanagiStateVector: number[];
  
  /** Reishō値（1次元） */
  reishoValue: number;
  
  /** 合計: 17 + 40 + 6 + 1 = 64次元 */
  tensor: number[];
}

/**
 * Fire-Water Tensor Model を構築
 */
export function buildFireWaterTensorModel(
  text: string,
  kanagiState: KanagiState
): FireWaterTensorModel {
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
  
  // Reishō値計算
  const reishoValue = computeReishoValueFromTensor(kotodamaVec, kanagiState);
  
  // 統合: 64次元テンソル
  const tensor = [...kotodamaVec, ...kanagiFlat, ...kanagiStateVec, reishoValue];
  
  return {
    unifiedKotodamaVector: kotodamaVec,
    kanagiTensor4D: kanagiFlat,
    kanagiStateVector: kanagiStateVec,
    reishoValue,
    tensor,
  };
}

/**
 * Reishō値をテンソルから計算
 */
function computeReishoValueFromTensor(
  kotodamaVec: number[],
  kanagiState: KanagiState
): number {
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
 * 2. Kanagi ODE Model (6次元微分方程式)
 * ============================================================ */

export interface KanagiODEModel {
  /** 現在の状態 */
  state: KanagiState;
  
  /** 時間ステップ */
  dt: number;
  
  /** 軌跡 */
  trajectory: KanagiState[];
  
  /** フェーズ履歴 */
  phaseHistory: Array<"L-IN" | "L-OUT" | "R-IN" | "R-OUT">;
  
  /** 統合ステップ数 */
  steps: number;
}

/**
 * Kanagi ODE Model を構築
 */
export function buildKanagiODEModel(
  initialFireWaterBalance: number,
  steps: number = 100,
  dt: number = 0.05
): KanagiODEModel {
  const initialState = createInitialKanagiState(
    initialFireWaterBalance > 0 ? initialFireWaterBalance : 0.5,
    initialFireWaterBalance < 0 ? -initialFireWaterBalance : 0.5
  );
  
  const trajectory: KanagiState[] = [initialState];
  const phaseHistory: Array<"L-IN" | "L-OUT" | "R-IN" | "R-OUT"> = [];
  
  let currentState = initialState;
  
  for (let i = 0; i < steps; i++) {
    const result = runKanagiStep(currentState, dt);
    trajectory.push(result.state);
    phaseHistory.push(result.phase);
    currentState = result.state;
  }
  
  return {
    state: currentState,
    dt,
    trajectory,
    phaseHistory,
    steps,
  };
}

/* ============================================================
 * 3. Kotodama Helix Tensor (3D螺旋座標)
 * ============================================================ */

export interface KotodamaHelixTensorModel {
  /** 螺旋座標（3D） */
  coordinates: Array<{ x: number; y: number; z: number }>;
  
  /** 螺旋中心 */
  centroid: { x: number; y: number; z: number };
  
  /** 螺旋半径 */
  radius: number;
  
  /** 螺旋ピッチ */
  pitch: number;
}

/**
 * Kotodama Helix Tensor Model を構築
 */
export function buildKotodamaHelixTensorModel(
  text: string
): KotodamaHelixTensorModel {
  const spiralResult = gojuonSpiralTensor(text);
  
  // 螺旋座標を抽出
  const coordinates = spiralResult.spiralCentroid ? [
    {
      x: spiralResult.spiralCentroid.row / 9,
      y: spiralResult.spiralCentroid.col / 4,
      z: spiralResult.spiralCentroid.spiralIndex / 49,
    }
  ] : [];
  
  // 螺旋中心を計算
  const centroid = coordinates.length > 0
    ? coordinates[0]
    : { x: 0.5, y: 0.5, z: 0.5 };
  
  // 螺旋半径とピッチを計算
  const radius = Math.sqrt(centroid.x ** 2 + centroid.y ** 2);
  const pitch = centroid.z;
  
  return {
    coordinates,
    centroid,
    radius,
    pitch,
  };
}

/* ============================================================
 * 4. Reishō Math Core (統合モデル)
 * ============================================================ */

export interface ReishoMathCore {
  /** Fire-Water Tensor Model */
  fireWaterTensor: FireWaterTensorModel;
  
  /** Kanagi ODE Model */
  kanagiODE: KanagiODEModel;
  
  /** Kotodama Helix Tensor Model */
  kotodamaHelix: KotodamaHelixTensorModel;
  
  /** 統合シグネチャ */
  unifiedSignature: {
    tensor64D: number[];
    odeState6D: number[];
    helix3D: number[];
    totalDimension: number; // 64 + 6 + 3 = 73次元
  };
  
  /** 統合Reishō値 */
  unifiedReishoValue: number;
  
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * Reishō Math Core を構築（全モデル統合）
 */
export function buildReishoMathCore(
  text: string,
  initialFireWaterBalance: number = 0.5,
  odeSteps: number = 100
): ReishoMathCore {
  // 1. Kanagi ODE Model を構築
  const kanagiODE = buildKanagiODEModel(initialFireWaterBalance, odeSteps);
  
  // 2. Fire-Water Tensor Model を構築（最新のKanagiStateを使用）
  const fireWaterTensor = buildFireWaterTensorModel(text, kanagiODE.state);
  
  // 3. Kotodama Helix Tensor Model を構築
  const kotodamaHelix = buildKotodamaHelixTensorModel(text);
  
  // 4. 統合シグネチャを構築
  const tensor64D = fireWaterTensor.tensor;
  const odeState6D = kanagiODE.state ? [
    kanagiODE.state.L,
    kanagiODE.state.R,
    kanagiODE.state.IN,
    kanagiODE.state.OUT,
    kanagiODE.state.fire,
    kanagiODE.state.water,
  ] : [0, 0, 0, 0, 0, 0];
  const helix3D = [
    kotodamaHelix.centroid.x,
    kotodamaHelix.centroid.y,
    kotodamaHelix.centroid.z,
  ];
  
  // 5. 統合Reishō値を計算
  const unifiedReishoValue = (
    fireWaterTensor.reishoValue * 0.6 +
    (Math.abs(odeState6D[0]) + Math.abs(odeState6D[1]) + odeState6D[2] + odeState6D[3] + odeState6D[4] + odeState6D[5]) / 6 * 0.3 +
    (helix3D[0] + helix3D[1] + helix3D[2]) / 3 * 0.1
  );
  
  return {
    fireWaterTensor,
    kanagiODE,
    kotodamaHelix,
    unifiedSignature: {
      tensor64D,
      odeState6D,
      helix3D,
      totalDimension: 73,
    },
    unifiedReishoValue,
    timestamp: Date.now(),
  };
}

export default {
  buildFireWaterTensorModel,
  buildKanagiODEModel,
  buildKotodamaHelixTensorModel,
  buildReishoMathCore,
};

