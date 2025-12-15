/**
 * ============================================================
 *  MULTIPHASE REISHŌ PERSONA — マルチフェーズ Persona
 * ============================================================
 * 
 * 複数の Phase を同時に保持し、動的に切り替える
 * Persona が複数の Phase を統合して動作
 * 
 * 機能:
 * - マルチフェーズ状態管理
 * - 動的 Phase 切り替え
 * - Phase の重ね合わせ
 * ============================================================
 */

import { generatePhaseState, type PhaseState } from "./phaseEngine";
import type { ReishoPhase } from "./phaseEngine";

export interface MultiphasePersona {
  /** 現在の主要 Phase */
  primaryPhase: ReishoPhase;
  
  /** アクティブな Phase のリスト */
  activePhases: Array<{
    phase: ReishoPhase;
    weight: number; // 0-1
    intensity: number; // 0-1
  }>;
  
  /** Phase の履歴 */
  phaseHistory: Array<{
    phase: ReishoPhase;
    timestamp: number;
    duration: number;
  }>;
  
  /** 統合 Phase State */
  unifiedPhaseState: PhaseState;
  
  /** マルチフェーズ度 */
  multiphaseDegree: number; // 0-1 (1 = 完全マルチフェーズ)
}

/**
 * Multiphase Reishō Persona を有効化
 */
export function enableMultiphaseReishoPersona(
  text: string,
  initialPhases: ReishoPhase[] = ["L-IN", "R-OUT"]
): MultiphasePersona {
  // 初期 Phase State を生成
  const primaryPhaseState = generatePhaseState(text);
  const primaryPhase = primaryPhaseState.phase;
  
  // アクティブな Phase を初期化
  const activePhases = initialPhases.map((phase, idx) => ({
    phase,
    weight: idx === 0 ? 0.6 : 0.4 / (initialPhases.length - 1),
    intensity: 0.8,
  }));
  
  // 主要 Phase がアクティブに含まれていない場合は追加
  if (!activePhases.some(ap => ap.phase === primaryPhase)) {
    activePhases.push({
      phase: primaryPhase,
      weight: 0.5,
      intensity: 0.9,
    });
    // 重みを正規化
    const totalWeight = activePhases.reduce((sum, ap) => sum + ap.weight, 0);
    activePhases.forEach(ap => ap.weight /= totalWeight);
  }
  
  // マルチフェーズ度を計算
  const multiphaseDegree = activePhases.length > 1 ? Math.min(1, activePhases.length / 4) : 0;
  
  return {
    primaryPhase,
    activePhases,
    phaseHistory: [{
      phase: primaryPhase,
      timestamp: Date.now(),
      duration: 0,
    }],
    unifiedPhaseState: primaryPhaseState,
    multiphaseDegree,
  };
}

/**
 * Multiphase Persona を更新
 */
export function updateMultiphasePersona(
  persona: MultiphasePersona,
  newText: string
): MultiphasePersona {
  // 新しい Phase State を生成
  const newPhaseState = generatePhaseState(newText);
  const newPhase = newPhaseState.phase;
  
  // 既存の Phase の重みを減衰
  const updatedActivePhases = persona.activePhases.map(ap => ({
    ...ap,
    weight: ap.weight * 0.9, // 10%減衰
    intensity: ap.intensity * 0.95,
  }));
  
  // 新しい Phase を追加または既存の重みを増加
  const existingPhaseIndex = updatedActivePhases.findIndex(ap => ap.phase === newPhase);
  if (existingPhaseIndex >= 0) {
    updatedActivePhases[existingPhaseIndex].weight += 0.2;
    updatedActivePhases[existingPhaseIndex].intensity = Math.min(1, updatedActivePhases[existingPhaseIndex].intensity + 0.1);
  } else {
    updatedActivePhases.push({
      phase: newPhase,
      weight: 0.3,
      intensity: 0.8,
    });
  }
  
  // 重みを正規化
  const totalWeight = updatedActivePhases.reduce((sum, ap) => sum + ap.weight, 0);
  updatedActivePhases.forEach(ap => {
    ap.weight /= totalWeight;
  });
  
  // 低重みの Phase を削除
  const filteredPhases = updatedActivePhases.filter(ap => ap.weight > 0.1);
  
  // 主要 Phase を決定（最も重みが大きい Phase）
  const primaryPhase = filteredPhases.reduce((max, ap) => 
    ap.weight > max.weight ? ap : max
  ).phase;
  
  // Phase 履歴を更新
  const lastHistory = persona.phaseHistory[persona.phaseHistory.length - 1];
  const now = Date.now();
  const duration = lastHistory ? now - lastHistory.timestamp : 0;
  
  const phaseHistory = [
    ...persona.phaseHistory.slice(-9), // 最新10件まで保持
    {
      phase: newPhase,
      timestamp: now,
      duration,
    },
  ];
  
  // マルチフェーズ度を更新
  const multiphaseDegree = filteredPhases.length > 1 
    ? Math.min(1, filteredPhases.length / 4) 
    : 0;
  
  // 統合 Phase State を計算（重み付き平均）
  const unifiedPhaseState = computeUnifiedPhaseState(filteredPhases, newPhaseState);
  
  return {
    primaryPhase,
    activePhases: filteredPhases,
    phaseHistory,
    unifiedPhaseState,
    multiphaseDegree,
  };
}

/**
 * 統合 Phase State を計算
 */
function computeUnifiedPhaseState(
  activePhases: Array<{ phase: ReishoPhase; weight: number; intensity: number }>,
  basePhaseState: PhaseState
): PhaseState {
  // 簡易版: ベース Phase State を使用
  // 実際の実装では、各 Phase の重みに基づいて統合する必要がある
  return {
    ...basePhaseState,
    intensity: activePhases.reduce((sum, ap) => sum + ap.intensity * ap.weight, 0),
  };
}

/**
 * Multiphase Persona から Persona を取得
 */
export function getPersonaFromMultiphase(
  multiphase: MultiphasePersona
): {
  persona: "architect" | "guardian" | "companion" | "silent";
  confidence: number;
  activePhases: ReishoPhase[];
} {
  const { personaMapping } = multiphase.unifiedPhaseState;
  
  const scores = [
    { persona: "architect" as const, score: personaMapping.architect },
    { persona: "guardian" as const, score: personaMapping.guardian },
    { persona: "companion" as const, score: personaMapping.companion },
    { persona: "silent" as const, score: personaMapping.silent },
  ];
  
  scores.sort((a, b) => b.score - a.score);
  
  const activePhases = multiphase.activePhases.map(ap => ap.phase);
  
  return {
    persona: scores[0].persona,
    confidence: scores[0].score * (1 + multiphase.multiphaseDegree * 0.2), // マルチフェーズ度で補正
    activePhases,
  };
}

export default {
  enableMultiphaseReishoPersona,
  updateMultiphasePersona,
  getPersonaFromMultiphase,
};

