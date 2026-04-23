import { buildOverview } from "../core/mc/builders/overviewBuilder.js";
import { readState } from "../core/mc/stateReader.js";
import { sanitize } from "../core/mc/sanitizer.js";
import type { McLiveState, McgitState } from "../core/mc/types.js";
import type { McVnextOverviewPayload, McVnextSkeletonSection } from "./types/mcVnextTypes.js";
import {
  readLatestMcThreadIdV1,
  readMcAlertsAggregateV1,
  readMcCircuitMapV1,
  readMcMemoryHitContinuationSplitV1,
  readMcMemoryHitSplitV1,
  readMcOverviewCountersV1,
  partitionProblematicThreadsLiveArchive,
  readMcProblematicThreadsV1,
  readMcQualityRecentV1,
  readMcRequestTraceV1,
  readMcThreadTraceV1,
} from "./ledger/mcLedgerRead.js";
import { runMcVnextAnalyzerV1 } from "./analyzer/mcVnextAnalyzerV1.js";
import { buildMcVnextAlertsV1 } from "./analyzer/mcVnextAlertsV1.js";
import { evaluateMcVnextAcceptanceV1 } from "./analyzer/mcVnextAcceptanceV1.js";
import { buildMcRepairHubV1 } from "./analyzer/mcRepairHubV1.js";
import { buildMcInfraMapV1, buildMcRepoMapV1, buildMcSourceRegistryV1 } from "./mcVnextSourceMapV1.js";
import { getHistoryAcceptanceAugmentsV1, getHistorySummaryForOverviewV1 } from "./history/mcSystemHistoryV1.js";

function nowIso(): string {
  return new Date().toISOString();
}

function skeleton(section: string, title: string, body: string, placeholders: Record<string, string | number | boolean | null>): McVnextSkeletonSection {
  return {
    ok: true,
    schema_version: "mc_vnext_foundation_v1",
    generated_at: nowIso(),
    section,
    title,
    body,
    placeholders,
  };
}

export function buildVnextOverviewPayload(): McVnextOverviewPayload {
  const overview = sanitize(buildOverview());
  let live: McLiveState | null = null;
  try {
    live = sanitize(readState<McLiveState>("live_state"));
  } catch {
    live = null;
  }

  const memTotal = live?.resources?.memory_total_gb ?? null;
  const memAvail = live?.resources?.memory_available_gb ?? null;

  const agg = readMcAlertsAggregateV1();

  // --- CARD-MC-09: rich aggregates ---
  const analyzer = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(analyzer);
  const acceptance = evaluateMcVnextAcceptanceV1(analyzer, alerts);
  const counters = readMcOverviewCountersV1();
  const problematicAll = readMcProblematicThreadsV1(80);
  const { live: liveProblematic, archived: archivedProblematic } =
    partitionProblematicThreadsLiveArchive(problematicAll);
  const memSplit = readMcMemoryHitSplitV1();
  const memContSplit = readMcMemoryHitContinuationSplitV1();
  const infra = buildMcInfraMapV1();
  const registry = buildMcSourceRegistryV1();
  const repo = buildMcRepoMapV1();

  const alertsCount = { crit: 0, high: 0, med: 0, low: 0 };
  for (const a of alerts) {
    if (a.severity === "CRIT") alertsCount.crit += 1;
    else if (a.severity === "HIGH") alertsCount.high += 1;
    else if (a.severity === "MED") alertsCount.med += 1;
    else alertsCount.low += 1;
  }

  const follow_up_success_rate =
    counters.follow_up_turns_24h > 0
      ? counters.non_empty_follow_up_24h / counters.follow_up_turns_24h
      : null;
  const continuation_success_live = follow_up_success_rate;
  const continuation_success_all_time =
    counters.follow_up_turns_all_time > 0
      ? counters.non_empty_follow_up_all_time / counters.follow_up_turns_all_time
      : null;
  const persist_success_live =
    counters.persist_total_turns_24h > 0
      ? counters.persist_ok_turns_24h / counters.persist_total_turns_24h
      : null;
  const persist_success_all_time =
    counters.persist_total_turns_all_time > 0
      ? counters.persist_ok_turns_all_time / counters.persist_total_turns_all_time
      : null;
  /** 後方互換: 24h・memory+conversation_log・history_len>0（readMcMemoryHitSplitV1 と一致）。 */
  const memory_hit_rate = memSplit.combined_hit_live;
  const memory_hit_live = memSplit.combined_hit_live;
  const memory_hit_all_time = memSplit.combined_hit_all_time;
  const conversation_log_hit_live = memSplit.conversation_log_hit_live;
  const conversation_log_hit_all_time = memSplit.conversation_log_hit_all_time;

  // CARD-MC-09C: turn_index>=1 の真の継承品質と Turn 0 の正常性。
  const continuation_memory_hit_live = memContSplit.continuation_memory_hit_live;
  const continuation_memory_hit_all_time = memContSplit.continuation_memory_hit_all_time;
  const continuation_sample_count_live = memContSplit.continuation_sample_count_live;
  const continuation_sample_count_all_time = memContSplit.continuation_sample_count_all_time;
  const turn0_never_persisted_rate = memContSplit.turn0_never_persisted_rate_live;
  const turn0_sample_count_live = memContSplit.turn0_sample_count_live;

  const continuationVerdict =
    counters.follow_up_turns_24h === 0
      ? "24h 内に continuation 発火なし"
      : follow_up_success_rate != null && follow_up_success_rate >= 0.8
        ? `continuation 成功率 ${(follow_up_success_rate * 100).toFixed(0)}%・memory+conv_log ヒット(live) ${memory_hit_live != null ? (memory_hit_live * 100).toFixed(0) + "%" : "—"}`
        : `continuation 成功率 ${follow_up_success_rate != null ? (follow_up_success_rate * 100).toFixed(0) + "%" : "—"}（要観察）`;

  // CARD-MC-09C verdict_short_v2: continuation 継承品質と turn0 正常性を分離表示。
  const contSuccessPctStr =
    follow_up_success_rate != null
      ? `${(follow_up_success_rate * 100).toFixed(0)}%`
      : "—";
  const contHitPctStr =
    continuation_memory_hit_live != null
      ? `${(continuation_memory_hit_live * 100).toFixed(0)}%(n=${continuation_sample_count_live})`
      : `—(n=${continuation_sample_count_live})`;
  const turn0NpPctStr =
    turn0_never_persisted_rate != null
      ? `${(turn0_never_persisted_rate * 100).toFixed(0)}%`
      : "—";
  const continuationVerdictV2 = `continuation 成功率 ${contSuccessPctStr}・継承 ${contHitPctStr}・turn0 正常 ${turn0NpPctStr}`;

  const qualityVerdict =
    analyzer.sample_count === 0
      ? "24h 内に dialogue_quality sample なし"
      : analyzer.truncation_suspect_rate != null && analyzer.truncation_suspect_rate > 0.35
        ? `truncation 疑い ${(analyzer.truncation_suspect_rate * 100).toFixed(0)}%（要修理）`
        : `truncation 疑い ${analyzer.truncation_suspect_rate != null ? (analyzer.truncation_suspect_rate * 100).toFixed(0) + "%" : "—"} で安定`;

  const routeVerdict =
    counters.top_route_reason
      ? `top: ${counters.top_route_reason} (${(counters.top_route_share * 100).toFixed(0)}%)`
      : "24h 内に route ledger なし";

  const infraRuntime = (infra.runtime || {}) as Record<string, unknown>;

  const latestThreadId = readLatestMcThreadIdV1();

  const sourcesNotable: Array<{ id: string; source_name: string; source_uri: string; source_kind: string }> =
    registry.canonical.slice(0, 6).map((s) => ({
      id: String(s.id || ""),
      source_name: String(s.source_name || s.id || ""),
      source_uri: String(s.source_uri || ""),
      source_kind: String(s.source_kind || ""),
    }));
  const sourcesVerdict =
    registry.canonical.length === 0
      ? "canonical source が検出できません"
      : `canonical ${registry.canonical.length} / backup ${registry.backup.length} / derived ${registry.derived.length}`;

  const historySummary = getHistorySummaryForOverviewV1();

  const runtimeNote = (() => {
    const parts: string[] = [];
    if (typeof infraRuntime.service_active === "boolean") {
      parts.push(infraRuntime.service_active ? "systemd active" : "systemd inactive");
    }
    if (typeof infraRuntime.uptime_sec === "number") {
      const hrs = Math.floor((infraRuntime.uptime_sec as number) / 3600);
      parts.push(`uptime ${hrs}h`);
    }
    if (typeof infraRuntime.state_file_stale === "boolean") {
      parts.push(infraRuntime.state_file_stale ? "state_file stale" : "state_file fresh");
    }
    return parts.length ? parts.join(" · ") : "runtime 情報なし";
  })();

  return {
    ok: true,
    schema_version: "mc_vnext_foundation_v1",
    generated_at: nowIso(),
    top: {
      head_sha_short: String(overview.git?.head_sha_short ?? repo.head_sha_short ?? "—"),
      branch: String(overview.git?.branch ?? repo.branch ?? "—"),
      commit_message: String(overview.git?.last_commit_subject ?? repo.head_subject ?? "—"),
      systemd_active: typeof live?.service?.active === "boolean" ? live.service.active : null,
      main_pid: typeof live?.service?.main_pid === "number" ? live.service.main_pid : null,
      uptime_sec: overview.service?.uptime_sec ?? live?.service?.uptime_sec ?? null,
    },
    alerts_24h: {
      critical: Number(overview.state?.critical_blockers ?? 0),
      warnings: Number(overview.state?.warnings ?? 0),
    },
    acceptance_status: {
      label: String(acceptance.verdict || acceptance.status || "unknown"),
      detail: acceptance.reasons?.[0] || "主要閾値をすべて満たしています。",
    },
    history_summary: {
      latest_passed_card: historySummary.latest_passed_card,
      latest_passed_card_id: historySummary.latest_passed_card_id,
      current_open_gap_count: historySummary.current_open_gap_count,
      last_verified_at: historySummary.last_verified_at,
      ledger_row_count: historySummary.history_event_count,
    },
    route_health: {
      ok: Boolean(overview.health?.ok),
      response_ms: Number(overview.health?.response_ms ?? 0),
    },
    memory_health:
      memTotal != null || memAvail != null
        ? { memory_total_gb: memTotal, memory_available_gb: memAvail }
        : { memory_total_gb: null, memory_available_gb: null, placeholder: true },
    dialogue_quality_summary: {
      routing_observations: agg.llm_rows_24h,
      dialogue_quality_score: null,
      note:
        agg.quality_rows_24h > 0
          ? `Ledger: quality_rows_24h=${agg.quality_rows_24h}, truncation_suspect_24h=${agg.truncation_suspect_24h}`
          : "Skeleton — enable TENMON_MC_VNEXT_LEDGER=1 and send chat to populate mc_*_ledger tables",
    },
    provider_model_summary: {
      items: [],
      note: "Skeleton — provider × model histogram (TBD, no env secrets)",
    },
    ledger_24h: {
      route_rows: agg.route_rows_24h,
      llm_rows: agg.llm_rows_24h,
      memory_rows: agg.memory_rows_24h,
      quality_rows: agg.quality_rows_24h,
      truncation_suspect: agg.truncation_suspect_24h,
    },

    // --- CARD-MC-09 additions ---
    runtime_summary: {
      head_sha_short: String(overview.git?.head_sha_short ?? repo.head_sha_short ?? "—"),
      branch: String(overview.git?.branch ?? repo.branch ?? "—"),
      head_subject: String(overview.git?.last_commit_subject ?? repo.head_subject ?? "—"),
      hostname: typeof infraRuntime.hostname === "string" ? (infraRuntime.hostname as string) : null,
      service_active:
        typeof infraRuntime.service_active === "boolean" ? (infraRuntime.service_active as boolean) : null,
      uptime_sec: typeof infraRuntime.uptime_sec === "number" ? (infraRuntime.uptime_sec as number) : null,
      note: runtimeNote,
    },
    quality_summary: {
      sample_count: analyzer.sample_count,
      truncation_suspect_rate: analyzer.truncation_suspect_rate,
      natural_end_rate: analyzer.natural_end_rate,
      avg_length: analyzer.average_length,
      verdict_short: qualityVerdict,
    },
    continuation_summary: {
      follow_up_turns_24h: counters.follow_up_turns_24h,
      non_empty_follow_up_24h: counters.non_empty_follow_up_24h,
      follow_up_success_rate,
      continuation_success_live,
      continuation_success_all_time,
      persist_success_live,
      persist_success_all_time,
      memory_hit_rate,
      memory_hit_live,
      memory_hit_all_time,
      conversation_log_hit_live,
      conversation_log_hit_all_time,
      // CARD-MC-09C: 真の継承品質（turn_index>=1）と Turn 0 正常性。
      continuation_memory_hit_live,
      continuation_memory_hit_all_time,
      continuation_sample_count_live,
      continuation_sample_count_all_time,
      turn0_never_persisted_rate,
      turn0_sample_count_live,
      metrics_window_note:
        "live = 24h 実測。all_time = 全期間履歴。memory_hit_rate は後方互換（全 MEMORY_READ が母集団）。continuation_memory_hit_live は turn_index>=1 に限定した真の継承品質。turn0_never_persisted_rate は初回リードの正常性（高いほど正常）。",
      verdict_short: continuationVerdict,
      verdict_short_v2: continuationVerdictV2,
    },
    route_summary: {
      top_route_reason: counters.top_route_reason,
      top_route_share: counters.top_route_share,
      verdict_short: routeVerdict,
    },
    latest_acceptance: {
      status: String(acceptance.status),
      verdict: String(acceptance.verdict),
      reasons: Array.isArray(acceptance.reasons) ? acceptance.reasons.slice(0, 6) : [],
      passed: Array.isArray(acceptance.passed) ? acceptance.passed.slice(0, 6) : [],
      missingProof: Array.isArray(acceptance.missingProof) ? acceptance.missingProof.slice(0, 6) : [],
      checks: Array.isArray(acceptance.checks)
        ? acceptance.checks.map((c) => ({
            id: c.id,
            label: c.label,
            status: c.status,
            detail: c.detail,
            affected_layer: c.affected_layer,
          }))
        : [],
      nextRecommendedCard: String(acceptance.nextRecommendedCard || ""),
      why_now: String(acceptance.why_now || ""),
      live_problematic_thread_count: acceptance.live_problematic_thread_count,
      archived_problematic_thread_count: acceptance.archived_problematic_thread_count,
      top_affected_layer: String(acceptance.top_affected_layer || "none"),
      lastVerifiedAt: String(acceptance.lastVerifiedAt || ""),
    },
    active_alerts_summary: {
      crit: alertsCount.crit,
      high: alertsCount.high,
      med: alertsCount.med,
      low: alertsCount.low,
      total: alerts.length,
      top: alerts.slice(0, 5).map((a) => ({
        severity: String(a.severity),
        category: String(a.category),
        message: String(a.message),
        hint: String(a.hint),
      })),
    },
    canonical_sources_summary: {
      canonical_count: registry.canonical.length,
      mirror_count: registry.mirror.length,
      backup_count: registry.backup.length,
      derived_count: registry.derived.length,
      graph_edge_count: registry.graph.edges.length,
      canonical: sourcesNotable,
      verdict_short: sourcesVerdict,
    },
    failing_threads_live: liveProblematic.slice(0, 3).map((p) => ({
      thread_id: p.thread_id,
      turn_index: p.turn_index,
      request_id: p.request_id,
      reason: p.reason,
      detail: p.detail,
      last_ts: p.last_ts,
      final_len: p.final_len,
      route_reason: p.route_reason,
    })),
    failing_threads_archived_count: archivedProblematic.length,
    failing_threads_archived_preview: archivedProblematic.slice(0, 5).map((p) => ({
      thread_id: p.thread_id,
      turn_index: p.turn_index,
      request_id: p.request_id,
      reason: p.reason,
      detail: p.detail,
      last_ts: p.last_ts,
      final_len: p.final_len,
      route_reason: p.route_reason,
    })),
    /** @deprecated UI は failing_threads_live を優先。互換のため live 上位のみ。 */
    problematic_threads: liveProblematic.slice(0, 10).map((p) => ({
      thread_id: p.thread_id,
      turn_index: p.turn_index,
      request_id: p.request_id,
      reason: p.reason,
      detail: p.detail,
      last_ts: p.last_ts,
      final_len: p.final_len,
      route_reason: p.route_reason,
    })),
    nav: {
      thread_latest: latestThreadId,
      thread_latest_link: latestThreadId ? `/mc/vnext/thread/${encodeURIComponent(latestThreadId)}` : "/mc/vnext/",
      quality: "/mc/vnext/quality",
      alerts: "/mc/vnext/alerts",
      acceptance: "/mc/vnext/acceptance",
      sources: "/mc/vnext/sources",
      history: "/mc/vnext/history",
      classic: "/mc/classic/",
    },
  };
}

export function buildVnextCircuitPayload(threadId?: string): McVnextSkeletonSection {
  const requested = String(threadId || "").trim().slice(0, 256);
  const refThreadId = requested || readLatestMcThreadIdV1();
  const base = skeleton(
    "circuit",
    "Conversation circuit map",
    "Input → Route → Memory → LLM → Finalize → Persistence → Learning return を1本の因果線で読む。",
    {
      stages: 7,
      wired: Boolean(refThreadId),
      referenceThreadId: refThreadId || "(none)",
      requestedThreadId: requested || null,
    },
  );
  return {
    ...base,
    ledgers: readMcCircuitMapV1(refThreadId) as unknown as Record<string, unknown>,
  };
}

/**
 * CARD-MC-08B-V2-THREAD-TRACE-TURN-ASSEMBLY-V1:
 *   ledger 側 (`mc_memory_ledger`) の payload_json には既に
 *   event_kind / miss_reason / hit / history_len / persisted_turn_count が
 *   入っているが、buildVnextThreadPayload では top-level `turns` / `overall`
 *   を組み立てておらず、Acceptance の `thread_trace_healthy` が step=0 と
 *   誤判定していた。ここで ledger rows + conversation_log rows を
 *   turn_index でグルーピングして turns / overall を露出させる。
 */
type ThreadTurnEventV1 = {
  event_kind: string;
  ts: string;
  source: string | null;
  miss_reason: string | null;
  persisted_turn_count: number | null;
  history_len: number | null;
  hit: boolean | null;
  persisted_success: number | null;
};

type ThreadTurnV1 = {
  turn_index: number;
  events: ThreadTurnEventV1[];
  userInput: string;
  assistantOutput: string;
};

type ThreadTurnOverallV1 = {
  turn_count: number;
  memory_hit_rate: number | null;
  continuation_memory_hit_rate: number | null;
  continuation_verdict: "success" | "failure" | "n/a";
  dominant_miss_reason: string | null;
  persist_success_count: number;
  last_turn_index: number | null;
};

function extractPayloadJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s || s === "{}") return {};
    try {
      const parsed = JSON.parse(s);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function coerceNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceBoolOrNull(v: unknown): boolean | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return null;
}

/**
 * ledger の `turn_index` は role ごとに +1 される（user / assistant で
 * 2 つずつ消費する）。ユーザーが見たい「会話ターン」は user+assistant の
 * ペアなので、`Math.floor(turn_index / 2)` でグルーピングする。
 * これにより mc09b-test-* のような 2 往復スレッドは turn_count=2 となる。
 */
function conversationTurnIndex(ti: number): number {
  if (!Number.isFinite(ti) || ti < 0) return 0;
  return Math.floor(ti / 2);
}

function buildThreadTurnsV1(
  ledgerMemoryRows: Record<string, unknown>[],
  convRows: Record<string, unknown>[],
): { turns: ThreadTurnV1[]; overall: ThreadTurnOverallV1 } {
  const turnsMap = new Map<number, ThreadTurnV1>();
  const getTurn = (ti: number): ThreadTurnV1 => {
    let t = turnsMap.get(ti);
    if (!t) {
      t = { turn_index: ti, events: [], userInput: "", assistantOutput: "" };
      turnsMap.set(ti, t);
    }
    return t;
  };

  for (const row of ledgerMemoryRows) {
    const rawTi = Number((row as any).turn_index ?? 0);
    const ti = conversationTurnIndex(rawTi);
    const t = getTurn(ti);
    const payload = extractPayloadJson((row as any).payload_json) ?? {};
    const eventKind =
      typeof payload.event_kind === "string" && payload.event_kind
        ? String(payload.event_kind)
        : (row as any).persisted_success != null && Number((row as any).persisted_success) === 1
          ? "MEMORY_PERSIST"
          : "MEMORY_READ";
    const source =
      typeof payload.source === "string"
        ? String(payload.source)
        : typeof (row as any).source === "string"
          ? String((row as any).source)
          : null;
    const hitFallback = (() => {
      const s = source ?? "";
      const hl = Number((row as any).history_len ?? 0);
      if (s === "none" || s === "memory_error") return false;
      if (!Number.isFinite(hl) || hl <= 0) return false;
      return true;
    })();
    t.events.push({
      event_kind: eventKind,
      ts: String((row as any).ts ?? ""),
      source,
      miss_reason:
        typeof payload.miss_reason === "string"
          ? String(payload.miss_reason)
          : payload.miss_reason == null
            ? null
            : null,
      persisted_turn_count: coerceNumOrNull(payload.persisted_turn_count),
      history_len: coerceNumOrNull(payload.history_len ?? (row as any).history_len),
      hit:
        payload.hit == null
          ? eventKind === "MEMORY_READ"
            ? hitFallback
            : null
          : coerceBoolOrNull(payload.hit),
      persisted_success: coerceNumOrNull((row as any).persisted_success),
    });
  }

  for (const row of convRows) {
    const tiRaw = (row as any).turn_index;
    const rawTi = tiRaw == null ? 0 : Number(tiRaw);
    const ti = conversationTurnIndex(rawTi);
    const t = getTurn(ti);
    const role = String((row as any).role ?? "");
    const content = String((row as any).content ?? "").slice(0, 200);
    if (role === "user") {
      if (!t.userInput) t.userInput = content;
    } else if (role === "assistant") {
      if (!t.assistantOutput) t.assistantOutput = content;
    }
  }

  const turns = Array.from(turnsMap.values()).sort((a, b) => a.turn_index - b.turn_index);

  // ---- overall aggregation ----
  const readTurns = turns.filter((t) =>
    t.events.some((e) => e.event_kind === "MEMORY_READ"),
  );
  const readHitCount = readTurns.filter((t) =>
    t.events.some((e) => e.event_kind === "MEMORY_READ" && e.hit === true),
  ).length;
  const memory_hit_rate =
    readTurns.length > 0 ? readHitCount / readTurns.length : null;

  const continuationTurns = readTurns.filter((t) => t.turn_index >= 1);
  const continuationHit = continuationTurns.filter((t) =>
    t.events.some((e) => e.event_kind === "MEMORY_READ" && e.hit === true),
  ).length;
  const continuation_memory_hit_rate =
    continuationTurns.length > 0 ? continuationHit / continuationTurns.length : null;

  // Task 仕様: turns.length >= 2 のとき turns[1] (2 番目) の MEMORY_READ hit で verdict を決める。
  let continuation_verdict: "success" | "failure" | "n/a" = "n/a";
  if (turns.length >= 2) {
    const second = turns[1];
    const hit = second.events.some(
      (e) => e.event_kind === "MEMORY_READ" && e.hit === true,
    );
    const hasRead = second.events.some((e) => e.event_kind === "MEMORY_READ");
    continuation_verdict = hit ? "success" : hasRead ? "failure" : "n/a";
  }

  const missReasonCounts = new Map<string, number>();
  for (const t of turns) {
    for (const ev of t.events) {
      if (ev.event_kind !== "MEMORY_READ") continue;
      if (!ev.miss_reason) continue;
      missReasonCounts.set(ev.miss_reason, (missReasonCounts.get(ev.miss_reason) ?? 0) + 1);
    }
  }
  let dominant_miss_reason: string | null = null;
  let bestCount = 0;
  for (const [k, c] of missReasonCounts) {
    if (c > bestCount) {
      dominant_miss_reason = k;
      bestCount = c;
    }
  }

  const persist_success_count = turns.reduce(
    (acc, t) =>
      acc +
      t.events.filter(
        (e) => e.event_kind === "MEMORY_PERSIST" && e.persisted_success === 1,
      ).length,
    0,
  );

  const overall: ThreadTurnOverallV1 = {
    turn_count: turns.length,
    memory_hit_rate,
    continuation_memory_hit_rate,
    continuation_verdict,
    dominant_miss_reason,
    persist_success_count,
    last_turn_index: turns.length > 0 ? turns[turns.length - 1].turn_index : null,
  };

  return { turns, overall };
}

export function buildVnextThreadPayload(threadId: string): McVnextSkeletonSection {
  const id = String(threadId || "").trim().slice(0, 128);
  const base = skeleton(
    "thread",
    "Thread trace",
    "Input / Route / Memory / LLM / Finalize / Persist / Learning を thread 単位で束ねる。",
    {
      threadId: id || "(empty)",
    },
  );
  const trace = readMcThreadTraceV1(id, 120) as Record<string, unknown>;
  const ledgerEvents = Array.isArray(trace.event_stream) ? (trace.event_stream as Record<string, unknown>[]) : [];
  const convRows = Array.isArray(trace.conversation) ? (trace.conversation as Record<string, unknown>[]) : [];
  const ledgers = (trace.ledgers ?? {}) as Record<string, unknown>;
  const memoryRows = Array.isArray(ledgers.memory)
    ? (ledgers.memory as Record<string, unknown>[])
    : [];
  const sessionIdMatchCount = convRows.filter(
    (row) => String(row.session_id || "").trim() === id,
  ).length;

  const { turns, overall } = buildThreadTurnsV1(memoryRows, convRows);
  const overallForResponse = turns.length > 0 ? overall : null;

  return {
    ...base,
    ledgers: trace,
    turns,
    overall: overallForResponse,
    diagnostic: {
      ledger_events_found: ledgerEvents.length,
      conversation_log_rows_found: convRows.length,
      session_id_match_count: sessionIdMatchCount,
      failure_reason:
        ledgerEvents.length === 0
          ? "no_ledger_events_for_this_thread"
          : convRows.length === 0
            ? "no_conversation_log_for_this_thread"
            : sessionIdMatchCount === 0
              ? "ledger_conv_session_id_mismatch"
              : null,
    },
  };
}

export function buildVnextRequestPayload(requestId: string): McVnextSkeletonSection {
  const id = String(requestId || "").trim().slice(0, 64);
  const base = skeleton(
    "request",
    "Request proof trace",
    "request_id 単位で route / llm / memory / quality ledger を束ねる。",
    {
      requestId: id || "(empty)",
    },
  );
  return { ...base, ledgers: readMcRequestTraceV1(id) as unknown as Record<string, unknown> };
}

export function buildVnextRepoPayload(): McVnextSkeletonSection {
  const repo = buildMcRepoMapV1();
  return {
    ...skeleton("repo", "Repository / file tree", "repo/tree/file と runtime node の接続を返す。", {
      tree: Array.isArray(repo.top_level_tree) ? (repo.top_level_tree as unknown[]).length : 0,
      branch: String(repo.branch || "—"),
      dirty: Boolean(repo.dirty),
      key_files: Array.isArray(repo.key_files) ? (repo.key_files as unknown[]).length : 0,
    }),
    ledgers: repo as Record<string, unknown>,
  };
}

export function buildVnextFilePayload(relPath: string): McVnextSkeletonSection {
  const rel = String(relPath || "").trim().slice(0, 512) || "/";
  return skeleton("file", "File detail", "ファイル内容は返さず、メタ情報のみの骨格。", { path: rel });
}

export function buildVnextSourcesPayload(): McVnextSkeletonSection {
  const registry = buildMcSourceRegistryV1();
  return {
    ...skeleton(
      "sources",
      "Source map",
      "Notion / GitHub / VPS / backup / NAS / corpus / persona / learning / core の接続を返す。",
      {
        canonical_count: registry.canonical.length,
        mirror_count: registry.mirror.length,
        backup_count: registry.backup.length,
        derived_count: registry.derived.length,
        graph_edge_count: registry.graph.edges.length,
      },
    ),
    ledgers: {
      items: registry.items,
      links: registry.links,
      canonical: registry.canonical,
      mirror: registry.mirror,
      backup: registry.backup,
      derived: registry.derived,
      graph: registry.graph,
    } as Record<string, unknown>,
  };
}

export function buildVnextInfraPayload(): McVnextSkeletonSection {
  const infra = buildMcInfraMapV1();
  return {
    ...skeleton("infra", "Infra / storage / backup topology", "runtime / storage / backup / NAS / DB topology を返す。", {
      topology_nodes: Array.isArray(infra.topology_nodes) ? (infra.topology_nodes as unknown[]).length : 0,
      databases: Array.isArray(infra.databases) ? (infra.databases as unknown[]).length : 0,
      services: Array.isArray(infra.systemd_services) ? (infra.systemd_services as unknown[]).length : 0,
    }),
    ledgers: infra as Record<string, unknown>,
  };
}

export function buildVnextQualityPayload(): McVnextSkeletonSection {
  const base = skeleton("quality", "Dialogue quality studio", "ledger + analyzer（文体・継続・truncation）。自動修正なし。", {
    studio: "analyzer_v1",
  });
  const analyzer = runMcVnextAnalyzerV1();
  const alerts_full = buildMcVnextAlertsV1(analyzer);
  const alerts_preview = alerts_full.slice(0, 10);
  const acceptance = evaluateMcVnextAcceptanceV1(analyzer, alerts_full);
  return {
    ...base,
    recent_quality: readMcQualityRecentV1(60) as unknown as Record<string, unknown>[],
    analyzer: analyzer as unknown as Record<string, unknown>,
    alerts_preview: alerts_preview as unknown as Record<string, unknown>[],
    acceptance_summary: {
      status: acceptance.status,
      reasons: acceptance.reasons.slice(0, 6),
      nextRecommendedCard: acceptance.nextRecommendedCard,
    } as Record<string, unknown>,
  };
}

export function buildVnextAlertsPayload(): McVnextSkeletonSection {
  const base = skeleton("alerts", "Alerts / regression", "重大度別アラート + git 近傍と品質レンズの並置（相関は人手確認）。", {
    regression_watch: "analyzer_v1",
  });
  const analyzer = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(analyzer);
  let gitState: Record<string, unknown> | null = null;
  try {
    gitState = sanitize(readState<McgitState>("git_state")) as unknown as Record<string, unknown>;
  } catch {
    gitState = null;
  }
  const quality_lens = readMcQualityRecentV1(20).map((q) => ({
    id: q.id,
    thread_id: q.thread_id,
    turn_index: q.turn_index,
    final_len: q.final_len,
    truncation_suspect: q.truncation_suspect,
    ts: q.ts,
  }));
  return {
    ...base,
    alerts_aggregate: readMcAlertsAggregateV1() as unknown as Record<string, number>,
    alerts,
    analyzer,
    commit_quality_panel: {
      git_recent_commits: (gitState?.recent_commits as unknown[])?.slice?.(0, 8) ?? [],
      quality_lens,
      note: "patch からの崩れ特定は git と quality の時系列突合（将来: card generator と連携）",
    } as Record<string, unknown>,
  };
}

export function buildVnextAcceptancePayload(): Record<string, unknown> {
  const analyzer = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(analyzer);
  const acceptance = evaluateMcVnextAcceptanceV1(analyzer, alerts);
  const problematicAll = readMcProblematicThreadsV1(80);
  const { live: liveProblematic, archived: archivedProblematic } =
    partitionProblematicThreadsLiveArchive(problematicAll);
  let registry: ReturnType<typeof buildMcSourceRegistryV1>;
  try {
    registry = buildMcSourceRegistryV1();
  } catch {
    const empty = { canonical: [], mirror: [], backup: [], derived: [], graph: { nodes: [], edges: [] } };
    registry = empty as unknown as ReturnType<typeof buildMcSourceRegistryV1>;
  }
  const repair = buildMcRepairHubV1({
    acceptance,
    alerts,
    analyzer,
    liveProblematic,
    archivedProblematicCount: archivedProblematic.length,
    registry,
  });
  const histAug = getHistoryAcceptanceAugmentsV1();
  return sanitize({
    ok: true,
    schema_version: "mc_vnext_acceptance_view_v1",
    generated_at: new Date().toISOString(),
    verdict: acceptance.verdict,
    reasons: acceptance.reasons,
    passed: acceptance.passed,
    missingProof: acceptance.missingProof,
    checks: acceptance.checks,
    nextRecommendedCard: acceptance.nextRecommendedCard,
    why_now: acceptance.why_now,
    live_problematic_thread_count: acceptance.live_problematic_thread_count,
    archived_problematic_thread_count: acceptance.archived_problematic_thread_count,
    top_affected_layer: acceptance.top_affected_layer,
    lastVerifiedAt: acceptance.lastVerifiedAt,
    acceptance,
    alerts,
    analyzer,
    repair_hub: {
      cards: repair.cards,
      total_candidates: repair.total_candidates,
      input_summary: repair.input_summary,
    },
    historical_root_causes: histAug.historical_root_causes,
    why_still_fail_watch_hint: histAug.why_still_fail_watch_hint,
  }) as Record<string, unknown>;
}

export function buildVnextRepairHubPayload(): Record<string, unknown> {
  const analyzer = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(analyzer);
  const acceptance = evaluateMcVnextAcceptanceV1(analyzer, alerts);
  const problematicAll = readMcProblematicThreadsV1(80);
  const { live: liveProblematic, archived: archivedProblematic } =
    partitionProblematicThreadsLiveArchive(problematicAll);
  let registry: ReturnType<typeof buildMcSourceRegistryV1>;
  try {
    registry = buildMcSourceRegistryV1();
  } catch {
    const empty = { canonical: [], mirror: [], backup: [], derived: [], graph: { nodes: [], edges: [] } };
    registry = empty as unknown as ReturnType<typeof buildMcSourceRegistryV1>;
  }
  const snap = buildMcRepairHubV1({
    acceptance,
    alerts,
    analyzer,
    liveProblematic,
    archivedProblematicCount: archivedProblematic.length,
    registry,
  });
  return sanitize({
    ok: true,
    schema_version: snap.schema_version,
    generated_at: snap.generated_at,
    cards: snap.cards,
    total_candidates: snap.total_candidates,
    input_summary: snap.input_summary,
    nav: {
      acceptance_link: "/mc/vnext/acceptance",
      alerts_link: "/mc/vnext/alerts",
      sources_link: "/mc/vnext/sources",
    },
  }) as Record<string, unknown>;
}

export function buildVnextGraphPayload(): McVnextSkeletonSection {
  const registry = buildMcSourceRegistryV1();
  const base = skeleton(
    "graph",
    "Sacred / persona / learning graph",
    "source registry から Notion / GitHub / VPS / NAS / corpus / persona / learning / core の linkage を返す。",
    {
      node_count: registry.graph.nodes.length,
      edge_count: registry.graph.edges.length,
    },
  );
  return {
    ...base,
    ledgers: {
      nodes: registry.graph.nodes,
      edges: registry.graph.edges,
    } as Record<string, unknown>,
  };
}
