/**
 * R10_SYNAPSE_TO_THREAD_SEED_V1
 * synapse_log / decisionFrame.ku から ark_thread_seeds へ昇格。1 response 1 seed、append-only / best-effort。
 */
import crypto from "node:crypto";
import { getDb } from "../db/index.js";

export type ThreadSeedRow = {
  seedId: string;
  threadId: string;
  createdAt: string;
  routeReason: string;
  topicClass: string | null;
  scriptureKey: string | null;
  selfPhase: string | null;
  intentPhase: string | null;
  driftRisk: number | null;
  lawsUsedJson: string;
  evidenceIdsJson: string;
  heartJson: string;
  lawTraceJson: string;
  sourceKind: string;
};

const SOURCE_KIND = "synapse_to_thread_seed_v1";

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  return String(v).trim() || null;
}
function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * decisionFrame.ku から thread seed 用の行を組み立てる。pure。
 */
export function buildThreadSeedFromKu(
  ku: Record<string, unknown>,
  threadId: string,
  createdAt?: string
): ThreadSeedRow | null {
  const rr = str(ku.routeReason);
  if (!threadId || !rr) return null;

  const mf = ku.meaningFrame as Record<string, unknown> | undefined;
  const ks = ku.kanagiSelf as Record<string, unknown> | undefined;
  const topicClass = str(ks?.topicClass ?? mf?.topicClass) ?? null;
  const scriptureKey = str(ku.scriptureKey ?? ks?.scriptureKey ?? mf?.scriptureKey) ?? null;
  const selfPhase = str(ks?.selfPhase) ?? null;
  const intentPhase = str(ks?.intentPhase) ?? null;
  const driftRisk = num(ks?.driftRisk) ?? null;

  const lawsUsed = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
  const evidenceIds = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];
  const lawTrace = Array.isArray(ku.lawTrace) ? ku.lawTrace : [];
  const lawsUsedJson = JSON.stringify(lawsUsed);
  const evidenceIdsJson = JSON.stringify(evidenceIds);
  const lawTraceJson = JSON.stringify(lawTrace);
  const heartJson = JSON.stringify(ku.heart ?? {});

  const ts = createdAt ?? new Date().toISOString();
  const seedId = crypto
    .createHash("sha256")
    .update(threadId + ts + rr + lawsUsedJson + evidenceIdsJson)
    .digest("hex")
    .slice(0, 32);

  return {
    seedId,
    threadId,
    createdAt: ts,
    routeReason: rr,
    topicClass,
    scriptureKey,
    selfPhase,
    intentPhase,
    driftRisk,
    lawsUsedJson,
    evidenceIdsJson,
    heartJson,
    lawTraceJson,
    sourceKind: SOURCE_KIND,
  };
}

let _schemaEnsured = false;

function ensureThreadSeedSchema(): void {
  if (_schemaEnsured) return;
  _schemaEnsured = true;
  try {
    const db = getDb("kokuzo");
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ark_thread_seeds (
        seedId TEXT PRIMARY KEY,
        threadId TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        routeReason TEXT NOT NULL DEFAULT '',
        topicClass TEXT,
        scriptureKey TEXT,
        selfPhase TEXT,
        intentPhase TEXT,
        driftRisk REAL,
        lawsUsedJson TEXT NOT NULL DEFAULT '[]',
        evidenceIdsJson TEXT NOT NULL DEFAULT '[]',
        heartJson TEXT NOT NULL DEFAULT '{}',
        lawTraceJson TEXT NOT NULL DEFAULT '[]',
        sourceKind TEXT NOT NULL DEFAULT 'synapse_to_thread_seed_v1'
      )
    `).run();
    const alterCols = [
      "topicClass TEXT",
      "scriptureKey TEXT",
      "selfPhase TEXT",
      "intentPhase TEXT",
      "driftRisk REAL",
      "lawTraceJson TEXT NOT NULL DEFAULT '[]'",
      "sourceKind TEXT NOT NULL DEFAULT 'synapse_to_thread_seed_v1'",
    ];
    for (const col of alterCols) {
      try {
        db.prepare(`ALTER TABLE ark_thread_seeds ADD COLUMN ${col}`).run();
      } catch {
        // column may already exist (e.g. table created from schema)
      }
    }
  } catch {
    // best-effort
  }
}

/**
 * payload（gate 通過後）から 1 件だけ ark_thread_seeds に append。
 * threadId / ku / routeReason が有効なときのみ。二重防止は __THREAD_SEED_DONE。失敗しても会話を落とさない。
 */
export function tryAppendThreadSeedFromPayload(payload: unknown): void {
  try {
    if (payload == null || typeof payload !== "object") return;
    if ((payload as any).__THREAD_SEED_DONE === true) return;

    const df = (payload as any).decisionFrame;
    if (!df || typeof df !== "object") return;
    const ku = df.ku;
    if (!ku || typeof ku !== "object") return;

    const threadId = String((payload as any).threadId ?? "").trim();
    const rr = String(ku.routeReason ?? "").trim();
    if (!threadId || !rr) return;

    ensureThreadSeedSchema();

    const createdAt = String((payload as any).timestamp ?? new Date().toISOString());
    const row = buildThreadSeedFromKu(ku as Record<string, unknown>, threadId, createdAt);
    if (!row) return;

    const db = getDb("kokuzo");
    db.prepare(`
      INSERT OR IGNORE INTO ark_thread_seeds
      (seedId, threadId, createdAt, routeReason, topicClass, scriptureKey, selfPhase, intentPhase, driftRisk, lawsUsedJson, evidenceIdsJson, heartJson, lawTraceJson, sourceKind)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.seedId,
      row.threadId,
      row.createdAt,
      row.routeReason,
      row.topicClass,
      row.scriptureKey,
      row.selfPhase,
      row.intentPhase,
      row.driftRisk,
      row.lawsUsedJson,
      row.evidenceIdsJson,
      row.heartJson,
      row.lawTraceJson,
      row.sourceKind
    );

    (payload as any).__THREAD_SEED_DONE = true;
  } catch {
    // best-effort: must never break chat
  }
}
