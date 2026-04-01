import { getDb } from "../db/index.js";

export type MemoryInheritanceMode =
  | "none"
  | "user_only"
  | "user_plus_project"
  | "user_plus_project_plus_thread_summary"
  | "persona_isolated"
  | "custom";

export interface MemoryPolicy {
  mode: MemoryInheritanceMode;
  include_user_stable_memory: boolean;
  include_project_memory: boolean;
  include_thread_summary: boolean;
  include_last_n_threads: number;
  include_persona_learning: boolean;
  include_bound_source_summaries: boolean;
  exclude_preview_threads: boolean;
  exclude_sensitive_context: boolean;
  require_evidence_for_memory_claims: boolean;
}

const DEFAULT_POLICY: MemoryPolicy = {
  mode: "user_plus_project",
  include_user_stable_memory: true,
  include_project_memory: true,
  include_thread_summary: false,
  include_last_n_threads: 0,
  include_persona_learning: false,
  include_bound_source_summaries: true,
  exclude_preview_threads: true,
  exclude_sensitive_context: true,
  require_evidence_for_memory_claims: false,
};

function ensureMemoryPolicyTable(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS persona_memory_policies (
      id TEXT PRIMARY KEY,
      persona_id TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'user_plus_project',
      policy_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getMemoryPolicy(personaId: string): MemoryPolicy {
  try {
    ensureMemoryPolicyTable();
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        "SELECT policy_json, mode FROM persona_memory_policies WHERE persona_id=? ORDER BY created_at DESC LIMIT 1"
      )
      .get(personaId) as { policy_json?: string; mode?: string } | undefined;
    if (!row) return { ...DEFAULT_POLICY };
    const mode = (row.mode || "user_plus_project") as MemoryInheritanceMode;
    let custom: Partial<MemoryPolicy> = {};
    try {
      custom = JSON.parse(row.policy_json || "{}") as Partial<MemoryPolicy>;
    } catch {
      custom = {};
    }
    return { ...DEFAULT_POLICY, mode, ...custom };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function policyFromMode(mode: MemoryInheritanceMode): MemoryPolicy {
  const base: MemoryPolicy = { ...DEFAULT_POLICY, mode };
  switch (mode) {
    case "none":
      return {
        ...base,
        include_user_stable_memory: false,
        include_project_memory: false,
        include_bound_source_summaries: false,
      };
    case "user_only":
      return {
        ...base,
        include_project_memory: false,
      };
    case "persona_isolated":
      return {
        ...base,
        include_user_stable_memory: false,
        include_project_memory: false,
        include_persona_learning: true,
      };
    default:
      return base;
  }
}
