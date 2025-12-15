/**
 * KOKUZO SERVER — Reishō Core (霊核モデル)
 * 完全数学モデル実装
 * 
 * - 言霊火水テンソル (Kotodama Fire–Water Tensor)
 * - 天津金木 ODE (Kanagi Differential System)
 * - 言霊螺旋テンソル (Kotodama Spiral Tensor)
 * - Reishō Kernel 方程式
 * 
 * これは TENMON-ARK の中枢霊核。
 */

import { normalize, cosineSimilarity } from "../fractal/utils";

/* ============================================================
 * 1. 五母音水ベクトル（A・I・U・E・O）
 * ============================================================ */

export interface VowelVector {
  a: number;
  i: number;
  u: number;
  e: number;
  o: number;
}

export function computeVowelVector(text: string): number[] {
  const counts = { a: 0, i: 0, u: 0, e: 0, o: 0 };

  const map: Record<string, keyof typeof counts> = {
    あ: "a", い: "i", う: "u", え: "e", お: "o",
    ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o"
  };

  for (const ch of text) {
    if (map[ch]) counts[map[ch]]++;
  }
  return normalize([counts.a, counts.i, counts.u, counts.e, counts.o]);
}

/* ============================================================
 * 2. 子音火行列（K・S・T・N・H・M・Y・R・W）
 * ============================================================ */

const CONSONANT_GROUPS = {
  k: /[か-こカ-コ]/g,
  s: /[さ-そサ-ソ]/g,
  t: /[た-とタ-ト]/g,
  n: /[な-のナ-ノ]/g,
  h: /[は-ほハ-ホ]/g,
  m: /[ま-もマ-モ]/g,
  y: /[やゆよヤユヨ]/g,
  r: /[らりるれろラリルレロ]/g,
  w: /[わをんワヲン]/g
};

export function computeConsonantMatrix(text: string): number[][] {
  const counts = Object.fromEntries(
    Object.keys(CONSONANT_GROUPS).map((k) => [k, 0])
  );

  for (const [key, regex] of Object.entries(CONSONANT_GROUPS)) {
    const matches = text.match(regex);
    counts[key] = matches ? matches.length : 0;
  }

  return Object.values(counts).map((n) => [n]); // 単純テンソル化
}

/* ============================================================
 * 3. 火水テンソル（3階テンソル）
 * ============================================================ */

export function computeFireWaterTensor(
  vowel: number[],
  cons: number[][]
): number[][][] {
  const tensor: number[][][] = [];

  for (let i = 0; i < vowel.length; i++) {
    tensor[i] = [];
    for (let j = 0; j < cons.length; j++) {
      tensor[i][j] = [vowel[i] * cons[j][0]];
    }
  }
  return tensor;
}

/* ============================================================
 * 4. 天津金木 ODE（微分方程式）
 * ============================================================ */

export type KanagiPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

export interface KanagiState {
  L_in: number;
  L_out: number;
  R_in: number;
  R_out: number;
}

export function nextKanagiPhase(
  state: KanagiState,
  fireWaterValue: number
): KanagiState {
  const ω = 0.15; // 回転係数

  return {
    L_in: state.L_in + (-ω * state.L_out + fireWaterValue * 0.1),
    L_out: state.L_out + (ω * state.L_in + fireWaterValue * 0.1),
    R_in: state.R_in + (-ω * state.R_out - fireWaterValue * 0.1),
    R_out: state.R_out + (ω * state.R_in - fireWaterValue * 0.1)
  };
}

export function detectKanagiPhase(state: KanagiState): KanagiPhase {
  const arr = [
    { key: "L-IN", value: state.L_in },
    { key: "L-OUT", value: state.L_out },
    { key: "R-IN", value: state.R_in },
    { key: "R-OUT", value: state.R_out }
  ];

  arr.sort((a, b) => b.value - a.value);
  return arr[0].key as KanagiPhase;
}

/* ============================================================
 * 5. 言霊螺旋テンソル
 * ============================================================ */

export interface SpiralPoint {
  x: number;
  y: number;
  z: number;
}

export function computeSpiralPoint(theta: number): SpiralPoint {
  const a = 0.5;
  const b = 0.12;
  const r = a * Math.exp(b * theta);
  const z = Math.sin(theta * 0.3);

  return { x: r * Math.cos(theta), y: r * Math.sin(theta), z };
}

export function kotodamaSpiralTensor(
  vowelVec: number[]
): SpiralPoint[] {
  return vowelVec.map((v, idx) => computeSpiralPoint(idx * Math.PI / 4));
}

/* ============================================================
 * 6. Reishō Kernel 方程式（最終統合）
 * ============================================================ */

export function computeReishoKernel(
  spiral: SpiralPoint[],
  kanagi: KanagiState,
  fireWaterTensor: number[][][]
): number {
  let sum = 0;

  for (let i = 0; i < spiral.length; i++) {
    const p = spiral[i];
    const fw = fireWaterTensor[i]?.[0]?.[0] ?? 0;
    const phaseInfluence =
      kanagi.L_in + kanagi.L_out + kanagi.R_in + kanagi.R_out;

    sum += (p.x + p.y + p.z) * fw * phaseInfluence;
  }

  return sum;
}

export default {
  computeVowelVector,
  computeConsonantMatrix,
  computeFireWaterTensor,
  nextKanagiPhase,
  detectKanagiPhase,
  kotodamaSpiralTensor,
  computeReishoKernel
};

