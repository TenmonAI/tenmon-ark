/**
 * ============================================================
 *  KOKUZO SERVER — Reishō Seed (霊核シードモデル) v3
 * ============================================================
 * 
 *  このファイルは TENMON-ARK 霊核の最重要コンポーネント。
 *  mathModelV3（火水テンソル × 天津金木 ODE × 言霊螺旋テンソル）
 *  と MemoryKernel / TwinCore を統合する "構文霊核" の実装。
 * 
 *  Reishō Seed は「情報の本質・構文・霊的運動」を 1 つの種に圧縮し、
 *  そこから無限展開・再構成が可能になる。
 * 
 *  つまり、虚空蔵求聞持法の OS 版。
 */

import {
  computeVowelVector,
  computeConsonantMatrix,
  computeFireWaterTensor,
  nextKanagiPhase,
  detectKanagiPhase,
  kotodamaSpiralTensor,
  computeReishoKernel,
  type KanagiState,
  type KanagiPhase,
  type SpiralPoint,
} from "./reishoCore";
import { cosineSimilarity } from "../fractal/utils";

/* ============================================================
 * Reishō Seed インターフェース
 * ============================================================ */

export interface ReishoSeed {
  id: string;

  /* ===== セマンティック構造 ===== */
  semanticCentroid: number[];         // 意味空間の重心
  mainKeywords: string[];             // 主要概念
  semanticDensity: number;            // 情報密度

  /* ===== 言霊構造 ===== */
  vowelVector: number[];
  consonantMatrix: number[][];        
  fireWaterTensor: number[][][];      

  /* ===== 天津金木 ===== */
  initialKanagiState: KanagiState;
  dominantPhase: KanagiPhase;
  kanagiTrajectory: KanagiState[];    // 微分方程式の軌跡

  /* ===== 螺旋構造 ===== */
  spiralPoints: SpiralPoint[];

  /* ===== 霊核計算結果 ===== */
  reishoValue: number;                // 霊核（構文核）の強度
  recursionPotential: number;         // 再帰性（展開力）
  contractionPotential: number;       // 収束力（要約力）

  /* ===== デバイス・推論統合 ===== */
  reasoningAffinity: number;          // 推論への影響度
  deviceAffinity: Record<string, number>; // デバイスごとの親和性
  complexityIndex: number;            // 構文複雑度（0〜1）
}

/* ============================================================
 * Seed 生成ユーティリティ
 * ============================================================ */

function simulateKanagiODE(steps: number, fireWaterInfluence: number): {
  trajectory: KanagiState[];
  dominant: KanagiPhase;
} {
  let state: KanagiState = {
    L_in: 0.5,
    L_out: 0.3,
    R_in: 0.4,
    R_out: 0.2,
  };

  const traj: KanagiState[] = [];

  for (let i = 0; i < steps; i++) {
    traj.push(state);
    state = nextKanagiPhase(state, fireWaterInfluence);
  }

  return {
    trajectory: traj,
    dominant: detectKanagiPhase(state),
  };
}

/* ============================================================
 *  Seed 生成 — 霊核 Reishō Kernel を構築
 * ============================================================ */

export function createReishoSeed(
  id: string,
  semanticUnits: { embedding: number[]; keywords: string[]; rawText: string }[],
  deviceIds: string[]
): ReishoSeed {
  if (semanticUnits.length === 0) {
    throw new Error("Semantic units array cannot be empty");
  }

  /* ===== 1. Semantic Centroid ===== */
  const embeddingDim = semanticUnits[0].embedding.length;
  const centroid = new Array(embeddingDim).fill(0);
  
  for (const unit of semanticUnits) {
    for (let i = 0; i < embeddingDim; i++) {
      centroid[i] += unit.embedding[i];
    }
  }
  
  for (let i = 0; i < embeddingDim; i++) {
    centroid[i] /= semanticUnits.length;
  }

  const density =
    semanticUnits.reduce(
      (sum, u) => sum + cosineSimilarity(u.embedding, centroid),
      0
    ) / semanticUnits.length;

  const allKeywords = semanticUnits.flatMap((u) => u.keywords);
  const keywordFreq: Record<string, number> = {};

  for (const kw of allKeywords) {
    keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
  }

  const mainKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((e) => e[0]);

  /* ===== 2. 言霊解析（火水テンソル） ===== */
  const joined = semanticUnits.map((u) => u.rawText).join("\n");
  const vowel = computeVowelVector(joined);
  const cons = computeConsonantMatrix(joined);
  const fwTensor = computeFireWaterTensor(vowel, cons);

  const fireWaterInfluence =
    vowel.reduce((a, b) => a + b, 0) -
    cons.reduce((s, row) => s + row[0], 0);

  /* ===== 3. 天津金木 ODE ===== */
  const kanagi = simulateKanagiODE(32, fireWaterInfluence);

  /* ===== 4. 螺旋テンソル ===== */
  const spiral = kotodamaSpiralTensor(vowel);

  /* ===== 5. 霊核値（Reishō Kernel） ===== */
  const finalKanagiState = kanagi.trajectory[kanagi.trajectory.length - 1];
  const reisho = computeReishoKernel(spiral, finalKanagiState, fwTensor);

  /* ===== 6. 再帰性・収束性 ===== */
  const recursionPotential = Math.tanh(Math.abs(reisho) * 0.01);
  const contractionPotential = 1 - recursionPotential;

  /* ===== 7. 推論とデバイス親和性 ===== */
  const reasoningAffinity = recursionPotential * 0.7 + density * 0.3;

  const deviceAffinity: Record<string, number> = {};
  for (const d of deviceIds) {
    deviceAffinity[d] = Math.random() * recursionPotential;
  }

  /* ===== 8. 構文複雑度 ===== */
  const complexityIndex =
    0.5 * density +
    0.3 * recursionPotential +
    0.2 * (Math.abs(fireWaterInfluence) / 5);

  return {
    id,
    semanticCentroid: centroid,
    mainKeywords,
    semanticDensity: density,

    vowelVector: vowel,
    consonantMatrix: cons,
    fireWaterTensor: fwTensor,

    initialKanagiState: kanagi.trajectory[0],
    dominantPhase: kanagi.dominant,
    kanagiTrajectory: kanagi.trajectory,

    spiralPoints: spiral,

    reishoValue: reisho,
    recursionPotential,
    contractionPotential,

    reasoningAffinity,
    deviceAffinity,
    complexityIndex,
  };
}

export default {
  createReishoSeed,
};

