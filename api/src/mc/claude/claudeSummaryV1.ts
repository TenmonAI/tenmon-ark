/**
 * CARD-MC-16: Claude / AI 用の単一 JSON 要約（/mc/ UI を見られない外部 AI が現状を継承するため）。
 * CARD-MC-16-VERIFY: top-level keys は常に同じ shape（空でも null / [] で返す）。
 */
import { sanitize } from "../../core/mc/sanitizer.js";
import { buildMcVnextAlertsV1 } from "../analyzer/mcVnextAlertsV1.js";
import { runMcVnextAnalyzerV1 } from "../analyzer/mcVnextAnalyzerV1.js";
import { buildVnextAcceptancePayload, buildVnextOverviewPayload, buildVnextRepairHubPayload } from "../vnextPayloads.js";
import { buildVnextHistoryPayload } from "../history/mcSystemHistoryV1.js";
import { partitionProblematicThreadsLiveArchive, readMcProblematicThreadsV1 } from "../ledger/mcLedgerRead.js";
import { isMcClaudeNotionMirrorConfiguredV1, MC_CLAUDE_NOTION_PAGE_TITLE } from "../notion/mcClaudeNotionMirrorV1.js";

/** `/api/mc/vnext/claude-summary` の固定 top-level（schema 固定用） */
export const MC_CLAUDE_SUMMARY_V1_TOP_KEYS = [
  "ok",
  "schema_version",
  "generated_at",
  "overview_summary",
  "acceptance",
  "repair_hub",
  "latest_passed_cards",
  "current_open_gaps",
  "top_problematic_threads",
  "active_alerts",
  "source_summary",
  "notion_mirror",
  "last_verified_at",
] as const;

function defaultOverviewSummary(): Record<string, unknown> {
  return {
    git_head: null,
    branch: null,
    commit_message: null,
    acceptance_status: null,
    route_health: null,
    route_summary: null,
    continuation_summary: null,
    history_summary: null,
  };
}

function defaultAcceptance(): Record<string, unknown> {
  return {
    verdict: null,
    status: null,
    reasons: [],
    nextRecommendedCard: null,
    why_now: null,
    lastVerifiedAt: null,
    top_affected_layer: null,
    live_problematic_thread_count: null,
    archived_problematic_thread_count: null,
    checks: [],
  };
}

function defaultRepairHub(): Record<string, unknown> {
  return { input_summary: null, cards: [], total_candidates: null };
}

function defaultSourceSummary(): Record<string, unknown> {
  return {
    verdict_short: null,
    canonical_count: null,
    mirror_count: null,
    backup_count: null,
    derived_count: null,
    graph_edge_count: null,
    top_canonical: [],
  };
}

function defaultNotionMirror(): Record<string, unknown> {
  return {
    page_title: MC_CLAUDE_NOTION_PAGE_TITLE,
    sync_endpoint: "/api/mc/vnext/claude-notion-sync",
    env_page_id: "TENMON_NOTION_MC_CLAUDE_PAGE_ID",
    mirror_configured: isMcClaudeNotionMirrorConfiguredV1(),
  };
}

function mergeRecord(base: Record<string, unknown>, patch: unknown): Record<string, unknown> {
  const p = patch && typeof patch === "object" && !Array.isArray(patch) ? (patch as Record<string, unknown>) : {};
  return { ...base, ...p };
}

/**
 * sanitize 後も必須 key を欠かさないよう正規化する。
 */
export function normalizeClaudeSummaryV1Shape(s: Record<string, unknown>): Record<string, unknown> {
  const overview_summary = mergeRecord(defaultOverviewSummary(), s.overview_summary);
  const acceptance = mergeRecord(defaultAcceptance(), s.acceptance);
  const repair_hub = mergeRecord(defaultRepairHub(), s.repair_hub);
  const source_summary = mergeRecord(defaultSourceSummary(), s.source_summary);
  const notion_mirror = mergeRecord(defaultNotionMirror(), s.notion_mirror);
  notion_mirror.mirror_configured = isMcClaudeNotionMirrorConfiguredV1();

  return {
    ok: s.ok === true,
    schema_version: String(s.schema_version || "mc_claude_summary_v1"),
    generated_at: String(s.generated_at || new Date().toISOString()),
    overview_summary,
    acceptance,
    repair_hub,
    latest_passed_cards: Array.isArray(s.latest_passed_cards) ? s.latest_passed_cards : [],
    current_open_gaps: Array.isArray(s.current_open_gaps) ? s.current_open_gaps : [],
    top_problematic_threads: Array.isArray(s.top_problematic_threads) ? s.top_problematic_threads : [],
    active_alerts: Array.isArray(s.active_alerts) ? s.active_alerts : [],
    source_summary,
    notion_mirror,
    last_verified_at: s.last_verified_at != null && String(s.last_verified_at) !== "" ? String(s.last_verified_at) : null,
  };
}

export function buildClaudeSummaryPayloadV1(): Record<string, unknown> {
  const overview = buildVnextOverviewPayload() as unknown as Record<string, unknown>;
  const acceptanceFull = buildVnextAcceptancePayload() as Record<string, unknown>;
  const history = buildVnextHistoryPayload() as Record<string, unknown>;
  const repairPayload = buildVnextRepairHubPayload() as Record<string, unknown>;
  const analyzer = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(analyzer);

  const problematicAll = readMcProblematicThreadsV1(80);
  const { live: liveProblematic } = partitionProblematicThreadsLiveArchive(problematicAll);
  const topLive = liveProblematic.slice(0, 8).map((p) => ({
    thread_id: p.thread_id,
    turn_index: p.turn_index,
    request_id: p.request_id,
    reason: p.reason,
    detail: p.detail,
    last_ts: p.last_ts,
    final_len: p.final_len,
    route_reason: p.route_reason,
  }));

  const top = (overview.top || {}) as Record<string, unknown>;
  const src = (overview.canonical_sources_summary || {}) as Record<string, unknown>;
  const latestPassed = Array.isArray(history.latest_passed_cards)
    ? (history.latest_passed_cards as Record<string, unknown>[]).slice(0, 12)
    : [];
  const openGaps = Array.isArray(history.current_open_gaps) ? history.current_open_gaps : [];

  const lastVerified =
    String(acceptanceFull.lastVerifiedAt || "").trim() ||
    String((overview.history_summary as Record<string, unknown> | undefined)?.last_verified_at || "").trim() ||
    null;

  const raw: Record<string, unknown> = {
    ok: true,
    schema_version: "mc_claude_summary_v1",
    generated_at: new Date().toISOString(),
    overview_summary: {
      git_head: top.head_sha_short ?? null,
      branch: top.branch ?? null,
      commit_message: typeof top.commit_message === "string" ? String(top.commit_message).slice(0, 240) : null,
      acceptance_status: overview.acceptance_status ?? null,
      route_health: overview.route_health ?? null,
      route_summary: overview.route_summary ?? null,
      continuation_summary: overview.continuation_summary ?? null,
      history_summary: overview.history_summary ?? null,
    },
    acceptance: {
      verdict: acceptanceFull.verdict ?? null,
      status: (acceptanceFull.acceptance as Record<string, unknown> | undefined)?.status ?? null,
      reasons: Array.isArray(acceptanceFull.reasons) ? acceptanceFull.reasons : [],
      nextRecommendedCard: acceptanceFull.nextRecommendedCard ?? null,
      why_now: acceptanceFull.why_now ?? null,
      lastVerifiedAt: acceptanceFull.lastVerifiedAt ?? null,
      top_affected_layer: acceptanceFull.top_affected_layer ?? null,
      live_problematic_thread_count: acceptanceFull.live_problematic_thread_count ?? null,
      archived_problematic_thread_count: acceptanceFull.archived_problematic_thread_count ?? null,
      checks: Array.isArray(acceptanceFull.checks)
        ? (acceptanceFull.checks as Record<string, unknown>[]).slice(0, 10)
        : [],
    },
    repair_hub: {
      input_summary: repairPayload.input_summary ?? null,
      cards: Array.isArray(repairPayload.cards) ? (repairPayload.cards as unknown[]).slice(0, 10) : [],
      total_candidates: repairPayload.total_candidates ?? null,
    },
    latest_passed_cards: latestPassed,
    current_open_gaps: openGaps,
    top_problematic_threads: topLive,
    active_alerts: alerts.slice(0, 20).map((a) => ({
      severity: a.severity,
      category: a.category,
      message: a.message,
      hint: a.hint,
    })),
    source_summary: {
      verdict_short: src.verdict_short ?? null,
      canonical_count: src.canonical_count ?? null,
      mirror_count: src.mirror_count ?? null,
      backup_count: src.backup_count ?? null,
      derived_count: src.derived_count ?? null,
      graph_edge_count: src.graph_edge_count ?? null,
      top_canonical: Array.isArray(src.canonical) ? (src.canonical as unknown[]).slice(0, 8) : [],
    },
    last_verified_at: lastVerified,
    notion_mirror: {
      page_title: MC_CLAUDE_NOTION_PAGE_TITLE,
      sync_endpoint: "/api/mc/vnext/claude-notion-sync",
      env_page_id: "TENMON_NOTION_MC_CLAUDE_PAGE_ID",
      mirror_configured: isMcClaudeNotionMirrorConfiguredV1(),
    },
  };

  const sanitized = sanitize(raw) as Record<string, unknown>;
  return normalizeClaudeSummaryV1Shape(sanitized);
}
