// OS v∞-1: KOKŪZŌ 観測・ログ出力（debugレベル、本番ではOFF）

import type { FractalSeed } from "./fractalStore.js";
import type { KokuzoTendency } from "./memoryStore.js";
import type { LexicalBias } from "../persona/lexicalBias.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { KanagiPhase } from "../persona/kanagi.js";

// OS v∞-1: 本番では false に設定（ログをOFF）
const ENABLE_DEBUG_LOG = process.env.NODE_ENV !== "production" && process.env.KOKUZO_DEBUG === "true";

/**
 * OS v∞-1: FractalSeedの観測ログを出力
 */
export function observeFractalSeed(
  fractal: FractalSeed | null,
  context: string = "default"
): void {
  if (!ENABLE_DEBUG_LOG) {
    return;
  }
  
  if (!fractal) {
    console.debug(`[KOKŪZŌ Observer] ${context}: FractalSeed is null`);
    return;
  }
  
  console.debug(`[KOKŪZŌ Observer] ${context}:`, {
    id: fractal.id,
    density: fractal.density.toFixed(3),
    dominantThinkingAxis: fractal.dominantThinkingAxis,
    dominantKanagiPhase: fractal.dominantKanagiPhase,
    inertiaProfile: fractal.inertiaProfile.toFixed(3),
    lexicalBias: {
      conciseness: fractal.lexicalBiasProfile.conciseness.toFixed(3),
      abstraction: fractal.lexicalBiasProfile.abstraction.toFixed(3),
      softness: fractal.lexicalBiasProfile.softness.toFixed(3),
      decisiveness: fractal.lexicalBiasProfile.decisiveness.toFixed(3),
    },
  });
}

/**
 * OS v∞-1: Tendencyの観測ログを出力
 */
export function observeTendency(
  tendency: KokuzoTendency,
  context: string = "default"
): void {
  if (!ENABLE_DEBUG_LOG) {
    return;
  }
  
  // 最も頻度の高いthinkingAxisを取得
  let maxThinkingAxisFreq = 0;
  let dominantThinkingAxis: ThinkingAxis | null = null;
  for (const [axis, freq] of Object.entries(tendency.thinkingAxisFrequency) as [ThinkingAxis, number][]) {
    if (freq > maxThinkingAxisFreq) {
      maxThinkingAxisFreq = freq;
      dominantThinkingAxis = axis;
    }
  }
  
  // 最も頻度の高いkanagiPhaseを取得
  let maxKanagiPhaseFreq = 0;
  let dominantKanagiPhase: KanagiPhase | null = null;
  for (const [phase, freq] of Object.entries(tendency.kanagiPhaseFrequency) as [KanagiPhase, number][]) {
    if (freq > maxKanagiPhaseFreq) {
      maxKanagiPhaseFreq = freq;
      dominantKanagiPhase = phase;
    }
  }
  
  console.debug(`[KOKŪZŌ Observer] ${context}:`, {
    totalCount: tendency.totalCount,
    averageInertia: tendency.averageInertia.toFixed(3),
    dominantThinkingAxis: dominantThinkingAxis || "none",
    dominantKanagiPhase: dominantKanagiPhase || "none",
    thinkingAxisFrequency: tendency.thinkingAxisFrequency,
    kanagiPhaseFrequency: tendency.kanagiPhaseFrequency,
  });
}

/**
 * OS v∞-1: LexicalBiasの観測ログを出力
 */
export function observeLexicalBias(
  bias: LexicalBias,
  context: string = "default"
): void {
  if (!ENABLE_DEBUG_LOG) {
    return;
  }
  
  console.debug(`[KOKŪZŌ Observer] ${context}:`, {
    conciseness: bias.conciseness.toFixed(3),
    abstraction: bias.abstraction.toFixed(3),
    softness: bias.softness.toFixed(3),
    decisiveness: bias.decisiveness.toFixed(3),
  });
}

/**
 * OS v∞-1: 最終的な人格状態の観測ログを出力
 */
export function observeFinalPersonaState(
  thinkingAxis: ThinkingAxis,
  kanagiPhase: KanagiPhase,
  lexicalBias: LexicalBias,
  inertia: number | undefined,
  context: string = "default"
): void {
  if (!ENABLE_DEBUG_LOG) {
    return;
  }
  
  console.debug(`[KOKŪZŌ Observer] ${context} Final State:`, {
    thinkingAxis,
    kanagiPhase,
    inertia: inertia?.toFixed(3) || "undefined",
    lexicalBias: {
      conciseness: lexicalBias.conciseness.toFixed(3),
      abstraction: lexicalBias.abstraction.toFixed(3),
      softness: lexicalBias.softness.toFixed(3),
      decisiveness: lexicalBias.decisiveness.toFixed(3),
    },
  });
}

