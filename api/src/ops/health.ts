import fs from "node:fs";
import type { DbKind } from "../db/index.js";
import { getDb, getDbPath } from "../db/index.js";
import { getPersonaState } from "../persona/personaState.js";
import type { ToolId } from "../tools/toolTypes.js";
import { snapshotMetrics } from "./metrics.js";
import { getSafeModeReason, isSafeMode } from "./safeMode.js";
import { initThreadDB } from "../db/threads.js";

export type HealthReport = {
  status: "ok" | "degraded";
  service: "tenmon-ark-api";
  timestamp: string;
  node: { version: string; uptimeSec: number };
  safeMode: { enabled: boolean; reason: string | null };
  db: Record<DbKind, { ok: boolean; path: string; sizeBytes: number | null; error?: string }>;
  memory: { sessionRows: number | null; conversationRows: number | null; kokuzoRows: number | null };
  persona: { ok: boolean; personaId: string; state?: unknown; error?: string };
  tools: { executable: boolean; allowlist: ToolId[] };
  metrics: ReturnType<typeof snapshotMetrics>;
  // STEP 3-2: Bing key / LLM key / DB が生きているか簡易チェック
  external: {
    bingSearch: { ok: boolean; error?: string };
    llm: { ok: boolean; error?: string };
    threadDb: { ok: boolean; error?: string };
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function dbStatus(kind: DbKind): { ok: boolean; path: string; sizeBytes: number | null; error?: string } {
  const p = getDbPath(kind);
  let sizeBytes: number | null = null;
  try {
    const st = fs.statSync(p);
    sizeBytes = st.size;
  } catch {
    sizeBytes = null;
  }

  try {
    const db = getDb(kind);
    db.prepare("SELECT 1").get();
    return { ok: true, path: p, sizeBytes };
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "db error";
    return { ok: false, path: p, sizeBytes, error: msg };
  }
}

/**
 * ヘルスチェック（async版、外部サービスチェック含む）
 */
export async function healthCheck(): Promise<HealthReport> {
  return getHealthReport();
}

export function getHealthReport(): HealthReport {
  const kokuzo = dbStatus("kokuzo");
  const audit = dbStatus("audit");
  const persona = dbStatus("persona");

  // Memory / Persona / Tool state (最低限の観測)
  let sessionRows: number | null = null;
  let conversationRows: number | null = null;
  let kokuzoRows: number | null = null;
  try {
    const db = getDb("kokuzo");
    sessionRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM session_memory").get() as any)?.cnt ?? 0);
    conversationRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM conversation_log").get() as any)?.cnt ?? 0);
    kokuzoRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM kokuzo_core").get() as any)?.cnt ?? 0);
  } catch {
    // keep nulls
  }

  const personaId = "tenmon";
  let personaOk = true;
  let personaState: unknown | undefined;
  let personaError: string | undefined;
  try {
    personaState = getPersonaState(personaId);
  } catch (e: any) {
    personaOk = false;
    personaError = e?.message ? String(e.message) : "persona error";
  }

  const allowlist: ToolId[] = ["filesystem.read", "http.fetch", "github.read", "calendar.read"];

  // STEP 3-2: 外部サービスチェック
  let bingOk = false;
  let bingError: string | undefined;
  try {
    const apiKey = process.env.BING_SEARCH_API_KEY;
    bingOk = !!apiKey && apiKey.trim().length > 0;
    if (!bingOk) {
      bingError = "BING_SEARCH_API_KEY not configured";
    }
  } catch (e: any) {
    bingError = e?.message || "unknown error";
  }

  let llmOk = false;
  let llmError: string | undefined;
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    llmOk = !!apiKey && apiKey.trim().length > 0;
    if (!llmOk) {
      llmError = "OPENAI_API_KEY not configured";
    }
  } catch (e: any) {
    llmError = e?.message || "unknown error";
  }

  let threadDbOk = false;
  let threadDbError: string | undefined;
  try {
    initThreadDB();
    threadDbOk = true;
  } catch (e: any) {
    threadDbOk = false;
    threadDbError = e?.message || "thread db error";
  }

  const ok = kokuzo.ok && audit.ok && persona.ok && bingOk && llmOk && threadDbOk;
  return {
    status: ok && !isSafeMode() ? "ok" : "degraded",
    service: "tenmon-ark-api",
    timestamp: nowIso(),
    node: { version: process.version, uptimeSec: process.uptime() },
    safeMode: { enabled: isSafeMode(), reason: getSafeModeReason() },
    db: { kokuzo, audit, persona },
    memory: { sessionRows, conversationRows, kokuzoRows },
    persona: personaOk ? { ok: true, personaId, state: personaState } : { ok: false, personaId, error: personaError },
    tools: { executable: !isSafeMode(), allowlist },
    metrics: snapshotMetrics(),
    external: {
      bingSearch: bingOk ? { ok: true } : { ok: false, error: bingError },
      llm: llmOk ? { ok: true } : { ok: false, error: llmError },
      threadDb: threadDbOk ? { ok: true } : { ok: false, error: threadDbError },
    },
  };
}


