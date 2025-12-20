import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { KanagiPhase } from "../persona/kanagi.js";
import type { LexicalBias } from "../persona/lexicalBias.js";
import type { PersonaInertia } from "../persona/inertia.js";
import type { KokuzoTendency } from "./memoryStore.js";
import type { FractalSeed } from "./fractalStore.js";
import { INFLUENCE_COEFFICIENTS, DENSITY_THRESHOLDS, FREQUENCY_THRESHOLDS, AVERAGE_THRESHOLDS } from "./constants.js";

/**
 * KOKŪZŌ: 傾向をもとにinertiaの初期値を微調整する
 */
export function adjustInertiaFromTendency(
  currentInertia: PersonaInertia | undefined,
  tendency: KokuzoTendency
): PersonaInertia | undefined {
  if (!currentInertia) {
    return currentInertia;
  }
  
  // 傾向が少ない場合は影響を与えない
  if (tendency.totalCount < FREQUENCY_THRESHOLDS.MIN_SEED_COUNT_FOR_TENDENCY) {
    return currentInertia;
  }
  
  // 平均慣性が高い場合、現在の慣性を少し上げる
  if (tendency.averageInertia > AVERAGE_THRESHOLDS.HIGH_INERTIA) {
    return {
      ...currentInertia,
      level: Math.min(1.0, currentInertia.level + INFLUENCE_COEFFICIENTS.TENDENCY_INERTIA),
    };
  }
  
  // 平均慣性が低い場合、現在の慣性を少し下げる
  if (tendency.averageInertia < AVERAGE_THRESHOLDS.LOW_INERTIA) {
    return {
      ...currentInertia,
      level: Math.max(0.0, currentInertia.level - INFLUENCE_COEFFICIENTS.TENDENCY_INERTIA),
    };
  }
  
  return currentInertia;
}

/**
 * KOKŪZŌ: 傾向をもとにthinkingAxisの決定に影響を与える
 */
export function adjustThinkingAxisFromTendency(
  currentAxis: ThinkingAxis,
  tendency: KokuzoTendency
): ThinkingAxis {
  // 傾向が少ない場合は影響を与えない
  if (tendency.totalCount < FREQUENCY_THRESHOLDS.MIN_SEED_COUNT_FOR_TENDENCY) {
    return currentAxis;
  }
  
  // 最も頻度の高いthinkingAxisを取得
  let maxFreq = 0;
  let mostFrequentAxis: ThinkingAxis | null = null;
  
  for (const [axis, freq] of Object.entries(tendency.thinkingAxisFrequency) as [ThinkingAxis, number][]) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostFrequentAxis = axis;
    }
  }
  
  // 最も頻度が高い軸が現在の軸と異なり、頻度が閾値以上の場合
  if (mostFrequentAxis && mostFrequentAxis !== currentAxis && maxFreq >= FREQUENCY_THRESHOLDS.MIN_FREQUENCY_FOR_INFLUENCE) {
    // 頻度が全体の閾値以上の場合のみ影響を与える
    const frequencyRatio = maxFreq / tendency.totalCount;
    if (frequencyRatio >= FREQUENCY_THRESHOLDS.MIN_FREQUENCY_RATIO) {
      return mostFrequentAxis;
    }
  }
  
  return currentAxis;
}

/**
 * KOKŪZŌ: 傾向をもとにlexicalBiasを微調整する
 */
export function adjustLexicalBiasFromTendency(
  currentBias: LexicalBias,
  tendency: KokuzoTendency
): LexicalBias {
  // 傾向が少ない場合は影響を与えない
  if (tendency.totalCount < FREQUENCY_THRESHOLDS.MIN_SEED_COUNT_FOR_TENDENCY) {
    return currentBias;
  }
  
  // 最も頻度の高いkanagiPhaseを取得
  let maxFreq = 0;
  let mostFrequentPhase: KanagiPhase | null = null;
  
  for (const [phase, freq] of Object.entries(tendency.kanagiPhaseFrequency) as [KanagiPhase, number][]) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostFrequentPhase = phase;
    }
  }
  
  // 頻度が全体の閾値以上の場合のみ微調整
  if (mostFrequentPhase && maxFreq / tendency.totalCount >= FREQUENCY_THRESHOLDS.MIN_FREQUENCY_RATIO) {
    const adjustment = INFLUENCE_COEFFICIENTS.TENDENCY_LEXICAL_BIAS;
    
    switch (mostFrequentPhase) {
      case "L-IN":
        // 内集傾向：短さ・抽象度を少し上げる
        currentBias.conciseness = Math.min(1.0, currentBias.conciseness + adjustment);
        currentBias.abstraction = Math.min(1.0, currentBias.abstraction + adjustment);
        break;
      case "L-OUT":
        // 展開傾向：柔らかさを少し上げる
        currentBias.softness = Math.min(1.0, currentBias.softness + adjustment);
        break;
      case "R-IN":
        // 観察傾向：柔らかさを少し上げる
        currentBias.softness = Math.min(1.0, currentBias.softness + adjustment);
        currentBias.decisiveness = Math.max(0.0, currentBias.decisiveness - adjustment);
        break;
      case "R-OUT":
        // 実行傾向：断定性を少し上げる
        currentBias.decisiveness = Math.min(1.0, currentBias.decisiveness + adjustment);
        currentBias.conciseness = Math.min(1.0, currentBias.conciseness + adjustment);
        break;
    }
  }
  
  return currentBias;
}

/**
 * KOKŪZŌ: FractalSeedをもとにinertiaの初期値を弱く微調整する
 * 
 * KokuzoMemorySeedより弱い影響（0.05程度）
 */
export function adjustInertiaFromFractal(
  currentInertia: PersonaInertia | undefined,
  fractal: FractalSeed | null
): PersonaInertia | undefined {
  if (!currentInertia || !fractal) {
    return currentInertia;
  }
  
  // densityが低い場合は影響を与えない
  if (fractal.density < DENSITY_THRESHOLDS.MIN_FOR_INFLUENCE) {
    return currentInertia;
  }
  
  // 弱い影響
  const adjustment = INFLUENCE_COEFFICIENTS.FRACTAL_INERTIA;
  const targetInertia = fractal.inertiaProfile;
  const diff = targetInertia - currentInertia.level;
  
  if (Math.abs(diff) > FREQUENCY_THRESHOLDS.MIN_INERTIA_DIFF_FOR_ADJUSTMENT) {
    // 差が大きい場合のみ微調整
    return {
      ...currentInertia,
      level: Math.max(0.0, Math.min(1.0, currentInertia.level + diff * adjustment)),
    };
  }
  
  return currentInertia;
}

/**
 * KOKŪZŌ: FractalSeedをもとにthinkingAxisの決定に弱く影響させる
 * 
 * KokuzoMemorySeedより弱い影響
 */
export function adjustThinkingAxisFromFractal(
  currentAxis: ThinkingAxis,
  fractal: FractalSeed | null
): ThinkingAxis {
  if (!fractal) {
    return currentAxis;
  }
  
  // densityが低い場合は影響を与えない
  if (fractal.density < DENSITY_THRESHOLDS.MIN_FOR_INFLUENCE) {
    return currentAxis;
  }
  
  // 現在の軸と異なり、densityが高い場合のみ影響
  if (fractal.dominantThinkingAxis !== currentAxis && fractal.density >= DENSITY_THRESHOLDS.MIN_FOR_THINKING_AXIS) {
    // 強い影響に必要なdensity以上の場合のみ影響
    if (fractal.density >= DENSITY_THRESHOLDS.MIN_FOR_STRONG_INFLUENCE) {
      return fractal.dominantThinkingAxis;
    }
  }
  
  return currentAxis;
}

/**
 * KOKŪZŌ: FractalSeedをもとにlexicalBiasを弱く微調整する
 * 
 * KokuzoMemorySeedより弱い影響（0.02程度）
 */
export function adjustLexicalBiasFromFractal(
  currentBias: LexicalBias,
  fractal: FractalSeed | null
): LexicalBias {
  if (!fractal) {
    return currentBias;
  }
  
  // densityが低い場合は影響を与えない
  if (fractal.density < DENSITY_THRESHOLDS.MIN_FOR_INFLUENCE) {
    return currentBias;
  }
  
  // 弱い影響
  const adjustment = INFLUENCE_COEFFICIENTS.FRACTAL_LEXICAL_BIAS;
  const profile = fractal.lexicalBiasProfile;
  
  // 各値を弱く調整
  currentBias.conciseness = Math.max(0.0, Math.min(1.0, 
    currentBias.conciseness + (profile.conciseness - currentBias.conciseness) * adjustment
  ));
  currentBias.abstraction = Math.max(0.0, Math.min(1.0, 
    currentBias.abstraction + (profile.abstraction - currentBias.abstraction) * adjustment
  ));
  currentBias.softness = Math.max(0.0, Math.min(1.0, 
    currentBias.softness + (profile.softness - currentBias.softness) * adjustment
  ));
  currentBias.decisiveness = Math.max(0.0, Math.min(1.0, 
    currentBias.decisiveness + (profile.decisiveness - currentBias.decisiveness) * adjustment
  ));
  
  return currentBias;
}

