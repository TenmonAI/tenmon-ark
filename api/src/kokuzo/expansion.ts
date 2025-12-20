import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { KanagiPhase } from "../persona/kanagi.js";
import type { LexicalBias } from "../persona/lexicalBias.js";
import type { PersonaInertia } from "../persona/inertia.js";
import type { FractalSeed } from "./fractalStore.js";
import { DENSITY_THRESHOLDS, INFLUENCE_COEFFICIENTS } from "./constants.js";

// KOKŪZŌ: 展開された人格初期プロファイル（内部用、UI/レスポンスには返さない）
export type ExpandedPersonaProfile = {
  baseThinkingAxis?: ThinkingAxis;
  baseKanagiPhase?: KanagiPhase;
  baseLexicalBias?: LexicalBias;
  baseInertia?: number; // 0.0〜1.0
};

/**
 * KOKŪZŌ: FractalSeedから人格初期プロファイルを生成する
 * 
 * FractalSeedのdensityが低い場合は無視する。
 */
export function expandFromFractalSeed(
  fractal: FractalSeed | null
): ExpandedPersonaProfile | null {
  if (!fractal) {
    return null;
  }
  
  // densityが低い場合は無視
  if (fractal.density < DENSITY_THRESHOLDS.MIN_FOR_EXPANSION) {
    return null;
  }
  
  return {
    baseThinkingAxis: fractal.dominantThinkingAxis,
    baseKanagiPhase: fractal.dominantKanagiPhase,
    baseLexicalBias: { ...fractal.lexicalBiasProfile },
    baseInertia: fractal.inertiaProfile,
  };
}

/**
 * KOKŪZŌ: 展開されたプロファイルを初期値として弱く適用する
 * 
 * 上書きは禁止、あくまで「初期傾向」として加味する。
 */
export function applyExpandedProfileToInertia(
  currentInertia: PersonaInertia | undefined,
  profile: ExpandedPersonaProfile | null
): PersonaInertia | undefined {
  if (!profile || profile.baseInertia === undefined) {
    return currentInertia;
  }
  
  if (!currentInertia) {
    // 現在のinertiaがない場合、baseInertiaを小さく適用
    return {
      lastMode: "calm",
      level: profile.baseInertia * INFLUENCE_COEFFICIENTS.EXPANSION_INERTIA_INITIAL,
      updatedAt: Date.now(),
    };
  }
  
  // 現在のinertiaがある場合、baseInertiaを小さく加算（上書きしない）
  const adjustment = (profile.baseInertia - currentInertia.level) * INFLUENCE_COEFFICIENTS.EXPANSION_INERTIA_ADJUSTMENT;
  return {
    ...currentInertia,
    level: Math.max(0.0, Math.min(1.0, currentInertia.level + adjustment)),
  };
}

/**
 * KOKŪZŌ: 展開されたプロファイルを初期値として弱く適用する（thinkingAxis）
 * 
 * 初期決定前に加味する。後続処理で自然に上書きされる。
 */
export function applyExpandedProfileToThinkingAxis(
  profile: ExpandedPersonaProfile | null
): ThinkingAxis | undefined {
  if (!profile || !profile.baseThinkingAxis) {
    return undefined;
  }
  
  // baseThinkingAxisを返す（後続処理で上書きされる可能性がある）
  return profile.baseThinkingAxis;
}

/**
 * KOKŪZŌ: 展開されたプロファイルを初期値として弱く適用する（kanagiPhase）
 * 
 * 初期決定前に加味する。後続処理で自然に上書きされる。
 */
export function applyExpandedProfileToKanagiPhase(
  profile: ExpandedPersonaProfile | null
): KanagiPhase | undefined {
  if (!profile || !profile.baseKanagiPhase) {
    return undefined;
  }
  
  // baseKanagiPhaseを返す（後続処理で上書きされる可能性がある）
  return profile.baseKanagiPhase;
}

/**
 * KOKŪZŌ: 展開されたプロファイルを初期値として弱く適用する（lexicalBias）
 * 
 * 初期決定前に加味する。後続処理で自然に上書きされる。
 */
export function applyExpandedProfileToLexicalBias(
  currentBias: LexicalBias | null,
  profile: ExpandedPersonaProfile | null
): LexicalBias | undefined {
  if (!profile || !profile.baseLexicalBias) {
    return undefined;
  }
  
  if (!currentBias) {
    // 現在のbiasがない場合、baseLexicalBiasを小さく適用
    return {
      conciseness: profile.baseLexicalBias.conciseness * INFLUENCE_COEFFICIENTS.EXPANSION_LEXICAL_BIAS_INITIAL,
      abstraction: profile.baseLexicalBias.abstraction * INFLUENCE_COEFFICIENTS.EXPANSION_LEXICAL_BIAS_INITIAL,
      softness: profile.baseLexicalBias.softness * INFLUENCE_COEFFICIENTS.EXPANSION_LEXICAL_BIAS_INITIAL,
      decisiveness: profile.baseLexicalBias.decisiveness * INFLUENCE_COEFFICIENTS.EXPANSION_LEXICAL_BIAS_INITIAL,
    };
  }
  
  // 現在のbiasがある場合、baseLexicalBiasを小さく加算（上書きしない）
  const adjustment = INFLUENCE_COEFFICIENTS.EXPANSION_LEXICAL_BIAS_ADJUSTMENT;
  return {
    conciseness: Math.max(0.0, Math.min(1.0, 
      currentBias.conciseness + (profile.baseLexicalBias.conciseness - currentBias.conciseness) * adjustment
    )),
    abstraction: Math.max(0.0, Math.min(1.0, 
      currentBias.abstraction + (profile.baseLexicalBias.abstraction - currentBias.abstraction) * adjustment
    )),
    softness: Math.max(0.0, Math.min(1.0, 
      currentBias.softness + (profile.baseLexicalBias.softness - currentBias.softness) * adjustment
    )),
    decisiveness: Math.max(0.0, Math.min(1.0, 
      currentBias.decisiveness + (profile.baseLexicalBias.decisiveness - currentBias.decisiveness) * adjustment
    )),
  };
}

