import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { KanagiPhase } from "../persona/kanagi.js";
import type { LexicalBias } from "../persona/lexicalBias.js";
import type { KokuzoMemorySeed } from "./memoryStore.js";
import { FREQUENCY_THRESHOLDS } from "./constants.js";

// KOKŪZŌ: FractalSeed（構文核、内部用、UI/レスポンスには返さない）
export type FractalSeed = {
  id: string;
  personaId: string;
  dominantThinkingAxis: ThinkingAxis;
  dominantKanagiPhase: KanagiPhase;
  lexicalBiasProfile: LexicalBias;
  inertiaProfile: number; // 0.0〜1.0
  density: number;         // 集約度（0〜1）
  createdAt: number;      // timestamp
};

// KOKŪZŌ: in-memory FractalSeedストア
const fractalStore: FractalSeed[] = [];
const MAX_FRACTAL_STORE_SIZE = 10; // 最大保存件数

/**
 * KOKŪZŌ: KokuzoMemorySeed群からFractalSeedを生成する
 * 
 * 処理内容：
 * - thinkingAxis / kanagiPhase の頻度集計
 * - 最頻値を dominant とする
 * - lexicalBias は平均値で合成
 * - inertia は平均値を使用
 * - density は「同一傾向の集中度」で計算
 */
export function generateFractalSeed(
  seeds: KokuzoMemorySeed[],
  personaId: string
): FractalSeed | null {
  if (seeds.length < FREQUENCY_THRESHOLDS.MIN_SEED_COUNT_FOR_FRACTAL) {
    // 最小件数未満の場合は生成しない
    return null;
  }

  // thinkingAxis / kanagiPhase の頻度集計
  const thinkingAxisCount: Record<ThinkingAxis, number> = {
    introspective: 0,
    observational: 0,
    constructive: 0,
    executive: 0,
  };
  
  const kanagiPhaseCount: Record<KanagiPhase, number> = {
    "L-IN": 0,
    "L-OUT": 0,
    "R-IN": 0,
    "R-OUT": 0,
    "INTEGRATION": 0,
  };
  
  // lexicalBias の平均値を計算
  let totalConciseness = 0;
  let totalAbstraction = 0;
  let totalSoftness = 0;
  let totalDecisiveness = 0;
  let totalInertia = 0;
  
  for (const seed of seeds) {
    thinkingAxisCount[seed.thinkingAxis]++;
    kanagiPhaseCount[seed.kanagiPhase]++;
    totalConciseness += seed.lexicalBias.conciseness;
    totalAbstraction += seed.lexicalBias.abstraction;
    totalSoftness += seed.lexicalBias.softness;
    totalDecisiveness += seed.lexicalBias.decisiveness;
    totalInertia += seed.inertiaSnapshot;
  }
  
  const count = seeds.length;
  
  // 最頻値を取得
  let maxThinkingAxisFreq = 0;
  let dominantThinkingAxis: ThinkingAxis = "observational";
  for (const [axis, freq] of Object.entries(thinkingAxisCount) as [ThinkingAxis, number][]) {
    if (freq > maxThinkingAxisFreq) {
      maxThinkingAxisFreq = freq;
      dominantThinkingAxis = axis;
    }
  }
  
  let maxKanagiPhaseFreq = 0;
  let dominantKanagiPhase: KanagiPhase = "R-IN";
  for (const [phase, freq] of Object.entries(kanagiPhaseCount) as [KanagiPhase, number][]) {
    if (freq > maxKanagiPhaseFreq) {
      maxKanagiPhaseFreq = freq;
      dominantKanagiPhase = phase;
    }
  }
  
  // density を計算（同一傾向の集中度）
  // 最頻値の割合を density とする
  const thinkingAxisDensity = maxThinkingAxisFreq / count;
  const kanagiPhaseDensity = maxKanagiPhaseFreq / count;
  const density = (thinkingAxisDensity + kanagiPhaseDensity) / 2;
  
  // lexicalBias の平均値で合成
  const lexicalBiasProfile: LexicalBias = {
    conciseness: totalConciseness / count,
    abstraction: totalAbstraction / count,
    softness: totalSoftness / count,
    decisiveness: totalDecisiveness / count,
  };
  
  // inertia の平均値
  const inertiaProfile = totalInertia / count;
  
  return {
    id: `fractal-${personaId}-${Date.now()}`,
    personaId,
    dominantThinkingAxis,
    dominantKanagiPhase,
    lexicalBiasProfile,
    inertiaProfile,
    density,
    createdAt: Date.now(),
  };
}

/**
 * KOKŪZŌ: FractalSeedを保存する
 */
export function saveFractalSeed(seed: FractalSeed): void {
  fractalStore.push(seed);
  
  // 最大件数を超えた場合、古いものを削除
  if (fractalStore.length > MAX_FRACTAL_STORE_SIZE) {
    fractalStore.shift();
  }
}

/**
 * KOKŪZŌ: 最新のFractalSeedを取得する
 */
export function getLatestFractalSeed(personaId: string): FractalSeed | null {
  // 該当personaIdの最新のFractalSeedを取得
  for (let i = fractalStore.length - 1; i >= 0; i--) {
    if (fractalStore[i].personaId === personaId) {
      return fractalStore[i];
    }
  }
  return null;
}

