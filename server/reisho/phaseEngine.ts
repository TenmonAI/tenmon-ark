/**
 * ============================================================
 *  REISHŌ PHASE ENGINE — Persona → Phase 変換
 * ============================================================
 * 
 * Persona Engine を Phase Engine に変換
 * Persona は Reishō Phase として表現される
 * 
 * フェーズ:
 * - L-IN: 内集・左旋（Companion 的）
 * - L-OUT: 外発・左旋（Creative 的）
 * - R-IN: 内集・右旋（Guardian 的）
 * - R-OUT: 外発・右旋（Architect 的）
 * ============================================================
 */

import type { KanagiState } from "../../kokuzo/reisho/kanagiODE";
import { kanagiPhaseFromState } from "../../kokuzo/reisho/kanagiODE";
import { computeReishoSignature } from "./reishoKernel";

export type ReishoPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

export interface PhaseState {
  phase: ReishoPhase;
  kanagiState: KanagiState;
  fireWaterBalance: number; // -1 (水優勢) ～ +1 (火優勢)
  intensity: number; // 0-1
  personaMapping: {
    architect: number;
    guardian: number;
    companion: number;
    silent: number;
  };
}

/**
 * Persona を Phase に変換
 */
export function convertPersonaToPhase(
  persona: "architect" | "guardian" | "companion" | "silent",
  text: string
): ReishoPhase {
  // Persona から初期 Phase を決定
  switch (persona) {
    case "architect":
      return "R-OUT"; // 外発・右旋
    case "guardian":
      return "R-IN";  // 内集・右旋
    case "companion":
      return "L-IN";  // 内集・左旋
    case "silent":
      return "L-OUT"; // 外発・左旋（デフォルト）
  }
}

/**
 * Phase State を生成
 */
export function createPhaseState(
  text: string,
  kanagiState: KanagiState
): PhaseState {
  const phase = kanagiPhaseFromState(kanagiState);
  const fireWaterBalance = kanagiState.fire - kanagiState.water;
  const intensity = Math.abs(kanagiState.L) + Math.abs(kanagiState.R) + kanagiState.IN + kanagiState.OUT;
  
  // Persona マッピングを計算
  const personaMapping = {
    architect: phase === "R-OUT" ? 0.9 : phase === "R-IN" ? 0.3 : 0.1,
    guardian: phase === "R-IN" ? 0.9 : phase === "R-OUT" ? 0.3 : 0.1,
    companion: phase === "L-IN" ? 0.9 : phase === "L-OUT" ? 0.3 : 0.1,
    silent: intensity < 0.3 ? 0.9 : 0.1,
  };
  
  return {
    phase,
    kanagiState,
    fireWaterBalance,
    intensity,
    personaMapping,
  };
}

/**
 * Phase を Persona に逆変換
 */
export function convertPhaseToPersona(phaseState: PhaseState): {
  persona: "architect" | "guardian" | "companion" | "silent";
  confidence: number;
} {
  const { personaMapping } = phaseState;
  
  const scores = [
    { persona: "architect" as const, score: personaMapping.architect },
    { persona: "guardian" as const, score: personaMapping.guardian },
    { persona: "companion" as const, score: personaMapping.companion },
    { persona: "silent" as const, score: personaMapping.silent },
  ];
  
  scores.sort((a, b) => b.score - a.score);
  
  return {
    persona: scores[0].persona,
    confidence: scores[0].score,
  };
}

/**
 * Phase Engine: テキストから Phase State を生成
 */
export function generatePhaseState(text: string): PhaseState {
  const signature = computeReishoSignature(text);
  
  // KanagiState を Reishō シグネチャから推定
  const kanagiState: KanagiState = {
    t: Date.now() / 1000,
    L: signature.kanagiPhaseTensor[0]?.[0] ?? 0,
    R: signature.kanagiPhaseTensor[0]?.[1] ?? 0,
    IN: signature.kanagiPhaseTensor[1]?.[0] ?? 0,
    OUT: signature.kanagiPhaseTensor[1]?.[1] ?? 0,
    fire: signature.kanagiPhaseTensor[2]?.[0] ?? 0,
    water: signature.kanagiPhaseTensor[2]?.[1] ?? 0,
  };
  
  return createPhaseState(text, kanagiState);
}

export default {
  convertPersonaToPhase,
  createPhaseState,
  convertPhaseToPersona,
  generatePhaseState,
};

