import { dbPrepare } from "../db/index.js";
import type { PersonaInertia } from "./inertia.js";
import type { ThinkingAxis } from "./thinkingAxis.js";
import type { KanagiPhase } from "./kanagi.js";

// CORE-4: 人格状態の可変型
export type PersonaState = {
  personaId: string;
  mode: "calm" | "thinking" | "engaged" | "silent";
  phase: "awake" | "listening" | "responding";
  // CORE-6: 慣性・余韻（既存、互換性のため残す）
  inertia: number; // 0〜10
  // CORE-6: 内部用の慣性情報（UI/レスポンスには返さない）
  _inertia?: PersonaInertia;
  // CORE-7: 内部用の思考軸（UI/レスポンスには返さない）
  _thinkingAxis?: ThinkingAxis;
  // CORE-8: 内部用の天津金木フェーズ（UI/レスポンスには返さない）
  _kanagiPhase?: KanagiPhase;
};

// CORE-4: 初期状態（必須）
let personaState: PersonaState = {
  personaId: "tenmon",
  mode: "calm",
  phase: "awake",
  inertia: 0,
  _inertia: undefined,
  _thinkingAxis: undefined,
  _kanagiPhase: undefined,
};

// CORE-4: 現在の人格状態を取得（UI/レスポンス用、_inertia、_thinkingAxis、_kanagiPhaseは除外）
export function getCurrentPersonaState(): Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase"> {
  const { _inertia, _thinkingAxis, _kanagiPhase, ...state } = personaState;
  return state;
}

// CORE-6: 内部用の人格状態を取得（_inertiaを含む）
export function getCurrentPersonaStateInternal(): PersonaState {
  return personaState;
}

// CORE-4: 人格状態を更新
export function setPersonaState(newState: Partial<PersonaState>): void {
  personaState = { ...personaState, ...newState };
}

export type PersonaStateRow = {
  personaId: string;
  toneLevel: number; // 0.8..1.2
  stanceLevel: number; // 0.8..1.2
  boundaryLevel: number; // 0.8..1.2
  lastUpdated: string; // ISO
};

export type PersonaStateDelta = {
  toneDelta: number;
  stanceDelta: number;
  boundaryDelta: number;
  reason?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function clamp01_2(x: number): number {
  return Math.max(0.8, Math.min(1.2, x));
}

const selectStmt = dbPrepare(
  "persona",
  "SELECT persona_id, tone_level, stance_level, boundary_level, last_updated FROM persona_state WHERE persona_id = ?"
);

const upsertStmt = dbPrepare(
  "persona",
  "INSERT INTO persona_state (persona_id, tone_level, stance_level, boundary_level, last_updated) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(persona_id) DO UPDATE SET tone_level = excluded.tone_level, stance_level = excluded.stance_level, boundary_level = excluded.boundary_level, last_updated = excluded.last_updated"
);

export function getPersonaState(personaId: string): PersonaStateRow {
  const row = selectStmt.get(personaId) as
    | {
        persona_id: string;
        tone_level: number;
        stance_level: number;
        boundary_level: number;
        last_updated: string;
      }
    | undefined;

  if (row) {
    return {
      personaId: row.persona_id,
      toneLevel: Number(row.tone_level),
      stanceLevel: Number(row.stance_level),
      boundaryLevel: Number(row.boundary_level),
      lastUpdated: row.last_updated,
    };
  }

  // baseline
  const created: PersonaStateRow = {
    personaId,
    toneLevel: 1.0,
    stanceLevel: 1.0,
    boundaryLevel: 1.0,
    lastUpdated: nowIso(),
  };

  upsertStmt.run(
    created.personaId,
    created.toneLevel,
    created.stanceLevel,
    created.boundaryLevel,
    created.lastUpdated
  );

  return created;
}

export function applyPersonaDelta(current: PersonaStateRow, delta: PersonaStateDelta): PersonaStateRow {
  return {
    personaId: current.personaId,
    toneLevel: clamp01_2(current.toneLevel + delta.toneDelta),
    stanceLevel: clamp01_2(current.stanceLevel + delta.stanceDelta),
    boundaryLevel: clamp01_2(current.boundaryLevel + delta.boundaryDelta),
    lastUpdated: nowIso(),
  };
}

export function savePersonaState(next: PersonaStateRow): void {
  upsertStmt.run(next.personaId, next.toneLevel, next.stanceLevel, next.boundaryLevel, next.lastUpdated);
}


