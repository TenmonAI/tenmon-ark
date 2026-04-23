import { dbPrepare } from "../../db/index.js";

const since24h = "datetime('now', '-1 day')";

const MC_LEDGER_TABLES = new Set([
  "mc_route_ledger",
  "mc_llm_execution_ledger",
  "mc_memory_ledger",
  "mc_dialogue_quality_ledger",
]);

export function mcLedgerCountSince24h(table: string): number {
  if (!MC_LEDGER_TABLES.has(table)) return 0;
  try {
    const stmt = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS c FROM ${table} WHERE ts >= ${since24h}`,
    );
    const row = stmt.get() as { c: number };
    return Number(row?.c ?? 0);
  } catch {
    return 0;
  }
}

export function readMcThreadLedgersV1(threadId: string, limit = 80): {
  routes: Record<string, unknown>[];
  llm: Record<string, unknown>[];
  memory: Record<string, unknown>[];
  quality: Record<string, unknown>[];
  source_map: Record<string, unknown>[];
} {
  const tid = String(threadId || "").slice(0, 256);
  const lim = Math.min(500, Math.max(1, limit));
  try {
    const routes = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_route_ledger WHERE thread_id = ? ORDER BY id DESC LIMIT ?`,
    ).all(tid, lim) as Record<string, unknown>[];
    const llm = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_llm_execution_ledger WHERE thread_id = ? ORDER BY id DESC LIMIT ?`,
    ).all(tid, lim) as Record<string, unknown>[];
    const memory = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_memory_ledger WHERE thread_id = ? ORDER BY id DESC LIMIT ?`,
    ).all(tid, lim) as Record<string, unknown>[];
    const quality = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_dialogue_quality_ledger WHERE thread_id = ? ORDER BY id DESC LIMIT ?`,
    ).all(tid, lim) as Record<string, unknown>[];
    const source_map = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_source_map WHERE thread_id = ? ORDER BY COALESCE(turn_index, -1) DESC, last_seen DESC LIMIT ?`,
    ).all(tid, Math.min(80, lim)) as Record<string, unknown>[];
    return { routes, llm, memory, quality, source_map };
  } catch {
    return { routes: [], llm: [], memory: [], quality: [], source_map: [] };
  }
}

export function readMcRequestTraceV1(requestId: string): Record<string, unknown> {
  const rid = String(requestId || "").trim().slice(0, 64);
  if (!rid) {
    return {
      request_id: "",
      summary: { found: false, route_rows: 0, llm_rows: 0, memory_rows: 0, quality_rows: 0 },
      route: null,
      llm: null,
      memory: [],
      quality: null,
    };
  }
  try {
    const routeRows = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_route_ledger WHERE request_id = ? ORDER BY id DESC LIMIT 8`,
    ).all(rid) as Record<string, unknown>[];
    const llmRows = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_llm_execution_ledger WHERE request_id = ? ORDER BY id DESC LIMIT 8`,
    ).all(rid) as Record<string, unknown>[];
    const memoryRows = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_memory_ledger WHERE request_id = ? ORDER BY id DESC LIMIT 16`,
    ).all(rid) as Record<string, unknown>[];
    const qualityRows = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_dialogue_quality_ledger WHERE request_id = ? ORDER BY id DESC LIMIT 8`,
    ).all(rid) as Record<string, unknown>[];
    const route = [...routeRows].sort(sortByTurnThenTs).pop() ?? null;
    const llm = [...llmRows].sort(sortByTurnThenTs).pop() ?? null;
    const quality = [...qualityRows].sort(sortByTurnThenTs).pop() ?? null;
    const threadId = asStr(route?.thread_id || llm?.thread_id || quality?.thread_id || memoryRows[0]?.thread_id);
    return {
      request_id: rid,
      thread_id: threadId,
      summary: {
        found: routeRows.length + llmRows.length + memoryRows.length + qualityRows.length > 0,
        route_rows: routeRows.length,
        llm_rows: llmRows.length,
        memory_rows: memoryRows.length,
        quality_rows: qualityRows.length,
      },
      route,
      llm,
      memory: [...memoryRows].sort(sortByTurnThenTs),
      quality,
    };
  } catch {
    return {
      request_id: rid,
      summary: { found: false, route_rows: 0, llm_rows: 0, memory_rows: 0, quality_rows: 0 },
      route: null,
      llm: null,
      memory: [],
      quality: null,
    };
  }
}

type ThreadConversationRow = {
  session_id: string;
  turn_index: number;
  role: string;
  content: string;
  created_at: string;
};

function asNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function sortByTurnThenTs(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const ta = asNum(a.turn_index, -1);
  const tb = asNum(b.turn_index, -1);
  if (ta !== tb) return ta - tb;
  return asStr(a.ts || a.last_seen).localeCompare(asStr(b.ts || b.last_seen));
}

function readConversationThreadRowsV1(threadId: string, limit = 160): Record<string, unknown>[] {
  const tid = String(threadId || "").slice(0, 256);
  const lim = Math.min(500, Math.max(1, limit));
  try {
    return dbPrepare(
      "kokuzo",
      `SELECT session_id, turn_index, role, content, created_at
         FROM conversation_log
        WHERE session_id = ?
        ORDER BY turn_index ASC
        LIMIT ?`,
    ).all(tid, lim) as ThreadConversationRow[] as unknown as Record<string, unknown>[];
  } catch {
    return [];
  }
}

function latestByTurn(rows: Record<string, unknown>[], turnIndex: number): Record<string, unknown> | null {
  const hit = rows
    .filter((r) => asNum(r.turn_index, -1) === turnIndex)
    .sort(sortByTurnThenTs)
    .pop();
  return hit ?? null;
}

function readRecentThreadIdsV1(limit = 8): string[] {
  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT thread_id, MAX(ts) AS last_ts FROM (
         SELECT thread_id, ts FROM mc_route_ledger
         UNION ALL
         SELECT thread_id, ts FROM mc_llm_execution_ledger
         UNION ALL
         SELECT thread_id, ts FROM mc_memory_ledger
         UNION ALL
         SELECT thread_id, ts FROM mc_dialogue_quality_ledger
         UNION ALL
         SELECT session_id AS thread_id, created_at AS ts FROM conversation_log
       )
       WHERE thread_id <> ''
       GROUP BY thread_id
       ORDER BY last_ts DESC
       LIMIT ?`,
    ).all(Math.min(30, Math.max(1, limit))) as Array<{ thread_id: string }>;
    return rows.map((r) => String(r.thread_id || "")).filter(Boolean);
  } catch {
    return [];
  }
}

export function readLatestMcThreadIdV1(): string {
  return readRecentThreadIdsV1(1)[0] ?? "";
}

/** 直近この時間以内の last_ts を「live failure」とみなす（CARD-MC-14）。 */
export const MC_PROBLEM_LIVE_WITHIN_HOURS = 6;

/**
 * problematic threads を「今まだ熱い失敗」と「同一 24h 窓内の古い失敗」に分割する。
 * last_ts は SQLite の datetime / ISO 文字列を想定。
 */
export function partitionProblematicThreadsLiveArchive(
  threads: McProblematicThreadV1[],
  liveWithinHours = MC_PROBLEM_LIVE_WITHIN_HOURS,
): { live: McProblematicThreadV1[]; archived: McProblematicThreadV1[] } {
  const cutoffMs = Date.now() - liveWithinHours * 3600 * 1000;
  const live: McProblematicThreadV1[] = [];
  const archived: McProblematicThreadV1[] = [];
  for (const t of threads) {
    const raw = String(t.last_ts || "").replace(" ", "T");
    const tsMs = Date.parse(raw);
    if (Number.isFinite(tsMs) && tsMs >= cutoffMs) live.push(t);
    else archived.push(t);
  }
  const cmp = (a: McProblematicThreadV1, b: McProblematicThreadV1) =>
    String(b.last_ts).localeCompare(String(a.last_ts));
  live.sort(cmp);
  archived.sort(cmp);
  return { live, archived };
}

/** mc_memory_ledger 上の memory / conversation_log のヒット率（live=24h, all_time=全期間）。 */
export type McMemoryHitSplitV1 = {
  window_hours_live: 24;
  memory_hit_live: number | null;
  memory_total_live: number;
  conversation_log_hit_live: number | null;
  conversation_log_total_live: number;
  combined_hit_live: number | null;
  combined_total_live: number;
  memory_hit_all_time: number | null;
  memory_total_all_time: number;
  conversation_log_hit_all_time: number | null;
  conversation_log_total_all_time: number;
  combined_hit_all_time: number | null;
  combined_total_all_time: number;
};

function memHitRowFromDb(row: Record<string, unknown> | undefined): {
  mem_hit: number;
  mem_tot: number;
  cl_hit: number;
  cl_tot: number;
  comb_hit: number;
  comb_tot: number;
} {
  return {
    mem_hit: Number(row?.mem_hit ?? 0),
    mem_tot: Number(row?.mem_tot ?? 0),
    cl_hit: Number(row?.cl_hit ?? 0),
    cl_tot: Number(row?.cl_tot ?? 0),
    comb_hit: Number(row?.comb_hit ?? 0),
    comb_tot: Number(row?.comb_tot ?? 0),
  };
}

/**
 * CARD-MC-09C-MEMORY-HIT-METRIC-CORRECTNESS-V1:
 *   既存 memory_hit_rate（全 MEMORY_READ を母集団とする）は、Turn 0 の
 *   「履歴が無いのが正常」なケースで hit=false が大量に混ざり、
 *   実際の継承品質を 13% のような低値に押し下げていた。
 *   新指標:
 *     - continuation_memory_hit: turn_index >= 1 に限定した真の継承品質
 *     - turn0_never_persisted_rate: Turn 0 の正常性（初回リードが
 *       miss_reason='never_persisted' であるべき）
 */
export type McMemoryHitContinuationSplitV1 = {
  window_hours_live: 24;
  continuation_memory_hit_live: number | null;
  continuation_memory_hit_all_time: number | null;
  continuation_sample_count_live: number;
  continuation_sample_count_all_time: number;
  turn0_never_persisted_rate_live: number | null;
  turn0_sample_count_live: number;
  turn0_never_persisted_rate_all_time: number | null;
  turn0_sample_count_all_time: number;
};

const EMPTY_CONTINUATION_SPLIT: McMemoryHitContinuationSplitV1 = {
  window_hours_live: 24,
  continuation_memory_hit_live: null,
  continuation_memory_hit_all_time: null,
  continuation_sample_count_live: 0,
  continuation_sample_count_all_time: 0,
  turn0_never_persisted_rate_live: null,
  turn0_sample_count_live: 0,
  turn0_never_persisted_rate_all_time: null,
  turn0_sample_count_all_time: 0,
};

export function readMcMemoryHitContinuationSplitV1(): McMemoryHitContinuationSplitV1 {
  // MEMORY_READ 行のみ（persisted_success IS NULL）を対象にする。
  // hit は mcLedger.ts の payload 生成と同じ判定:
  //   source IN ('memory','conversation_log') AND history_len > 0
  const contSel = `SELECT
      SUM(CASE WHEN source IN ('memory','conversation_log') AND history_len > 0 THEN 1 ELSE 0 END) AS hit,
      COUNT(1) AS total
    FROM mc_memory_ledger
    WHERE persisted_success IS NULL AND turn_index >= 1`;
  const turn0Sel = `SELECT
      SUM(CASE WHEN json_extract(payload_json, '$.miss_reason') = 'never_persisted' THEN 1 ELSE 0 END) AS np,
      COUNT(1) AS total
    FROM mc_memory_ledger
    WHERE persisted_success IS NULL AND turn_index = 0`;
  try {
    const contLive = dbPrepare(
      "kokuzo",
      `${contSel} AND ts >= ${since24h}`,
    ).get() as { hit: number | null; total: number | null };
    const contAll = dbPrepare("kokuzo", contSel).get() as {
      hit: number | null;
      total: number | null;
    };
    const turn0Live = dbPrepare(
      "kokuzo",
      `${turn0Sel} AND ts >= ${since24h}`,
    ).get() as { np: number | null; total: number | null };
    const turn0All = dbPrepare("kokuzo", turn0Sel).get() as {
      np: number | null;
      total: number | null;
    };
    const cl = { hit: Number(contLive?.hit ?? 0), total: Number(contLive?.total ?? 0) };
    const ca = { hit: Number(contAll?.hit ?? 0), total: Number(contAll?.total ?? 0) };
    const t0l = { np: Number(turn0Live?.np ?? 0), total: Number(turn0Live?.total ?? 0) };
    const t0a = { np: Number(turn0All?.np ?? 0), total: Number(turn0All?.total ?? 0) };
    return {
      window_hours_live: 24,
      continuation_memory_hit_live: cl.total > 0 ? cl.hit / cl.total : null,
      continuation_memory_hit_all_time: ca.total > 0 ? ca.hit / ca.total : null,
      continuation_sample_count_live: cl.total,
      continuation_sample_count_all_time: ca.total,
      turn0_never_persisted_rate_live: t0l.total > 0 ? t0l.np / t0l.total : null,
      turn0_sample_count_live: t0l.total,
      turn0_never_persisted_rate_all_time: t0a.total > 0 ? t0a.np / t0a.total : null,
      turn0_sample_count_all_time: t0a.total,
    };
  } catch {
    return { ...EMPTY_CONTINUATION_SPLIT };
  }
}

export function readMcMemoryHitSplitV1(): McMemoryHitSplitV1 {
  const empty: McMemoryHitSplitV1 = {
    window_hours_live: 24,
    memory_hit_live: null,
    memory_total_live: 0,
    conversation_log_hit_live: null,
    conversation_log_total_live: 0,
    combined_hit_live: null,
    combined_total_live: 0,
    memory_hit_all_time: null,
    memory_total_all_time: 0,
    conversation_log_hit_all_time: null,
    conversation_log_total_all_time: 0,
    combined_hit_all_time: null,
    combined_total_all_time: 0,
  };
  const sel = `SELECT
      SUM(CASE WHEN source = 'memory' AND history_len > 0 THEN 1 ELSE 0 END) AS mem_hit,
      SUM(CASE WHEN source = 'memory' THEN 1 ELSE 0 END) AS mem_tot,
      SUM(CASE WHEN source = 'conversation_log' AND history_len > 0 THEN 1 ELSE 0 END) AS cl_hit,
      SUM(CASE WHEN source = 'conversation_log' THEN 1 ELSE 0 END) AS cl_tot,
      SUM(CASE WHEN source IN ('memory','conversation_log') AND history_len > 0 THEN 1 ELSE 0 END) AS comb_hit,
      COUNT(*) AS comb_tot`;
  try {
    const liveRow = dbPrepare(
      "kokuzo",
      `${sel} FROM mc_memory_ledger WHERE ts >= ${since24h}`,
    ).get() as Record<string, unknown>;
    const L = memHitRowFromDb(liveRow);
    const allRow = dbPrepare("kokuzo", `${sel} FROM mc_memory_ledger`).get() as Record<string, unknown>;
    const A = memHitRowFromDb(allRow);
    return {
      window_hours_live: 24,
      memory_hit_live: L.mem_tot > 0 ? L.mem_hit / L.mem_tot : null,
      memory_total_live: L.mem_tot,
      conversation_log_hit_live: L.cl_tot > 0 ? L.cl_hit / L.cl_tot : null,
      conversation_log_total_live: L.cl_tot,
      combined_hit_live: L.comb_tot > 0 ? L.comb_hit / L.comb_tot : null,
      combined_total_live: L.comb_tot,
      memory_hit_all_time: A.mem_tot > 0 ? A.mem_hit / A.mem_tot : null,
      memory_total_all_time: A.mem_tot,
      conversation_log_hit_all_time: A.cl_tot > 0 ? A.cl_hit / A.cl_tot : null,
      conversation_log_total_all_time: A.cl_tot,
      combined_hit_all_time: A.comb_tot > 0 ? A.comb_hit / A.comb_tot : null,
      combined_total_all_time: A.comb_tot,
    };
  } catch {
    return empty;
  }
}

/**
 * CARD-MC-08B — cluster ledger rows into turn-level steps even when
 * `turn_index` is missing or has collapsed to 0 for legacy data.
 *
 * Grouping priority:
 *   1) rows sharing the same non-empty `request_id`  → one step
 *   2) otherwise: zip `routes / llm / memoryReads / quality` by time order
 *      (each cycle = one turn). Memory persist rows attach to the nearest step.
 */
type McStepV1 = {
  step_index: number;
  turn_index: number;
  request_id: string;
  ts: string;
  route: Record<string, unknown> | null;
  llm: Record<string, unknown> | null;
  memory_read: Record<string, unknown> | null;
  persists: Record<string, unknown>[];
  quality: Record<string, unknown> | null;
};

function tsMs(v: unknown): number {
  const s = asStr(v);
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function buildStepsV1(
  routes: Record<string, unknown>[],
  llm: Record<string, unknown>[],
  memory: Record<string, unknown>[],
  quality: Record<string, unknown>[],
): McStepV1[] {
  const byTs = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    tsMs(a.ts) - tsMs(b.ts);

  const routesAsc = [...routes].sort(byTs);
  const llmAsc = [...llm].sort(byTs);
  const memReadsAsc = memory.filter((m) => asNum(m.persisted_success, -1) !== 1).sort(byTs);
  const memPersistsAsc = memory.filter((m) => asNum(m.persisted_success, -1) === 1).sort(byTs);
  const qualityAsc = [...quality].sort(byTs);

  // ---- Phase A: request_id based clustering ----
  const byReq = new Map<string, McStepV1>();
  const pushByReq = (
    row: Record<string, unknown>,
    field: keyof Pick<McStepV1, "route" | "llm" | "memory_read" | "quality">,
  ) => {
    const rid = asStr(row.request_id);
    if (!rid) return false;
    const existing = byReq.get(rid);
    if (existing) {
      if (existing[field] == null) (existing as any)[field] = row;
      existing.ts = existing.ts || asStr(row.ts);
      if (!existing.turn_index || existing.turn_index < 0) existing.turn_index = asNum(row.turn_index, -1);
    } else {
      byReq.set(rid, {
        step_index: -1,
        turn_index: asNum(row.turn_index, -1),
        request_id: rid,
        ts: asStr(row.ts),
        route: field === "route" ? row : null,
        llm: field === "llm" ? row : null,
        memory_read: field === "memory_read" ? row : null,
        persists: [],
        quality: field === "quality" ? row : null,
      });
    }
    return true;
  };
  const leftoverRoutes: Record<string, unknown>[] = [];
  const leftoverLlm: Record<string, unknown>[] = [];
  const leftoverMemReads: Record<string, unknown>[] = [];
  const leftoverQuality: Record<string, unknown>[] = [];
  for (const r of routesAsc) if (!pushByReq(r, "route")) leftoverRoutes.push(r);
  for (const r of llmAsc) if (!pushByReq(r, "llm")) leftoverLlm.push(r);
  for (const r of memReadsAsc) if (!pushByReq(r, "memory_read")) leftoverMemReads.push(r);
  for (const r of qualityAsc) if (!pushByReq(r, "quality")) leftoverQuality.push(r);

  // ---- Phase B: zip leftovers by index (timestamp order) ----
  const n = Math.max(leftoverRoutes.length, leftoverLlm.length, leftoverMemReads.length, leftoverQuality.length);
  const zipped: McStepV1[] = [];
  for (let i = 0; i < n; i++) {
    const r = leftoverRoutes[i] ?? null;
    const l = leftoverLlm[i] ?? null;
    const mr = leftoverMemReads[i] ?? null;
    const q = leftoverQuality[i] ?? null;
    zipped.push({
      step_index: -1,
      turn_index: asNum(r?.turn_index ?? l?.turn_index ?? mr?.turn_index ?? q?.turn_index, -1),
      request_id: asStr(r?.request_id || l?.request_id || mr?.request_id || q?.request_id),
      ts: asStr(r?.ts || l?.ts || mr?.ts || q?.ts),
      route: r,
      llm: l,
      memory_read: mr,
      persists: [],
      quality: q,
    });
  }

  const allSteps = [...byReq.values(), ...zipped].sort((a, b) => tsMs(a.ts) - tsMs(b.ts));
  allSteps.forEach((s, i) => {
    s.step_index = i;
  });

  // Attach persist rows to the nearest step by timestamp (or same turn_index).
  for (const p of memPersistsAsc) {
    const pTs = tsMs(p.ts);
    const pTurn = asNum(p.turn_index, -1);
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < allSteps.length; i++) {
      const s = allSteps[i];
      if (pTurn >= 0 && s.turn_index >= 0 && (s.turn_index === pTurn || s.turn_index === pTurn - 1)) {
        bestIdx = i;
        break;
      }
      const d = Math.abs(tsMs(s.ts) - pTs);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) allSteps[bestIdx].persists.push(p);
    else if (allSteps.length > 0) allSteps[allSteps.length - 1].persists.push(p);
  }

  return allSteps;
}

export function readMcThreadTraceV1(threadId: string, limit = 120): Record<string, unknown> {
  const tid = String(threadId || "").trim().slice(0, 256);
  const ledgers = readMcThreadLedgersV1(tid, limit);
  const conversation = readConversationThreadRowsV1(tid, limit * 2);
  const routes = [...ledgers.routes].sort(sortByTurnThenTs);
  const llm = [...ledgers.llm].sort(sortByTurnThenTs);
  const memory = [...ledgers.memory].sort(sortByTurnThenTs);
  const quality = [...ledgers.quality].sort(sortByTurnThenTs);
  const sourceMap = [...ledgers.source_map].sort(sortByTurnThenTs);

  const userRows = conversation.filter((r) => asStr(r.role) === "user");
  const assistantRows = conversation.filter((r) => asStr(r.role) === "assistant");

  const steps = buildStepsV1(routes, llm, memory, quality);

  // Detect the legacy pattern where all ledger rows collapsed to turn_index=0
  // (pre-MC-06 data). In that case we rely on step_index for display and
  // conversation_log pairing instead of the DB turn_index.
  const distinctTurnIndexes = new Set(steps.map((s) => s.turn_index).filter((t) => t >= 0));
  const useStepFallback = steps.length > 1 && distinctTurnIndexes.size <= 1;

  // Map conversation_log turns to ledger steps. Prefer exact turn_index match,
  // otherwise zip by step index (works for legacy data where ledger turn_index
  // stayed at 0 but conversation_log rows are ordered normally).
  const userByTurn = new Map<number, Record<string, unknown>>();
  for (const u of userRows) userByTurn.set(asNum(u.turn_index, -1), u);
  const assistantByTurn = new Map<number, Record<string, unknown>>();
  for (const a of assistantRows) assistantByTurn.set(asNum(a.turn_index, -1), a);

  const turns = steps.map((step) => {
      const routeRow = step.route;
      const llmRow = step.llm;
      const memoryReadRow = step.memory_read;
      const qualityRow = step.quality;
      const turnIndex =
        useStepFallback || step.turn_index < 0
          ? step.step_index * 2
          : step.turn_index;
      const expectedUserTurn = turnIndex;
      const expectedAssistantTurn = turnIndex + 1;
      const inputRow =
        userByTurn.get(expectedUserTurn) ??
        userRows[step.step_index] ??
        null;
      const assistantRow =
        assistantByTurn.get(expectedAssistantTurn) ??
        assistantRows[step.step_index] ??
        null;
      const persistenceRows = step.persists;
      const sourceRows = sourceMap.filter((r) => {
        const t = r.turn_index;
        const stepTurn = step.turn_index;
        if (t == null) return true;
        const tn = asNum(t, -1);
        return stepTurn >= 0 ? tn === stepTurn : true;
      });
      const learningRows = sourceRows.filter((r) => asStr(r.role) === "learning");
      // Continuation is true when either the router flagged follow_up OR the
      // memory read actually pulled prior context (history_len > 0 from a
      // non-none source). This way legacy data without the new selector_intent
      // stamping still surfaces as continuation when the causal signal exists.
      const memorySource = asStr(memoryReadRow?.source);
      const memoryHistoryLen =
        memoryReadRow == null ? 0 : asNum(memoryReadRow.history_len, 0);
      const memoryHit =
        memoryReadRow != null && !["none", "memory_error"].includes(memorySource);
      const selectorFollowUp = asStr(routeRow?.selector_intent) === "follow_up";
      const continuationRequested = selectorFollowUp || (memoryHit && memoryHistoryLen > 0);
      const continuationSuccess = continuationRequested ? memoryHit : null;

      const events = [
        {
          node: "input",
          label: "Input",
          ts: asStr(inputRow?.created_at || routeRow?.ts),
          status: inputRow ? "success" : "missing",
          success: Boolean(inputRow),
          latency_ms: null,
          reason: inputRow ? "conversation_log user row captured" : "conversation_log user row missing",
          input_preview: asStr(inputRow?.content).slice(0, 140),
          input_len: asStr(inputRow?.content).length || null,
        },
        {
          node: "route_decision",
          label: "Route decision",
          ts: asStr(routeRow?.ts),
          status: routeRow ? "success" : "missing",
          success: Boolean(routeRow),
          latency_ms: null,
          reason: asStr(routeRow?.route_reason),
          selector_intent: asStr(routeRow?.selector_intent),
          sacred_route_flag: Boolean(routeRow?.sacred_route_flag),
          fallback_route_flag: Boolean(routeRow?.fallback_route_flag),
        },
        {
          node: "memory_read",
          label: "Memory read",
          ts: asStr(memoryReadRow?.ts),
          status:
            memoryReadRow == null
              ? "missing"
              : ["none", "memory_error"].includes(asStr(memoryReadRow.source))
                ? "fail"
                : "success",
          success:
            memoryReadRow != null &&
            !["none", "memory_error"].includes(asStr(memoryReadRow.source)),
          latency_ms: null,
          reason: asStr(memoryReadRow?.source),
          source: asStr(memoryReadRow?.source),
          history_len: memoryReadRow == null ? null : asNum(memoryReadRow.history_len, 0),
          exact_count: memoryReadRow == null ? null : asNum(memoryReadRow.exact_count, -1),
          prefix_count: memoryReadRow == null ? null : asNum(memoryReadRow.prefix_count, -1),
          continuation_requested: continuationRequested,
          continuation_success: continuationSuccess,
          history_preview: asStr(memoryReadRow?.history_preview),
        },
        {
          node: "llm_call",
          label: "LLM call",
          ts: asStr(llmRow?.ts),
          status: llmRow == null ? "missing" : asNum(llmRow.out_len, 0) > 0 ? "success" : "fail",
          success: llmRow != null && asNum(llmRow.out_len, 0) > 0,
          latency_ms: null,
          reason: asStr(llmRow?.finish_reason),
          provider: asStr(llmRow?.provider),
          requested_model: asStr(llmRow?.requested_model),
          effective_model: asStr(llmRow?.effective_model),
          finish_reason: asStr(llmRow?.finish_reason),
          out_len: llmRow == null ? null : asNum(llmRow.out_len, 0),
          retry_provider: asStr(llmRow?.retry_provider),
          retry_out_len: llmRow == null ? null : asNum(llmRow.retry_out_len, 0),
          timeout_ms: llmRow == null ? null : asNum(llmRow.timeout_ms, 0),
          max_tokens_planned: llmRow == null ? null : asNum(llmRow.max_tokens_planned, 0),
        },
        {
          node: "finalize",
          label: "Finalize",
          ts: asStr(qualityRow?.ts || assistantRow?.created_at),
          status: qualityRow || assistantRow ? "success" : "missing",
          success: Boolean(qualityRow || assistantRow),
          latency_ms: null,
          reason: qualityRow ? "quality ledger captured final output" : assistantRow ? "assistant persisted without quality row" : "",
          final_len: qualityRow == null ? (assistantRow ? asStr(assistantRow.content).length : null) : asNum(qualityRow.final_len, 0),
          natural_end: qualityRow == null ? null : Boolean(qualityRow.natural_end),
          truncation_suspect: qualityRow == null ? null : Boolean(qualityRow.truncation_suspect),
          heading_count: qualityRow == null ? null : asNum(qualityRow.heading_count, 0),
          avg_sentence_len: qualityRow == null ? null : asNum(qualityRow.avg_sentence_len, 0),
          final_preview: asStr(assistantRow?.content || qualityRow?.final_tail).slice(-160),
        },
        {
          node: "persistence",
          label: "Persistence",
          ts: asStr(persistenceRows[0]?.ts || assistantRow?.created_at),
          status: persistenceRows.length > 0 ? "success" : "fail",
          success: persistenceRows.length > 0,
          latency_ms: null,
          reason: persistenceRows.length > 0 ? "memoryPersistMessage persisted conversation rows" : "no persisted_success=1 row",
          persisted_rows: persistenceRows.length,
          assistant_persisted: persistenceRows.some((r) => asNum(r.turn_index, -1) === turnIndex + 1),
        },
        {
          node: "learning_return",
          label: "Learning return",
          ts: asStr(learningRows[0]?.last_seen || sourceRows[0]?.last_seen),
          status: learningRows.length > 0 ? "success" : sourceRows.length > 0 ? "partial" : "missing",
          success: learningRows.length > 0,
          latency_ms: null,
          reason:
            learningRows.length > 0
              ? "conversation distill / source map updated"
              : sourceRows.length > 0
                ? "source map present but learning row missing"
                : "no source map row for this turn",
          source_count: sourceRows.length,
          learning_count: learningRows.length,
          source_paths: sourceRows.map((r) => asStr(r.file_path)).filter(Boolean),
        },
      ];

      return {
        step_index: step.step_index,
        turn_index: turnIndex,
        request_id: step.request_id,
        ts: step.ts,
        input: inputRow,
        assistant: assistantRow,
        route: routeRow,
        memory_read: memoryReadRow,
        llm: llmRow,
        finalize: qualityRow,
        persistence: persistenceRows,
        learning_return: learningRows,
        source_map: sourceRows,
        userInput: asStr(inputRow?.content || routeRow?.input_hash || ""),
        routeReason: asStr(routeRow?.route_reason),
        requestedModel: asStr(llmRow?.requested_model),
        effectiveModel: asStr(llmRow?.effective_model),
        finishReason: asStr(llmRow?.finish_reason),
        finalizeVerdict:
          qualityRow
            ? Boolean(qualityRow.truncation_suspect)
              ? "truncation_suspect"
              : Boolean(qualityRow.natural_end)
                ? "natural_end"
                : "finalized"
            : assistantRow
              ? "assistant_only"
              : "missing",
        persistVerdict: persistenceRows.length > 0 ? "persisted" : "missing",
        memoryVerdict: (() => {
          if (memoryReadRow == null) return "missing";
          const src = asStr(memoryReadRow.source);
          if (["none", "memory_error"].includes(src)) return "fallback_" + src;
          return "hit_" + src;
        })(),
        continuation: {
          requested: continuationRequested,
          success: continuationSuccess,
          source: asStr(memoryReadRow?.source),
          historySource: asStr(memoryReadRow?.source),
          historyLen: memoryReadRow == null ? null : asNum(memoryReadRow.history_len, 0),
        },
        events,
      };
    });

  const event_stream = turns.flatMap((t) =>
    ((t.events as Record<string, unknown>[]) || []).map((e) => ({
      step_index: t.step_index,
      turn_index: t.turn_index,
      ...e,
    })),
  );

  // ---- per-request grouping (CARD-MC-08B item 3) ----
  const requestMap = new Map<string, {
    request_id: string;
    ts: string;
    turn_index: number;
    step_index: number;
    route_reason: string;
    requested_model: string;
    effective_model: string;
    finish_reason: string;
    memory_verdict: string;
    persist_verdict: string;
    continuation_requested: boolean;
    continuation_success: boolean | null;
    history_len: number | null;
  }>();
  for (const t of turns) {
    const rid = String((t as any).request_id || "");
    if (!rid) continue;
    if (requestMap.has(rid)) continue;
    const cont = (t as any).continuation as Record<string, unknown> | undefined;
    requestMap.set(rid, {
      request_id: rid,
      ts: String((t as any).ts || ""),
      turn_index: Number((t as any).turn_index ?? -1),
      step_index: Number((t as any).step_index ?? -1),
      route_reason: String((t as any).routeReason || ""),
      requested_model: String((t as any).requestedModel || ""),
      effective_model: String((t as any).effectiveModel || ""),
      finish_reason: String((t as any).finishReason || ""),
      memory_verdict: String((t as any).memoryVerdict || ""),
      persist_verdict: String((t as any).persistVerdict || ""),
      continuation_requested: Boolean(cont?.requested),
      continuation_success: (cont?.success ?? null) as boolean | null,
      history_len: (cont?.historyLen ?? null) as number | null,
    });
  }
  const requests = [...requestMap.values()].sort((a, b) => tsMs(a.ts) - tsMs(b.ts));

  const continuation_turn_count = turns.filter((t) =>
    Boolean((t.continuation as Record<string, unknown>)?.requested),
  ).length;

  return {
    thread_id: tid,
    summary: {
      turn_count: turns.length,
      event_count: event_stream.length,
      conversation_rows: conversation.length,
      route_rows: routes.length,
      llm_rows: llm.length,
      memory_rows: memory.length,
      quality_rows: quality.length,
      source_rows: sourceMap.length,
      continuation_turns: continuation_turn_count,
      request_count: requests.length,
    },
    request_ids: [
      ...new Set(
        [...routes, ...llm, ...memory, ...quality]
          .map((row) => asStr(row.request_id))
          .filter(Boolean),
      ),
    ].slice(-40),
    requests,
    conversation,
    ledgers,
    turns,
    event_stream,
  };
}

export function readMcCircuitMapV1(threadId?: string): Record<string, unknown> {
  const refThreadId = String(threadId || "").trim() || readLatestMcThreadIdV1();
  const trace = refThreadId ? readMcThreadTraceV1(refThreadId, 120) : { turns: [] };
  const turns = Array.isArray(trace.turns) ? (trace.turns as Record<string, unknown>[]) : [];
  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const nodes = Array.isArray(latestTurn?.events) ? (latestTurn?.events as Record<string, unknown>[]) : [];
  return {
    reference_thread_id: refThreadId,
    reference_turn_index: latestTurn?.turn_index ?? null,
    recent_threads: readRecentThreadIdsV1(8),
    continuation:
      latestTurn?.continuation ??
      {
        requested: false,
        success: null,
        source: "",
      },
    nodes,
    trace_summary: trace.summary ?? {
      turn_count: 0,
      event_count: 0,
    },
  };
}

export function readMcQualityRecentV1(limit = 50): Record<string, unknown>[] {
  try {
    return dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_dialogue_quality_ledger ORDER BY id DESC LIMIT ?`,
    ).all(Math.min(200, limit)) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

/**
 * CARD-MC-09: problematic threads aggregator
 * Returns recent threads that show one of:
 *   - truncation_suspect (mc_dialogue_quality_ledger.truncation_suspect=1)
 *   - continuation_failure (route.selector_intent=follow_up AND
 *     matching llm row is empty/absent)
 *   - persist_failure (chat turn with no persisted_success=1 in
 *     mc_memory_ledger in the same request/turn)
 *   - memory_fallback_none (mc_memory_ledger.source IN ('none','memory_error'))
 * Dedup by thread_id, keep the most recent reason per thread, window=24h.
 */
export type McProblematicThreadV1 = {
  thread_id: string;
  turn_index: number | null;
  request_id: string;
  reason: "truncation_suspect" | "continuation_failure" | "persist_failure" | "memory_fallback_none";
  detail: string;
  last_ts: string;
  final_len: number | null;
  route_reason: string;
};

export function readMcProblematicThreadsV1(limit = 20): McProblematicThreadV1[] {
  const lim = Math.min(50, Math.max(1, limit));
  const out: Map<string, McProblematicThreadV1> = new Map();

  const push = (item: McProblematicThreadV1) => {
    if (!item.thread_id) return;
    const key = `${item.thread_id}#${item.reason}`;
    const existing = out.get(key);
    if (!existing || String(existing.last_ts) < String(item.last_ts)) {
      out.set(key, item);
    }
  };

  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT q.thread_id, q.turn_index, q.request_id, q.ts, q.final_len,
              (SELECT r.route_reason FROM mc_route_ledger r
                 WHERE r.thread_id = q.thread_id AND r.turn_index = q.turn_index
                 ORDER BY r.id DESC LIMIT 1) AS route_reason
         FROM mc_dialogue_quality_ledger q
        WHERE q.ts >= ${since24h} AND q.truncation_suspect = 1
        ORDER BY q.id DESC
        LIMIT ?`,
    ).all(lim) as Array<Record<string, unknown>>;
    for (const r of rows) {
      push({
        thread_id: asStr(r.thread_id),
        turn_index: typeof r.turn_index === "number" ? r.turn_index : null,
        request_id: asStr(r.request_id),
        reason: "truncation_suspect",
        detail: `final_len=${asNum(r.final_len, 0)} で自然終端せず（切断疑い）`,
        last_ts: asStr(r.ts),
        final_len: asNum(r.final_len, 0),
        route_reason: asStr(r.route_reason),
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT m.thread_id, m.turn_index, m.request_id, m.ts, m.source, m.history_len,
              (SELECT r.route_reason FROM mc_route_ledger r
                 WHERE r.thread_id = m.thread_id AND r.turn_index = m.turn_index
                 ORDER BY r.id DESC LIMIT 1) AS route_reason
         FROM mc_memory_ledger m
        WHERE m.ts >= ${since24h}
          AND m.source IN ('none','memory_error')
          AND m.history_len = 0
        ORDER BY m.id DESC
        LIMIT ?`,
    ).all(lim) as Array<Record<string, unknown>>;
    for (const r of rows) {
      push({
        thread_id: asStr(r.thread_id),
        turn_index: typeof r.turn_index === "number" ? r.turn_index : null,
        request_id: asStr(r.request_id),
        reason: "memory_fallback_none",
        detail: `memory source=${asStr(r.source) || "none"} で履歴ゼロ（記憶未接続）`,
        last_ts: asStr(r.ts),
        final_len: null,
        route_reason: asStr(r.route_reason),
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT r.thread_id, r.turn_index, r.request_id, r.ts, r.route_reason,
              COALESCE((SELECT MAX(l.out_len) FROM mc_llm_execution_ledger l
                 WHERE l.thread_id = r.thread_id AND l.turn_index = r.turn_index), 0) AS out_len
         FROM mc_route_ledger r
        WHERE r.ts >= ${since24h} AND r.selector_intent = 'follow_up'
        ORDER BY r.id DESC
        LIMIT ?`,
    ).all(lim) as Array<Record<string, unknown>>;
    for (const r of rows) {
      if (asNum(r.out_len, 0) === 0) {
        push({
          thread_id: asStr(r.thread_id),
          turn_index: typeof r.turn_index === "number" ? r.turn_index : null,
          request_id: asStr(r.request_id),
          reason: "continuation_failure",
          detail: "follow_up セレクタで LLM 応答が空（継続失敗）",
          last_ts: asStr(r.ts),
          final_len: 0,
          route_reason: asStr(r.route_reason),
        });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT q.thread_id, q.turn_index, q.request_id, q.ts, q.final_len,
              (SELECT r.route_reason FROM mc_route_ledger r
                 WHERE r.thread_id = q.thread_id AND r.turn_index = q.turn_index
                 ORDER BY r.id DESC LIMIT 1) AS route_reason,
              COALESCE((SELECT MAX(CASE WHEN persisted_success = 1 THEN 1 ELSE 0 END)
                         FROM mc_memory_ledger m
                        WHERE m.thread_id = q.thread_id AND m.turn_index = q.turn_index), 0) AS persisted_ok
         FROM mc_dialogue_quality_ledger q
        WHERE q.ts >= ${since24h}
        ORDER BY q.id DESC
        LIMIT ?`,
    ).all(lim) as Array<Record<string, unknown>>;
    for (const r of rows) {
      if (asNum(r.persisted_ok, 0) === 0 && asNum(r.final_len, 0) > 0) {
        push({
          thread_id: asStr(r.thread_id),
          turn_index: typeof r.turn_index === "number" ? r.turn_index : null,
          request_id: asStr(r.request_id),
          reason: "persist_failure",
          detail: "finalize 済みだが persisted_success=1 の memory ledger なし",
          last_ts: asStr(r.ts),
          final_len: asNum(r.final_len, 0),
          route_reason: asStr(r.route_reason),
        });
      }
    }
  } catch {
    /* ignore */
  }

  return [...out.values()]
    .sort((a, b) => String(b.last_ts).localeCompare(String(a.last_ts)))
    .slice(0, lim);
}

export function readMcOverviewCountersV1(): {
  follow_up_turns_24h: number;
  non_empty_follow_up_24h: number;
  follow_up_turns_all_time: number;
  non_empty_follow_up_all_time: number;
  persist_ok_turns_24h: number;
  persist_total_turns_24h: number;
  persist_ok_turns_all_time: number;
  persist_total_turns_all_time: number;
  memory_hit_turns_24h: number;
  memory_total_turns_24h: number;
  top_route_reason: string;
  top_route_share: number;
  recent_threads: string[];
} {
  let follow_up_turns_24h = 0;
  let non_empty_follow_up_24h = 0;
  let follow_up_turns_all_time = 0;
  let non_empty_follow_up_all_time = 0;
  let persist_ok_turns_24h = 0;
  let persist_total_turns_24h = 0;
  let persist_ok_turns_all_time = 0;
  let persist_total_turns_all_time = 0;
  let memory_hit_turns_24h = 0;
  let memory_total_turns_24h = 0;
  let top_route_reason = "";
  let top_route_share = 0;

  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT COUNT(DISTINCT (thread_id || '|' || turn_index)) AS follow_up_turns
         FROM mc_route_ledger
        WHERE ts >= ${since24h} AND selector_intent = 'follow_up'`,
    ).get() as { follow_up_turns?: number };
    follow_up_turns_24h = Number(r?.follow_up_turns ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT COUNT(DISTINCT (thread_id || '|' || turn_index)) AS follow_up_turns
         FROM mc_route_ledger
        WHERE selector_intent = 'follow_up'`,
    ).get() as { follow_up_turns?: number };
    follow_up_turns_all_time = Number(r?.follow_up_turns ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT COUNT(*) AS c FROM (
         SELECT DISTINCT route.thread_id AS tid, route.turn_index AS ti
           FROM mc_route_ledger route
           JOIN mc_llm_execution_ledger llm
             ON llm.thread_id = route.thread_id AND llm.turn_index = route.turn_index
          WHERE route.ts >= ${since24h}
            AND route.selector_intent = 'follow_up'
            AND llm.out_len > 0
       )`,
    ).get() as { c?: number };
    non_empty_follow_up_24h = Number(r?.c ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT COUNT(*) AS c FROM (
         SELECT DISTINCT route.thread_id AS tid, route.turn_index AS ti
           FROM mc_route_ledger route
           JOIN mc_llm_execution_ledger llm
             ON llm.thread_id = route.thread_id AND llm.turn_index = route.turn_index
          WHERE route.selector_intent = 'follow_up'
            AND llm.out_len > 0
       )`,
    ).get() as { c?: number };
    non_empty_follow_up_all_time = Number(r?.c ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT
         SUM(CASE WHEN persisted_success = 1 THEN 1 ELSE 0 END) AS ok,
         COUNT(*) AS total
       FROM (
         SELECT MAX(COALESCE(persisted_success, 0)) AS persisted_success
           FROM mc_memory_ledger
          WHERE ts >= ${since24h}
          GROUP BY thread_id, turn_index
       )`,
    ).get() as { ok?: number; total?: number };
    persist_ok_turns_24h = Number(r?.ok ?? 0);
    persist_total_turns_24h = Number(r?.total ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT
         SUM(CASE WHEN persisted_success = 1 THEN 1 ELSE 0 END) AS ok,
         COUNT(*) AS total
       FROM (
         SELECT MAX(COALESCE(persisted_success, 0)) AS persisted_success
           FROM mc_memory_ledger
          GROUP BY thread_id, turn_index
       )`,
    ).get() as { ok?: number; total?: number };
    persist_ok_turns_all_time = Number(r?.ok ?? 0);
    persist_total_turns_all_time = Number(r?.total ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT
         SUM(CASE WHEN source IN ('memory','conversation_log') AND history_len > 0 THEN 1 ELSE 0 END) AS hit,
         COUNT(*) AS total
       FROM mc_memory_ledger WHERE ts >= ${since24h}`,
    ).get() as { hit?: number; total?: number };
    memory_hit_turns_24h = Number(r?.hit ?? 0);
    memory_total_turns_24h = Number(r?.total ?? 0);
  } catch {
    /* ignore */
  }
  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT route_reason, COUNT(*) AS c FROM mc_route_ledger
        WHERE ts >= ${since24h} AND route_reason <> ''
        GROUP BY route_reason ORDER BY c DESC LIMIT 5`,
    ).all() as Array<{ route_reason: string; c: number }>;
    const total = rows.reduce((n, r) => n + Number(r.c || 0), 0);
    if (total > 0 && rows[0]) {
      top_route_reason = String(rows[0].route_reason);
      top_route_share = Number(rows[0].c) / total;
    }
  } catch {
    /* ignore */
  }

  return {
    follow_up_turns_24h,
    non_empty_follow_up_24h,
    follow_up_turns_all_time,
    non_empty_follow_up_all_time,
    persist_ok_turns_24h,
    persist_total_turns_24h,
    persist_ok_turns_all_time,
    persist_total_turns_all_time,
    memory_hit_turns_24h,
    memory_total_turns_24h,
    top_route_reason,
    top_route_share,
    recent_threads: readRecentThreadIdsV1(8),
  };
}

export function readMcAlertsAggregateV1(): {
  route_rows_24h: number;
  llm_rows_24h: number;
  memory_rows_24h: number;
  quality_rows_24h: number;
  truncation_suspect_24h: number;
} {
  try {
    const route_rows_24h = mcLedgerCountSince24h("mc_route_ledger");
    const llm_rows_24h = mcLedgerCountSince24h("mc_llm_execution_ledger");
    const memory_rows_24h = mcLedgerCountSince24h("mc_memory_ledger");
    const quality_rows_24h = mcLedgerCountSince24h("mc_dialogue_quality_ledger");
    const row = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS c FROM mc_dialogue_quality_ledger WHERE ts >= ${since24h} AND truncation_suspect = 1`,
    ).get() as { c: number };
    const truncation_suspect_24h = Number(row?.c ?? 0);
    return { route_rows_24h, llm_rows_24h, memory_rows_24h, quality_rows_24h, truncation_suspect_24h };
  } catch {
    return {
      route_rows_24h: 0,
      llm_rows_24h: 0,
      memory_rows_24h: 0,
      quality_rows_24h: 0,
      truncation_suspect_24h: 0,
    };
  }
}
