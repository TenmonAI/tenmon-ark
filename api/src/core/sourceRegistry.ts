import { createHash, randomUUID } from "node:crypto";
import { getDb } from "../db/index.js";

export type SourceRegistryContract = {
  sourceType: string;
  uri?: string | null;
  meta?: Record<string, unknown> | null;
  fingerprintParts?: Array<string | number | null | undefined>;
  status?: string | null;
};

export type SourceAnalysisLogContract = {
  sourceId: string;
  projectId?: string | null;
  status: string;
  summary?: string | null;
  analysisType?: string | null;
  meta?: Record<string, unknown> | null;
  fingerprint?: string | null;
};

let _sourceTablesEnsured = false;

function ensureColumnIfMissing(table: string, column: string, ddl: string): void {
  const db = getDb("kokuzo");
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
    const exists = rows.some((r) => String(r?.name || "").trim() === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  } catch {
    // best-effort only
  }
}

export function ensureSourceRegistryTables(): void {
  if (_sourceTablesEnsured) return;
  _sourceTablesEnsured = true;
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_registry (
      id TEXT PRIMARY KEY,
      sourceType TEXT NOT NULL DEFAULT 'manual',
      source_type TEXT NOT NULL DEFAULT 'manual',
      uri TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metaJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_analysis_logs (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      sourceId TEXT,
      status TEXT NOT NULL DEFAULT 'ok',
      summary TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureColumnIfMissing("source_registry", "updatedAt", "updatedAt TEXT NOT NULL DEFAULT (datetime('now'))");
  ensureColumnIfMissing("source_registry", "updated_at", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
  ensureColumnIfMissing("source_registry", "fingerprint", "fingerprint TEXT");
  ensureColumnIfMissing("source_registry", "originKind", "originKind TEXT");
  ensureColumnIfMissing("source_analysis_logs", "updatedAt", "updatedAt TEXT NOT NULL DEFAULT (datetime('now'))");
  ensureColumnIfMissing("source_analysis_logs", "updated_at", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
  ensureColumnIfMissing("source_analysis_logs", "analysisType", "analysisType TEXT");
  ensureColumnIfMissing("source_analysis_logs", "metaJson", "metaJson TEXT");
  ensureColumnIfMissing("source_analysis_logs", "fingerprint", "fingerprint TEXT");
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_source_registry_fingerprint ON source_registry(fingerprint)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_source_analysis_logs_sourceId_created_at ON source_analysis_logs(sourceId, created_at DESC)");
  } catch {
    // ignore index errors
  }
}

export function buildSourceFingerprint(parts: Array<string | number | null | undefined>): string {
  const canonical = parts.map((v) => String(v ?? "").trim()).join("||");
  return createHash("sha256").update(canonical).digest("hex");
}

export function upsertSourceRegistry(contract: SourceRegistryContract): {
  sourceId: string;
  fingerprint: string;
  duplicate: boolean;
} {
  ensureSourceRegistryTables();
  const db = getDb("kokuzo");
  const sourceType = String(contract.sourceType || "manual").trim() || "manual";
  const uri = contract.uri != null ? String(contract.uri).trim() || null : null;
  const meta = contract.meta && typeof contract.meta === "object" ? contract.meta : {};
  const fp = buildSourceFingerprint(
    contract.fingerprintParts?.length
      ? contract.fingerprintParts
      : [sourceType, uri, JSON.stringify(meta)],
  );

  const existing = db
    .prepare(
      "SELECT id FROM source_registry WHERE fingerprint = ? AND status IN ('active','partial','pending') ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1",
    )
    .get(fp) as { id?: string } | undefined;

  if (existing?.id) {
    db.prepare(
      "UPDATE source_registry SET sourceType=?, source_type=?, uri=?, status=?, metaJson=?, updatedAt=datetime('now'), updated_at=datetime('now') WHERE id=?",
    ).run(
      sourceType,
      sourceType,
      uri,
      String(contract.status || "active").trim() || "active",
      JSON.stringify(meta),
      existing.id,
    );
    return { sourceId: String(existing.id), fingerprint: fp, duplicate: true };
  }

  const sourceId = randomUUID();
  db.prepare(
    "INSERT INTO source_registry(id,sourceType,source_type,uri,status,metaJson,createdAt,created_at,updatedAt,updated_at,fingerprint,originKind) VALUES(?,?,?,?,?,?,datetime('now'),datetime('now'),datetime('now'),datetime('now'),?,?)",
  ).run(
    sourceId,
    sourceType,
    sourceType,
    uri,
    String(contract.status || "active").trim() || "active",
    JSON.stringify(meta),
    fp,
    sourceType,
  );
  return { sourceId, fingerprint: fp, duplicate: false };
}

export function appendSourceAnalysisLog(contract: SourceAnalysisLogContract): string {
  ensureSourceRegistryTables();
  const db = getDb("kokuzo");
  const id = randomUUID();
  db.prepare(
    "INSERT INTO source_analysis_logs(id,projectId,sourceId,status,summary,createdAt,created_at,updatedAt,updated_at,analysisType,metaJson,fingerprint) VALUES(?,?,?,?,?,datetime('now'),datetime('now'),datetime('now'),datetime('now'),?,?,?)",
  ).run(
    id,
    contract.projectId ?? null,
    contract.sourceId,
    String(contract.status || "ok").trim() || "ok",
    contract.summary != null ? String(contract.summary) : null,
    String(contract.analysisType || "").trim() || null,
    JSON.stringify(contract.meta && typeof contract.meta === "object" ? contract.meta : {}),
    contract.fingerprint ?? null,
  );
  return id;
}

export function linkWritingSource(args: {
  projectId: string;
  sourceId: string;
  sourceType: string;
  doc?: string | null;
  pdfPage?: number | null;
  note?: string | null;
}): void {
  ensureSourceRegistryTables();
  const db = getDb("kokuzo");
  db.prepare(
    "INSERT INTO writing_sources(id,projectId,sourceId,sourceType,doc,pdfPage,note,createdAt,created_at) VALUES(?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
  ).run(
    randomUUID(),
    args.projectId,
    args.sourceId,
    args.sourceType,
    args.doc ?? null,
    args.pdfPage ?? null,
    args.note ?? null,
  );
}
