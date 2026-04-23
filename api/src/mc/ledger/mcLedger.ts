/**
 * MC vNext append-only ledgers (CARD_MC_VNEXT_COLLECTOR_AND_LEDGER_V1).
 * Writes are fail-open and gated by TENMON_MC_VNEXT_LEDGER=1.
 */
import { createHash } from "node:crypto";
import { dbPrepare } from "../../db/index.js";

export function isMcLedgerWritesEnabled(): boolean {
  return String(process.env.TENMON_MC_VNEXT_LEDGER ?? "").trim() === "1";
}

export type McLedgerAppendResultV1 = {
  ok: boolean;
  kind: "route" | "llm" | "memory" | "quality" | "source_map";
  reason: string;
  requestId: string;
  threadId: string;
  turnIndex: number | null;
};

function buildLedgerResult(
  kind: McLedgerAppendResultV1["kind"],
  reason: string,
  row: { requestId?: string; threadId?: string; turnIndex?: number | null },
  ok: boolean,
): McLedgerAppendResultV1 {
  return {
    ok,
    kind,
    reason,
    requestId: String(row.requestId || "").slice(0, 64),
    threadId: String(row.threadId || "").slice(0, 256),
    turnIndex: row.turnIndex == null ? null : Number(row.turnIndex),
  };
}

function logLedgerSkip(kind: McLedgerAppendResultV1["kind"], reason: string, meta?: Record<string, unknown>): void {
  try {
    const payload = {
      requestId: String(meta?.requestId || "").slice(0, 64),
      threadId: String(meta?.threadId || "").slice(0, 128),
      kind,
      reason,
      ...meta,
    };
    console.warn(`[MC_LEDGER_SKIP] ${JSON.stringify(payload)}`);
  } catch {}
}

function nowIso(): string {
  return new Date().toISOString();
}

export function mcLedgerInputHashShort(userText: string, maxLen = 32): string {
  const t = String(userText || "");
  return createHash("sha256").update(t, "utf8").digest("hex").slice(0, maxLen);
}

function safeJsonSlice(obj: unknown, maxBytes: number): string {
  try {
    const s = JSON.stringify(obj);
    if (s.length <= maxBytes) return s;
    return s.slice(0, maxBytes) + "…";
  } catch {
    return "{}";
  }
}

function buildMcMemoryPayloadJson(row: {
  source: string;
  historyLen: number;
  exactCount: number;
  prefixCount: number;
  persistedSuccess: number | null;
  lookupSessionId?: string;
  persistedTurnCount?: number | null;
  limitRequested?: number | null;
  missReason?: string | null;
  historyPreview?: unknown;
}): string {
  const source = String(row.source || "").slice(0, 32);
  const historyLen = Number(row.historyLen) || 0;
  const payload = {
    event_kind: row.persistedSuccess == null ? "MEMORY_READ" : "MEMORY_PERSIST",
    source,
    length: historyLen,
    hit: !["none", "memory_error"].includes(source) && historyLen > 0,
    lookup_session_id: row.lookupSessionId ? String(row.lookupSessionId).slice(0, 256) : null,
    persisted_turn_count:
      row.persistedTurnCount == null ? null : Number(row.persistedTurnCount),
    history_len: historyLen,
    limit_requested: row.limitRequested == null ? null : Number(row.limitRequested),
    miss_reason: row.missReason == null ? null : String(row.missReason).slice(0, 64),
    exact_count: Number(row.exactCount),
    prefix_count: Number(row.prefixCount),
    persisted_success: row.persistedSuccess == null ? null : Number(row.persistedSuccess),
    history_preview: row.historyPreview ?? null,
  };
  return safeJsonSlice(payload, 4000);
}

export function tryAppendMcRouteLedgerV1(row: {
  requestId?: string;
  threadId: string;
  turnIndex: number;
  inputHash: string;
  routeReason: string;
  selectorIntent: string;
  sacredRouteFlag: boolean;
  fallbackRouteFlag: boolean;
}): McLedgerAppendResultV1 {
  if (!isMcLedgerWritesEnabled()) {
    logLedgerSkip("route", "flag_off", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      routeReason: String(row.routeReason || "").slice(0, 64),
    });
    return buildLedgerResult("route", "flag_off", row, false);
  }
  try {
    const stmt = dbPrepare(
      "kokuzo",
      `INSERT INTO mc_route_ledger (
        request_id, thread_id, turn_index, input_hash, route_reason, selector_intent,
        sacred_route_flag, fallback_route_flag, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      String(row.requestId || "").slice(0, 64),
      String(row.threadId || "").slice(0, 256),
      Number(row.turnIndex),
      String(row.inputHash || "").slice(0, 64),
      String(row.routeReason || "").slice(0, 256),
      String(row.selectorIntent || "").slice(0, 128),
      row.sacredRouteFlag ? 1 : 0,
      row.fallbackRouteFlag ? 1 : 0,
      nowIso(),
    );
    return buildLedgerResult("route", "written", row, true);
  } catch (e) {
    logLedgerSkip("route", "db_error", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      routeReason: String(row.routeReason || "").slice(0, 64),
      error: (e as Error)?.message || "unknown",
    });
    return buildLedgerResult("route", "db_error", row, false);
  }
}

export function tryAppendMcLlmExecutionLedgerV1(row: {
  requestId?: string;
  threadId: string;
  turnIndex: number;
  provider: string;
  requestedModel: string;
  effectiveModel: string;
  maxTokensPlanned: number;
  timeoutMs: number;
  thinkingBudget: number | null;
  finishReason: string;
  outLen: number;
  retryProvider: string;
  retryOutLen: number;
}): McLedgerAppendResultV1 {
  if (!isMcLedgerWritesEnabled()) {
    logLedgerSkip("llm", "flag_off", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      requestedModel: String(row.requestedModel || "").slice(0, 64),
    });
    return buildLedgerResult("llm", "flag_off", row, false);
  }
  try {
    const stmt = dbPrepare(
      "kokuzo",
      `INSERT INTO mc_llm_execution_ledger (
        request_id, thread_id, turn_index, provider, requested_model, effective_model,
        max_tokens_planned, timeout_ms, thinking_budget, finish_reason, out_len,
        retry_provider, retry_out_len, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      String(row.requestId || "").slice(0, 64),
      String(row.threadId || "").slice(0, 256),
      Number(row.turnIndex),
      String(row.provider || "").slice(0, 32),
      String(row.requestedModel || "").slice(0, 256),
      String(row.effectiveModel || "").slice(0, 256),
      Number(row.maxTokensPlanned) || 0,
      Number(row.timeoutMs) || 0,
      row.thinkingBudget == null ? null : Number(row.thinkingBudget),
      String(row.finishReason || "").slice(0, 128),
      Number(row.outLen) || 0,
      String(row.retryProvider || "").slice(0, 32),
      Number(row.retryOutLen) || 0,
      nowIso(),
    );
    return buildLedgerResult("llm", "written", row, true);
  } catch (e) {
    logLedgerSkip("llm", "db_error", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      requestedModel: String(row.requestedModel || "").slice(0, 64),
      error: (e as Error)?.message || "unknown",
    });
    return buildLedgerResult("llm", "db_error", row, false);
  }
}

export function tryAppendMcMemoryLedgerV1(row: {
  requestId?: string;
  threadId: string;
  turnIndex: number;
  source: string;
  historyLen: number;
  historyPreview: unknown;
  exactCount: number;
  prefixCount: number;
  persistedSuccess: number | null;
  lookupSessionId?: string;
  persistedTurnCount?: number | null;
  limitRequested?: number | null;
  missReason?: string | null;
}): McLedgerAppendResultV1 {
  if (!isMcLedgerWritesEnabled()) {
    logLedgerSkip("memory", "flag_off", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      source: String(row.source || "").slice(0, 32),
      persistedSuccess: row.persistedSuccess,
    });
    return buildLedgerResult("memory", "flag_off", row, false);
  }
  try {
    const stmt = dbPrepare(
      "kokuzo",
      `INSERT INTO mc_memory_ledger (
        request_id, thread_id, turn_index, source, history_len, history_preview,
        exact_count, prefix_count, persisted_success, payload_json, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      String(row.requestId || "").slice(0, 64),
      String(row.threadId || "").slice(0, 256),
      Number(row.turnIndex),
      String(row.source || "").slice(0, 32),
      Number(row.historyLen),
      safeJsonSlice(row.historyPreview, 2000),
      Number(row.exactCount),
      Number(row.prefixCount),
      row.persistedSuccess == null ? null : Number(row.persistedSuccess),
      buildMcMemoryPayloadJson(row),
      nowIso(),
    );
    return buildLedgerResult("memory", "written", row, true);
  } catch (e) {
    logLedgerSkip("memory", "db_error", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      source: String(row.source || "").slice(0, 32),
      persistedSuccess: row.persistedSuccess,
      error: (e as Error)?.message || "unknown",
    });
    return buildLedgerResult("memory", "db_error", row, false);
  }
}

export function tryAppendMcDialogueQualityLedgerV1(row: {
  requestId?: string;
  threadId: string;
  turnIndex: number;
  finalText: string;
}): McLedgerAppendResultV1 {
  if (!isMcLedgerWritesEnabled()) {
    logLedgerSkip("quality", "flag_off", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      finalLen: String(row.finalText || "").length,
    });
    return buildLedgerResult("quality", "flag_off", row, false);
  }
  const text = String(row.finalText || "");
  try {
    const sentences = text.split(/[。…]/).filter((s) => s.trim().length > 0);
    const avgSentenceLen =
      sentences.length > 0 ? text.length / Math.max(1, sentences.length) : text.length;
    const headingCount = (text.match(/###|【[^】]+】/g) || []).length;
    const naturalEnd = /[。…]\s*$/.test(text.trim()) ? 1 : 0;
    const truncationSuspect =
      /…\s*$/.test(text) || /\.\.\.\s*$/.test(text) || (text.length > 400 && !naturalEnd) ? 1 : 0;
    const stmt = dbPrepare(
      "kokuzo",
      `INSERT INTO mc_dialogue_quality_ledger (
        request_id, thread_id, turn_index, final_len, final_tail, natural_end,
        heading_count, avg_sentence_len, truncation_suspect, ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      String(row.requestId || "").slice(0, 64),
      String(row.threadId || "").slice(0, 256),
      Number(row.turnIndex),
      text.length,
      text.slice(-160).replace(/\s+/g, " ").trim().slice(0, 160),
      naturalEnd,
      headingCount,
      avgSentenceLen,
      truncationSuspect,
      nowIso(),
    );
    return buildLedgerResult("quality", "written", row, true);
  } catch (e) {
    logLedgerSkip("quality", "db_error", {
      requestId: String(row.requestId || "").slice(0, 64),
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: Number(row.turnIndex),
      finalLen: text.length,
      error: (e as Error)?.message || "unknown",
    });
    return buildLedgerResult("quality", "db_error", row, false);
  }
}

/** Learning / reflection path: append-only source map row (no secrets). */
export function tryAppendMcSourceMapLedgerV1(row: {
  notionPageId?: string;
  githubRepo?: string;
  threadId?: string;
  turnIndex?: number | null;
  filePath: string;
  runtimeNode: string;
  role: string;
}): McLedgerAppendResultV1 {
  if (!isMcLedgerWritesEnabled()) {
    logLedgerSkip("source_map", "flag_off", {
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: row.turnIndex == null ? null : Number(row.turnIndex),
      filePath: String(row.filePath || "").slice(0, 96),
      role: String(row.role || "").slice(0, 32),
    });
    return buildLedgerResult("source_map", "flag_off", row, false);
  }
  try {
    const stmt = dbPrepare(
      "kokuzo",
      `INSERT INTO mc_source_map (
        notion_page_id, github_repo, thread_id, turn_index, file_path, runtime_node, role, last_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      String(row.notionPageId || "").slice(0, 64),
      String(row.githubRepo || "").slice(0, 128),
      String(row.threadId || "").slice(0, 256),
      row.turnIndex == null ? null : Number(row.turnIndex),
      String(row.filePath || "").slice(0, 512),
      String(row.runtimeNode || "").slice(0, 128),
      String(row.role || "").slice(0, 64),
      nowIso(),
    );
    return buildLedgerResult("source_map", "written", row, true);
  } catch (e) {
    logLedgerSkip("source_map", "db_error", {
      threadId: String(row.threadId || "").slice(0, 64),
      turnIndex: row.turnIndex == null ? null : Number(row.turnIndex),
      filePath: String(row.filePath || "").slice(0, 96),
      role: String(row.role || "").slice(0, 32),
      error: (e as Error)?.message || "unknown",
    });
    return buildLedgerResult("source_map", "db_error", row, false);
  }
}
