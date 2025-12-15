/**
 * ============================================================
 *  PHASE STATE SCHEMA — Phase State 永続化スキーマ
 * ============================================================
 * 
 * Kokūzō Server の Phase State 永続化スキーマ
 * 
 * 構成:
 * - 現在の Phase
 * - Phase 履歴
 * - Persona マッピング
 * ============================================================
 */

import { z } from "zod";

/**
 * Phase State Schema
 */
export const phaseStateSchema = z.object({
  /** Phase State ID */
  id: z.string(),
  
  /** 現在の Phase */
  currentPhase: z.enum(["L-IN", "L-OUT", "R-IN", "R-OUT"]),
  
  /** Phase 履歴 */
  phaseHistory: z.array(z.object({
    phase: z.enum(["L-IN", "L-OUT", "R-IN", "R-OUT"]),
    timestamp: z.number(),
    duration: z.number(),
  })).default([]),
  
  /** Persona マッピング */
  personaMapping: z.object({
    architect: z.number().default(0),
    guardian: z.number().default(0),
    companion: z.number().default(0),
    silent: z.number().default(0),
  }).default({}),
  
  /** 作成日時 */
  createdAt: z.number(),
  
  /** 更新日時 */
  updatedAt: z.number(),
});

export type PhaseState = z.infer<typeof phaseStateSchema>;

/**
 * Phase State を作成
 */
export function createPhaseState(data: {
  id: string;
  currentPhase: PhaseState["currentPhase"];
  phaseHistory?: PhaseState["phaseHistory"];
  personaMapping?: PhaseState["personaMapping"];
}): PhaseState {
  const now = Date.now();
  
  return {
    id: data.id,
    currentPhase: data.currentPhase,
    phaseHistory: data.phaseHistory || [],
    personaMapping: data.personaMapping || {
      architect: 0,
      guardian: 0,
      companion: 0,
      silent: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export default {
  phaseStateSchema,
  createPhaseState,
};

