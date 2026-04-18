// api/src/core/mc/types.ts
// MC V2 FINAL — §6 TypeScript 型定義

// ── 共通フィールド ──────────────────────────────────────
export interface McBase {
  generated_at: string;          // ISO 8601
  source_files: string[];
  stale: boolean;
  freshness?: 'fresh' | 'stale';
}

// ── Overview ────────────────────────────────────────────
export interface McOverview extends McBase {
  service: {
    name: string;
    status: string;
    uptime_sec: number | null;
  };
  health: {
    ok: boolean;
    endpoint: string;
    response_ms: number;
  };
  git: {
    branch: string;
    head_sha_short: string;
    last_commit_at: string;
    last_commit_subject: string;
    dirty: boolean;
  };
  state: {
    critical_blockers: number;
    warnings: number;
    contradictions_count: number;
  };
  freshness_detail: {
    last_collector_run: Record<string, string>;
    last_notion_sync: string | null;
    last_ai_handoff_build: string | null;
  };
  links: Record<string, string>;
}

// ── AI Handoff ──────────────────────────────────────────
export interface McAiHandoff extends McBase {
  version: 'v1';
  identity: {
    project: 'TENMON-ARK';
    definition: string;
    founder: string;
    founder_aliases: string[];
  };
  canonical_runtime: {
    git_sha: string;
    branch: string;
    service: string;
    repo_root: string;
    data_root: string;
  };
  soul_root: {
    status: string;
    iroha_paragraphs: number;
    genten_sounds: number;
    amaterasu_anchors: number;
    bind_status: Record<string, boolean>;
  };
  start_here_quickstart: string[];
  do_not_touch: string[];
  known_issues: McIssueItem[];
  open_tasks_from_notion: number;
}

// ── Live State ──────────────────────────────────────────
export interface McLiveState extends McBase {
  host: {
    hostname: string;
    public_ip: string;
    os: string;
  };
  service: {
    name: string;
    active: boolean;
    substate: string;
    main_pid: number;
    uptime_sec: number | null;
  };
  health: {
    ok: boolean;
    endpoint: string;
    response_ms: number;
    raw_response_preview: string;
  };
  resources: {
    disk: Array<{
      path: string;
      used_gb: number;
      free_gb: number;
      percent: number;
    }>;
    memory_total_gb: number;
    memory_available_gb: number;
    swap_gb: number;
    load_avg: number[];
  };
  timers: Array<{
    name: string;
    last: string;
    next: string;
    active: boolean;
  }>;
  recent_errors: Array<{
    timestamp: string;
    message_preview: string;
  }>;
  recent_warnings: Array<{
    timestamp: string;
    message_preview: string;
  }>;
  model_usage_1h: Record<string, number>;
  soul_root_activity_1h: Record<string, number>;
  llm_primary_failures_1h: number;
}

// ── Git State ───────────────────────────────────────────
export interface McgitState extends McBase {
  branch: string;
  head_sha: string;
  head_sha_short: string;
  head_subject: string;
  head_date: string;
  head_author: string;
  dirty: boolean;
  untracked_count: number;
  modified_count: number;
  recent_commits: Array<{
    sha: string;
    subject: string;
    author: string;
    date: string;
  }>;
  recent_tags: Array<{
    name: string;
    date: string;
    sha: string;
  }>;
  reflog: string[];
  stats: {
    repo_size_mb: number;
    total_commits: number;
    commits_7d: number;
    contributors: number;
  };
}

// ── DB Status ───────────────────────────────────────────
export interface McDbStatus extends McBase {
  databases: Array<{
    name: string;
    path: string;
    size_mb: number;
    table_count: number;
    top_tables_by_size: Array<{ name: string; size_kb: number }>;
    top_tables_by_rows: Array<{ name: string; rows: number }>;
  }>;
  sacred_corpus: {
    corpus_count: number;
    segment_count: number;
  };
  activity_24h: {
    conversation_log_count: number;
    evolution_ledger_count: number;
    growth_seeds_count: number;
  };
  fts_health: {
    kokuzo_pages_fts_indexed: number;
  };
}

// ── Security Audit ──────────────────────────────────────
export interface McSecurityAudit extends McBase {
  env_file_locations: string[];
  env_vars_set: string[];
  systemd_environment_keys: string[];
  secrets_present: Record<string, boolean>;
  leaks_found_in_json: Array<{
    file: string;
    pattern_matched: string;
    action_taken: string;
  }>;
  rotation_status: Array<{
    key: string;
    last_rotated: string | null;
    age_days: number | null;
  }>;
}

// ── VPS Assets ──────────────────────────────────────────
export interface McVpsAssets extends McBase {
  directories: Array<{
    path: string;
    size_mb: number;
    file_count: number;
  }>;
  systemd_services: Array<{
    name: string;
    active: boolean;
    enabled: boolean;
  }>;
  cron_jobs: string[];
  nginx_sites: string[];
}

// ── Runtime Logs ────────────────────────────────────────
export interface McRuntimeLogs extends McBase {
  recent_entries: Array<{
    timestamp: string;
    level: string;
    message_preview: string;
  }>;
  error_count_1h: number;
  warning_count_1h: number;
}

// ── Truth Circuit ───────────────────────────────────────
export interface McTruthCircuit extends McBase {
  canon_documents: Array<{
    name: string;
    path: string;
    sha256: string;
    last_modified: string;
  }>;
  live_vs_canon: Array<{
    field: string;
    canon_value: string;
    live_value: string;
    match: boolean;
  }>;
}

// ── Issues ──────────────────────────────────────────────
export interface McIssues extends McBase {
  items: McIssueItem[];
}

export interface McIssueItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  detail: string;
  source: string;
  detected_at: string;
  resolved: boolean;
  resolved_at?: string;
}

// ── Contradictions ──────────────────────────────────────
export interface McContradictions extends McBase {
  items: Array<{
    id: string;
    field: string;
    source_references: Array<{
      source: string;
      value: any;
      location: string;
    }>;
    resolution: {
      status: string;
      winning_value: any;
      reason: string;
      resolved_at: string;
    };
  }>;
}

// ── Notion Sync ─────────────────────────────────────────
export interface McNotionSync extends McBase {
  source: 'notion';
  dbs: Array<{
    name: string;
    db_id: string;
    last_synced_at: string;
    record_count: number;
    open_tasks: number;
    blocked_tasks: number;
  }>;
  task_queue: Array<{
    id: string;
    title: string;
    status: string | null;
    priority: string | null;
    owner: string | null;
    updated_at: string;
    blocked: boolean;
  }>;
}

// ── Handoff (Markdown) ──────────────────────────────────
export interface McHandoff {
  markdown: string;
  generated_at: string;
  source: string;
}
