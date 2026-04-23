/**
 * MC vNext API contract (read-only skeleton). No secrets / tokens in fields.
 */
export type McVnextSchemaVersion = "mc_vnext_foundation_v1";

export interface McVnextOverviewTopBlock {
  head_sha_short: string;
  branch: string;
  commit_message: string;
  systemd_active: boolean | null;
  main_pid: number | null;
  uptime_sec: number | null;
}

export interface McVnextOverviewPayload {
  ok: true;
  schema_version: McVnextSchemaVersion;
  generated_at: string;
  top: McVnextOverviewTopBlock;
  alerts_24h: { critical: number; warnings: number };
  acceptance_status: { label: string; detail: string };
  /** CARD-MC-15: system history から要約（/api/mc/vnext/history と同期）。 */
  history_summary?: {
    latest_passed_card: string | null;
    latest_passed_card_id: string | null;
    current_open_gap_count: number;
    last_verified_at: string | null;
    ledger_row_count: number;
  };
  route_health: { ok: boolean; response_ms: number };
  memory_health: {
    memory_total_gb: number | null;
    memory_available_gb: number | null;
    placeholder?: boolean;
  };
  dialogue_quality_summary: {
    routing_observations: number;
    dialogue_quality_score: number | null;
    note: string;
  };
  provider_model_summary: { items: Array<{ label: string; value: string }>; note: string };
  /** live = 直近再現中（partition）、archived = 24h 内だが live 窓外の履歴寄り（CARD-MC-14）。 */
  failing_threads_live?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  failing_threads_archived_count?: number;
  failing_threads_archived_preview?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  /** MC vNext append-only ledgers (last 24h row counts). */
  ledger_24h?: {
    route_rows: number;
    llm_rows: number;
    memory_rows: number;
    quality_rows: number;
    truncation_suspect: number;
  };
  /** CARD-MC-09: Runtime health summary with meaning. */
  runtime_summary?: {
    head_sha_short: string;
    branch: string;
    head_subject: string;
    hostname: string | null;
    service_active: boolean | null;
    uptime_sec: number | null;
    note: string;
  };
  /** CARD-MC-09: Quality short verdict. */
  quality_summary?: {
    sample_count: number;
    truncation_suspect_rate: number | null;
    natural_end_rate: number | null;
    avg_length: number | null;
    verdict_short: string;
  };
  /** CARD-MC-09: Continuation health. */
  continuation_summary?: {
    follow_up_turns_24h: number;
    non_empty_follow_up_24h: number;
    follow_up_success_rate: number | null;
    continuation_success_live?: number | null;
    continuation_success_all_time?: number | null;
    persist_success_live?: number | null;
    persist_success_all_time?: number | null;
    memory_hit_rate: number | null;
    memory_hit_live?: number | null;
    memory_hit_all_time?: number | null;
    conversation_log_hit_live?: number | null;
    conversation_log_hit_all_time?: number | null;
    /** CARD-MC-09C: turn_index>=1 に限定した真の継承品質（24h）。 */
    continuation_memory_hit_live?: number | null;
    /** CARD-MC-09C: turn_index>=1 に限定した真の継承品質（全期間）。 */
    continuation_memory_hit_all_time?: number | null;
    /** CARD-MC-09C: turn_index>=1 の MEMORY_READ サンプル数（24h）。 */
    continuation_sample_count_live?: number;
    /** CARD-MC-09C: turn_index>=1 の MEMORY_READ サンプル数（全期間）。 */
    continuation_sample_count_all_time?: number;
    /** CARD-MC-09C: Turn 0 の miss_reason='never_persisted' 率（正常性指標、24h）。 */
    turn0_never_persisted_rate?: number | null;
    /** CARD-MC-09C: Turn 0 の MEMORY_READ サンプル数（24h）。 */
    turn0_sample_count_live?: number;
    metrics_window_note?: string;
    verdict_short: string;
    /** CARD-MC-09C: continuation 継承 / turn0 正常性を分離表示する short verdict。 */
    verdict_short_v2?: string;
  };
  /** CARD-MC-09: Route of truth. */
  route_summary?: {
    top_route_reason: string;
    top_route_share: number;
    verdict_short: string;
  };
  /** CARD-MC-09: Latest acceptance verdict (PASS/WATCH/FAIL). */
  latest_acceptance?: {
    status: string;
    verdict: string;
    reasons: string[];
    passed: string[];
    missingProof: string[];
    checks: Array<{ id: string; label: string; status: string; detail: string; affected_layer: string }>;
    nextRecommendedCard: string;
    why_now?: string;
    live_problematic_thread_count?: number;
    archived_problematic_thread_count?: number;
    top_affected_layer: string;
    lastVerifiedAt: string;
  };
  /** CARD-MC-09: Alerts summary + top items. */
  active_alerts_summary?: {
    crit: number;
    high: number;
    med: number;
    low: number;
    total: number;
    top: Array<{ severity: string; category: string; message: string; hint: string }>;
  };
  /** CARD-MC-09: Canonical source summary. */
  canonical_sources_summary?: {
    canonical_count: number;
    mirror_count: number;
    backup_count: number;
    derived_count: number;
    graph_edge_count: number;
    canonical: Array<{ id: string; source_name: string; source_uri: string; source_kind: string }>;
    verdict_short: string;
  };
  /** CARD-MC-09: Threads that failed acceptance indicators (last 24h). */
  problematic_threads?: Array<{
    thread_id: string;
    turn_index: number | null;
    request_id: string;
    reason: string;
    detail: string;
    last_ts: string;
    final_len: number | null;
    route_reason: string;
  }>;
  /** CARD-MC-09: Canonical navigation from the hub. */
  nav?: {
    thread_latest: string;
    thread_latest_link: string;
    quality: string;
    alerts: string;
    acceptance: string;
    sources: string;
    history?: string;
    classic: string;
  };
}

export interface McVnextSkeletonSection {
  ok: true;
  schema_version: McVnextSchemaVersion;
  generated_at: string;
  section: string;
  title: string;
  body: string;
  placeholders: Record<string, string | number | boolean | null>;
  /** Optional structured reads (e.g. thread ledgers). */
  ledgers?: Record<string, unknown>;
  diagnostic?: Record<string, unknown>;
  thread_trace?: Record<string, unknown>;
  circuit?: Record<string, unknown>;
  recent_quality?: Record<string, unknown>[];
  alerts_aggregate?: Record<string, number>;
  /** Analyzer / acceptance (CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1) */
  analyzer?: Record<string, unknown>;
  alerts_preview?: Record<string, unknown>[];
  acceptance_summary?: Record<string, unknown>;
  alerts?: Record<string, unknown>[];
  commit_quality_panel?: Record<string, unknown>;
  /** CARD-MC-08B-V2: thread payload 用 turn 別集計（top-level）。 */
  turns?: Record<string, unknown>[];
  /** CARD-MC-08B-V2: thread payload 用 overall サマリ（top-level）。 */
  overall?: Record<string, unknown> | null;
}
