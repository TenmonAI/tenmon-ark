/**
 * CONVERSATION_DENSITY_LEDGER_RUNTIME_V1
 * CONVERSATION_DENSITY_LEDGER_V1 の指標を 1 応答ごとに 0/1 で記録（後から rate 集計可能）。
 * kokuzo_schema.sql no-touch — 実行時 CREATE TABLE IF NOT EXISTS のみ。
 */
import { getDb } from "../db/index.js";

export const CONVERSATION_DENSITY_LEDGER_RUNTIME_V1 = "CONVERSATION_DENSITY_LEDGER_RUNTIME_V1" as const;

export type ConversationDensityLedgerMetricsV1 = {
  v: typeof CONVERSATION_DENSITY_LEDGER_RUNTIME_V1;
  /** 当ターンが分子条件に当てはまるなら 1（集計時に rate の分子に加算） */
  source_stack_empty_rate: 0 | 1;
  laws_used_zero_rate: 0 | 1;
  evidence_ids_zero_rate: 0 | 1;
  center_key_null_rate: 0 | 1;
  density_contract_present_rate: 0 | 1;
  one_step_explicit_rate: 0 | 1;
  bridge_phrase_rate: 0 | 1;
  second_turn_thinning_rate: 0 | 1;
  thinning_threshold: number;
  response_len: number;
};

const __prevResponseLenByThread = new Map<string, number>();
let __tableEnsured = false;

function ensureTable(): void {
  if (__tableEnsured) return;
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_density_ledger_runtime_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      thread_id TEXT NOT NULL,
      route_reason TEXT,
      metrics_json TEXT NOT NULL
    );
  `);
  __tableEnsured = true;
}

/**
 * 送信直前 payload（decisionFrame.ku + response + threadId）から指標を算出。
 */
export function computeConversationDensityLedgerMetricsV1(payload: Record<string, unknown>): ConversationDensityLedgerMetricsV1 {
  const df = payload.decisionFrame as Record<string, unknown> | undefined;
  const ku = df && df.ku && typeof df.ku === "object" && !Array.isArray(df.ku) ? (df.ku as Record<string, unknown>) : null;
  const response = String(payload.response ?? "");
  const threadId = String(payload.threadId ?? "");
  const thinningThreshold = 0.55;

  let source_stack_empty_rate: 0 | 1 = 0;
  let laws_used_zero_rate: 0 | 1 = 0;
  let evidence_ids_zero_rate: 0 | 1 = 0;
  let center_key_null_rate: 0 | 1 = 0;
  let density_contract_present_rate: 0 | 1 = 0;
  let one_step_explicit_rate: 0 | 1 = 0;
  let bridge_phrase_rate: 0 | 1 = 0;
  let second_turn_thinning_rate: 0 | 1 = 0;

  if (ku) {
    const ss = ku.sourceStackSummary;
    if (!ss || typeof ss !== "object" || Array.isArray(ss)) {
      source_stack_empty_rate = 1;
    } else {
      const pm = String((ss as Record<string, unknown>).primaryMeaning ?? "").trim();
      const ra = String((ss as Record<string, unknown>).responseAxis ?? "").trim();
      if (pm === "" && ra === "") source_stack_empty_rate = 1;
    }

    const laws = ku.lawsUsed;
    if (!Array.isArray(laws) || laws.length === 0) laws_used_zero_rate = 1;

    const evi = ku.evidenceIds;
    if (!Array.isArray(evi) || evi.length === 0) evidence_ids_zero_rate = 1;

    const ck = String(ku.centerKey ?? "").trim();
    const tck = String(ku.threadCenterKey ?? "").trim();
    if (ck === "" && tck === "") center_key_null_rate = 1;

    const rp = ku.responsePlan;
    if (rp && typeof rp === "object" && !Array.isArray(rp)) {
      const dc = (rp as Record<string, unknown>).densityContract;
      if (dc != null && typeof dc === "object" && !Array.isArray(dc)) density_contract_present_rate = 1;
    }

    const af = String(ku.answerFrame ?? "").trim();
    const raf =
      rp && typeof rp === "object" && !Array.isArray(rp)
        ? String((rp as Record<string, unknown>).answerFrame ?? "").trim()
        : "";
    if (af === "one_step" || raf === "one_step" || /次の一手|次軸|次は/u.test(response)) {
      one_step_explicit_rate = 1;
    }

    if (
      /（[^）]{0,120}）を土台に、いまの話を見ていきましょう/u.test(response) ||
      /受け取っています/u.test(response)
    ) {
      bridge_phrase_rate = 1;
    }
  }

  const curLen = response.length;
  const prevLen = threadId ? __prevResponseLenByThread.get(threadId) ?? 0 : 0;
  if (prevLen > 40 && curLen < prevLen * thinningThreshold) {
    second_turn_thinning_rate = 1;
  }
  if (threadId) {
    __prevResponseLenByThread.set(threadId, curLen);
  }

  return {
    v: CONVERSATION_DENSITY_LEDGER_RUNTIME_V1,
    source_stack_empty_rate,
    laws_used_zero_rate,
    evidence_ids_zero_rate,
    center_key_null_rate,
    density_contract_present_rate,
    one_step_explicit_rate,
    bridge_phrase_rate,
    second_turn_thinning_rate,
    thinning_threshold: thinningThreshold,
    response_len: curLen,
  };
}

/**
 * 1 行 append。失敗時は log のみ（会話を落とさない）。
 */
export function appendConversationDensityLedgerRuntimeV1(payload: Record<string, unknown>): void {
  try {
    const df = payload.decisionFrame as Record<string, unknown> | undefined;
    const ku = df && df.ku && typeof df.ku === "object" && !Array.isArray(df.ku);
    if (!ku) return;

    ensureTable();
    const metrics = computeConversationDensityLedgerMetricsV1(payload);
    const threadId = String(payload.threadId ?? "");
    const routeReason = String((df!.ku as Record<string, unknown>).routeReason ?? "");

    const db = getDb("kokuzo");
    db.prepare(
      `INSERT INTO conversation_density_ledger_runtime_v1 (thread_id, route_reason, metrics_json) VALUES (?, ?, ?)`
    ).run(threadId || "(no-thread)", routeReason || null, JSON.stringify(metrics));
  } catch (e) {
    try {
      console.error("[conversation_density_ledger_runtime_v1] append failed:", (e as Error)?.message ?? e);
    } catch {
      /* ignore */
    }
  }
}
