import { randomUUID } from "node:crypto";
import { getDb } from "../db/index.js";
import { getMemoryPolicy } from "./personaMemoryPolicy.js";
import type { PersonaProfile } from "./personaRegistry.js";

export interface MemoryProjectionItem {
  memoryUnitId: string;
  memoryType: string;
  summary: string;
  confidence: number;
  evidenceRefs: string[];
}

export interface MemoryProjectionPack {
  mode: string;
  personaId?: string;
  threadId: string;
  items: MemoryProjectionItem[];
  compactSummary: string;
}

const MAX_PROJECTION_CHARS = 2000;

function ensureProjectionTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_units (
      id TEXT PRIMARY KEY,
      memory_scope TEXT NOT NULL,
      scope_id TEXT,
      memory_type TEXT NOT NULL DEFAULT 'note',
      summary TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0.7,
      freshness_score REAL NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_projection_logs (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      persona_id TEXT,
      projection_json TEXT NOT NULL,
      source_memory_ids_json TEXT NOT NULL,
      source_binding_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function buildMemoryProjectionPack(args: {
  threadId: string;
  persona?: PersonaProfile | null;
  isPreview?: boolean;
}): MemoryProjectionPack {
  const { threadId, persona, isPreview = false } = args;

  if (isPreview) {
    return {
      mode: "preview_isolated",
      personaId: persona?.id,
      threadId,
      items: [],
      compactSummary: "",
    };
  }

  const policy = persona ? getMemoryPolicy(persona.id) : null;
  const mode = policy?.mode ?? "user_plus_project";

  if (mode === "none") {
    return { mode, personaId: persona?.id, threadId, items: [], compactSummary: "" };
  }

  ensureProjectionTables();
  const db = getDb("kokuzo");
  const items: MemoryProjectionItem[] = [];

  if (policy?.include_user_stable_memory) {
    const units = db
      .prepare(
        "SELECT * FROM memory_units WHERE memory_scope='user' AND pinned=1 ORDER BY freshness_score DESC, created_at DESC LIMIT 5"
      )
      .all() as any[];
    for (const u of units) {
      items.push({
        memoryUnitId: String(u.id || ""),
        memoryType: String(u.memory_type || "note"),
        summary: String(u.summary || "").slice(0, 200),
        confidence: Number(u.confidence ?? 0.7),
        evidenceRefs: [],
      });
    }
  }

  if (policy?.include_project_memory && persona) {
    const units = db
      .prepare(
        "SELECT * FROM memory_units WHERE memory_scope='persona' AND scope_id=? ORDER BY freshness_score DESC, created_at DESC LIMIT 5"
      )
      .all(persona.id) as any[];
    for (const u of units) {
      items.push({
        memoryUnitId: String(u.id || ""),
        memoryType: String(u.memory_type || "note"),
        summary: String(u.summary || "").slice(0, 200),
        confidence: Number(u.confidence ?? 0.7),
        evidenceRefs: [],
      });
    }
  }

  const compactSummary = items
    .map((i) => i.summary)
    .join(" / ")
    .slice(0, MAX_PROJECTION_CHARS);

  return { mode, personaId: persona?.id, threadId, items, compactSummary };
}

export function logMemoryProjection(pack: MemoryProjectionPack): void {
  try {
    ensureProjectionTables();
    const db = getDb("kokuzo");
    db.prepare(
      "INSERT INTO memory_projection_logs(id,thread_id,persona_id,projection_json,source_memory_ids_json,source_binding_ids_json,created_at) VALUES(?,?,?,?,?,?,datetime('now'))"
    ).run(
      randomUUID(),
      pack.threadId,
      pack.personaId ?? null,
      JSON.stringify(pack),
      JSON.stringify(pack.items.map((i) => i.memoryUnitId)),
      "[]"
    );
  } catch {
    // keep chat path non-fatal
  }
}
