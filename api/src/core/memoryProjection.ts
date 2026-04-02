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
  sourceBindingIds?: string[];
}

export interface MemoryProjectionPack {
  mode: string;
  personaId?: string;
  threadId: string;
  items: MemoryProjectionItem[];
  compactSummary: string;
}

const MAX_PROJECTION_CHARS = 2000;

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ensureColumnIfMissing(table: string, column: string, ddl: string): void {
  const db = getDb("kokuzo");
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
    const exists = rows.some((r) => String(r?.name || "").trim() === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  } catch {
    // keep chat path non-fatal
  }
}

function ensureProjectionTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_units (
      id TEXT PRIMARY KEY,
      memory_scope TEXT NOT NULL,
      scope_id TEXT,
      memory_type TEXT NOT NULL DEFAULT 'note',
      title TEXT,
      summary TEXT NOT NULL DEFAULT '',
      structured_json TEXT NOT NULL DEFAULT '{}',
      evidence_json TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.7,
      freshness_score REAL NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  ensureColumnIfMissing("memory_units", "title", "title TEXT");
  ensureColumnIfMissing("memory_units", "structured_json", "structured_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumnIfMissing("memory_units", "evidence_json", "evidence_json TEXT NOT NULL DEFAULT '[]'");
  ensureColumnIfMissing("memory_units", "updated_at", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
}

function upsertMemoryUnit(args: {
  memoryScope: string;
  scopeId?: string | null;
  memoryType: string;
  title: string;
  summary: string;
  structured: Record<string, unknown>;
  evidence: Record<string, unknown>;
  confidence?: number;
  freshnessScore?: number;
  pinned?: number;
}): string | null {
  try {
    ensureProjectionTables();
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        "SELECT id FROM memory_units WHERE memory_scope=? AND COALESCE(scope_id,'')=COALESCE(?, '') AND memory_type=? AND title=? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
      )
      .get(args.memoryScope, args.scopeId ?? null, args.memoryType, args.title) as { id?: string } | undefined;
    const summary = String(args.summary || "").replace(/\s+/g, " ").trim().slice(0, 240);
    const structuredJson = JSON.stringify(args.structured ?? {});
    const evidenceJson = JSON.stringify(args.evidence ?? {});
    if (row?.id) {
      db.prepare(
        "UPDATE memory_units SET summary=?, structured_json=?, evidence_json=?, confidence=?, freshness_score=?, pinned=?, updated_at=datetime('now') WHERE id=?",
      ).run(
        summary,
        structuredJson,
        evidenceJson,
        Number(args.confidence ?? 0.7),
        Number(args.freshnessScore ?? 0.5),
        Number(args.pinned ?? 0),
        row.id,
      );
      return String(row.id);
    }
    const id = randomUUID();
    db.prepare(
      "INSERT INTO memory_units(id,memory_scope,scope_id,memory_type,title,summary,structured_json,evidence_json,confidence,freshness_score,pinned,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
    ).run(
      id,
      args.memoryScope,
      args.scopeId ?? null,
      args.memoryType,
      args.title,
      summary,
      structuredJson,
      evidenceJson,
      Number(args.confidence ?? 0.7),
      Number(args.freshnessScore ?? 0.5),
      Number(args.pinned ?? 0),
    );
    return id;
  } catch {
    return null;
  }
}

function distillThreadCenterMemory(threadId: string): string[] {
  try {
    const db = getDb("kokuzo");
    let rows = db
      .prepare(
        `SELECT thread_id, center_type, center_key, center_reason, next_axes_json, source_route_reason, source_scripture_key,
                essential_goal, success_criteria_json, constraints_json, confidence, updated_at
           FROM thread_center_memory
          WHERE thread_id = ?
          ORDER BY updated_at DESC
          LIMIT 3`,
      )
      .all(threadId) as any[];
    if (rows.length === 0) {
      rows = db
        .prepare(
          `SELECT thread_id, center_type, center_key, center_reason, next_axes_json, source_route_reason, source_scripture_key,
                  essential_goal, success_criteria_json, constraints_json, confidence, updated_at
             FROM thread_center_memory
            ORDER BY updated_at DESC
            LIMIT 3`,
        )
        .all() as any[];
    }
    const ids: string[] = [];
    for (const row of rows) {
      const nextAxes = safeJsonParse<unknown[]>(row.next_axes_json, []);
      const successCriteria = safeJsonParse<string[]>(row.success_criteria_json, []);
      const constraints = safeJsonParse<string[]>(row.constraints_json, []);
      const title = String(row.center_key || row.center_type || "thread_center").slice(0, 160);
      const summary = [
        row.center_reason,
        row.essential_goal ? `goal:${row.essential_goal}` : "",
        nextAxes.length ? `axes:${nextAxes.slice(0, 3).join(" / ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const id = upsertMemoryUnit({
        memoryScope: "thread",
        scopeId: String(row.thread_id || threadId),
        memoryType: "thread_center_distill",
        title,
        summary,
        structured: {
          center_type: row.center_type,
          center_key: row.center_key,
          center_reason: row.center_reason,
          next_axes: nextAxes,
          essential_goal: row.essential_goal,
          success_criteria: successCriteria,
          constraints,
        },
        evidence: {
          source_table: "thread_center_memory",
          thread_id: threadId,
          source_route_reason: row.source_route_reason,
          source_scripture_key: row.source_scripture_key,
          updated_at: row.updated_at,
        },
        confidence: Number(row.confidence ?? 0.7),
        freshnessScore: 1,
      });
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

function distillScriptureMemory(threadId: string): string[] {
  try {
    const db = getDb("kokuzo");
    let rows = db
      .prepare(
        `SELECT threadId, routeReason, scriptureKey, subconceptKey, conceptKey, resolvedLevel, hasEvidence, hasLawTrace, unresolvedNote, createdAt
           FROM scripture_learning_ledger
          WHERE threadId = ?
          ORDER BY createdAt DESC
          LIMIT 6`,
      )
      .all(threadId) as any[];
    if (rows.length === 0) {
      rows = db
        .prepare(
          `SELECT threadId, routeReason, scriptureKey, subconceptKey, conceptKey, resolvedLevel, hasEvidence, hasLawTrace, unresolvedNote, createdAt
             FROM scripture_learning_ledger
            ORDER BY createdAt DESC
            LIMIT 6`,
        )
        .all() as any[];
    }
    const ids: string[] = [];
    for (const row of rows) {
      const title = String(row.scriptureKey || row.subconceptKey || row.conceptKey || row.resolvedLevel || "scripture")
        .slice(0, 160);
      const summary = [
        row.scriptureKey || row.subconceptKey || row.conceptKey || row.resolvedLevel,
        row.unresolvedNote || "",
      ]
        .filter(Boolean)
        .join(" | ");
      const id = upsertMemoryUnit({
        memoryScope: "thread",
        scopeId: String(row.threadId || threadId),
        memoryType: "scripture_distill",
        title,
        summary,
        structured: {
          scriptureKey: row.scriptureKey,
          subconceptKey: row.subconceptKey,
          conceptKey: row.conceptKey,
          resolvedLevel: row.resolvedLevel,
          unresolvedNote: row.unresolvedNote,
        },
        evidence: {
          source_table: "scripture_learning_ledger",
          thread_id: row.threadId,
          routeReason: row.routeReason,
          hasEvidence: Boolean(row.hasEvidence),
          hasLawTrace: Boolean(row.hasLawTrace),
          createdAt: row.createdAt,
        },
        confidence: row.hasEvidence ? 0.82 : 0.68,
        freshnessScore: 0.9,
      });
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

function distillTrainingRules(): string[] {
  try {
    const db = getDb("kokuzo");
    const rows = db
      .prepare(
        `SELECT id, session_id, type, title, rule_text, tags, evidence_message_ids, confidence, created_at
           FROM training_rules
          ORDER BY created_at DESC
          LIMIT 8`,
      )
      .all() as any[];
    const ids: string[] = [];
    for (const row of rows) {
      const tags = safeJsonParse<string[]>(row.tags, []);
      const evidenceMessageIds = safeJsonParse<string[]>(row.evidence_message_ids, []);
      const id = upsertMemoryUnit({
        memoryScope: "training",
        scopeId: String(row.session_id || ""),
        memoryType: "training_rule",
        title: String(row.title || row.type || "training_rule").slice(0, 160),
        summary: String(row.rule_text || "").replace(/\s+/g, " ").trim().slice(0, 240),
        structured: {
          type: row.type,
          tags,
          evidence_message_ids: evidenceMessageIds,
        },
        evidence: {
          source_table: "training_rules",
          session_id: row.session_id,
          training_rule_id: row.id,
          created_at: row.created_at,
        },
        confidence: Math.max(0.5, Math.min(1, Number(row.confidence ?? 1) / 10)),
        freshnessScore: 0.7,
      });
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

function distillSourceMemory(): string[] {
  try {
    const db = getDb("kokuzo");
    const rows = db
      .prepare(
        `SELECT id, source_type, uri, status, metaJson, fingerprint, COALESCE(updated_at, created_at) AS touched_at
           FROM source_registry
          WHERE status IN ('active','partial')
          ORDER BY COALESCE(updated_at, created_at) DESC
          LIMIT 8`,
      )
      .all() as any[];
    const ids: string[] = [];
    for (const row of rows) {
      const meta = safeJsonParse<Record<string, unknown>>(row.metaJson, {});
      const title = String(meta.title || row.uri || row.source_type || "source").slice(0, 160);
      const summary = [row.source_type, row.status, row.uri].filter(Boolean).join(" | ").slice(0, 240);
      const id = upsertMemoryUnit({
        memoryScope: "source",
        scopeId: String(row.id || ""),
        memoryType: "source_distill",
        title,
        summary,
        structured: {
          source_type: row.source_type,
          uri: row.uri,
          status: row.status,
          meta,
        },
        evidence: {
          source_table: "source_registry",
          source_id: row.id,
          fingerprint: row.fingerprint,
          touched_at: row.touched_at,
        },
        confidence: row.status === "active" ? 0.72 : 0.55,
        freshnessScore: 0.6,
      });
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

function distillFoundationMemory(threadId: string): string[] {
  return [
    ...distillThreadCenterMemory(threadId),
    ...distillScriptureMemory(threadId),
    ...distillTrainingRules(),
    ...distillSourceMemory(),
  ];
}

function memoryUnitToItem(row: any): MemoryProjectionItem {
  const evidence = safeJsonParse<Record<string, unknown>>(row.evidence_json, {});
  const evidenceRefs = Object.entries(evidence)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}:${String(value).slice(0, 120)}`);
  const sourceBindingIds = [
    typeof evidence.source_id === "string" ? evidence.source_id : "",
    typeof evidence.training_rule_id === "string" ? evidence.training_rule_id : "",
    typeof evidence.thread_id === "string" ? evidence.thread_id : "",
  ].filter(Boolean);
  return {
    memoryUnitId: String(row.id || ""),
    memoryType: String(row.memory_type || "note"),
    summary: String(row.summary || "").slice(0, 200),
    confidence: Number(row.confidence ?? 0.7),
    evidenceRefs,
    sourceBindingIds,
  };
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
  distillFoundationMemory(threadId);
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

  const distilledThreadUnits = db
    .prepare(
      `SELECT * FROM memory_units
        WHERE memory_scope='thread' AND scope_id=? AND memory_type IN ('conversation_distill','thread_center_distill','scripture_distill')
        ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
        LIMIT 8`,
    )
    .all(threadId) as any[];
  for (const u of distilledThreadUnits) {
    items.push(memoryUnitToItem(u));
  }

  const distilledTrainingUnits = db
    .prepare(
      `SELECT * FROM memory_units
        WHERE memory_scope='training' AND memory_type='training_rule'
        ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
        LIMIT 4`,
    )
    .all() as any[];
  for (const u of distilledTrainingUnits) {
    items.push(memoryUnitToItem(u));
  }

  const distilledSourceUnits = db
    .prepare(
      `SELECT * FROM memory_units
        WHERE memory_scope='source' AND memory_type='source_distill'
        ORDER BY freshness_score DESC, updated_at DESC, created_at DESC
        LIMIT 4`,
    )
    .all() as any[];
  for (const u of distilledSourceUnits) {
    items.push(memoryUnitToItem(u));
  }

  const dedupedItems = items.filter(
    (item, index, arr) => arr.findIndex((other) => other.memoryUnitId === item.memoryUnitId) === index,
  );

  const compactSummary = dedupedItems
    .map((i) => i.summary)
    .join(" / ")
    .slice(0, MAX_PROJECTION_CHARS);

  return { mode, personaId: persona?.id, threadId, items: dedupedItems, compactSummary };
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
      JSON.stringify(
        pack.items.flatMap((i) => (Array.isArray(i.sourceBindingIds) ? i.sourceBindingIds : [])).filter(Boolean),
      )
    );
  } catch {
    // keep chat path non-fatal
  }
}

export function upsertConversationDistillMemoryV1(args: {
  threadId: string;
  centerKey?: string | null;
  routeReason?: string | null;
  responseText?: string | null;
}): void {
  try {
    ensureProjectionTables();
    const threadId = String(args.threadId || "").trim();
    const centerKey = String(args.centerKey || "").trim();
    const routeReason = String(args.routeReason || "").trim();
    const responseText = String(args.responseText || "").trim();
    if (!threadId || !centerKey || !responseText) return;

    const summary = responseText.replace(/\s+/g, " ").slice(0, 240);
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        "SELECT id FROM memory_units WHERE memory_scope=? AND scope_id=? AND memory_type=? AND title=? ORDER BY updated_at DESC, created_at DESC LIMIT 1"
      )
      .get("thread", threadId, "conversation_distill", centerKey) as { id?: string } | undefined;

    const evidenceJson = JSON.stringify({
      routeReason,
      centerKey,
      threadId,
    });
    const structuredJson = JSON.stringify({
      summary,
      response_excerpt: responseText.slice(0, 400),
    });

    if (row?.id) {
      db.prepare(
        "UPDATE memory_units SET summary=?, structured_json=?, evidence_json=?, freshness_score=?, updated_at=datetime('now') WHERE id=?"
      ).run(summary, structuredJson, evidenceJson, 1, row.id);
      return;
    }

    db.prepare(
      "INSERT INTO memory_units(id,memory_scope,scope_id,memory_type,title,summary,structured_json,evidence_json,confidence,freshness_score,pinned,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))"
    ).run(
      randomUUID(),
      "thread",
      threadId,
      "conversation_distill",
      centerKey,
      summary,
      structuredJson,
      evidenceJson,
      0.7,
      1,
      0
    );
  } catch {
    // keep chat path non-fatal
  }
}
