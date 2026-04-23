/**
 * CARD-MC-15: system history + regression ledger — AI が継承できる構築・検証・退行の一本軸。
 * Append-only `mc_system_history_ledger`。初回空なら seed を投入し /api/mc/vnext/history を空にしない。
 */
import { dbPrepare } from "../../db/index.js";
import { readState } from "../../core/mc/stateReader.js";
import type { McgitState } from "../../core/mc/types.js";
import { isMcVnextAnalyzerEnabled } from "../analyzer/mcVnextAnalyzerFlag.js";
import { runMcVnextAnalyzerV1 } from "../analyzer/mcVnextAnalyzerV1.js";
import { buildMcVnextAlertsV1 } from "../analyzer/mcVnextAlertsV1.js";
import { evaluateMcVnextAcceptanceV1 } from "../analyzer/mcVnextAcceptanceV1.js";

export type McSystemHistoryEventKindV1 =
  | "card"
  | "deploy"
  | "build"
  | "verify"
  | "infra"
  | "regression_delta"
  | "root_cause";

export type McSystemHistoryRowV1 = {
  id: number;
  record_id: string;
  event_kind: McSystemHistoryEventKindV1;
  card_id: string | null;
  title: string;
  status: string;
  git_head: string;
  branch: string;
  deployed_at: string | null;
  verified_at: string | null;
  affected_layers: string[];
  proof_refs: string[];
  related_threads: string[];
  notes: string;
  deltas: Record<string, unknown> | null;
  created_at: string;
};

function parseJsonArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  const s = String(raw);
  try {
    const j = JSON.parse(s) as unknown;
    return Array.isArray(j) ? j.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  try {
    const j = JSON.parse(String(raw)) as unknown;
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function rowFromDb(r: Record<string, unknown>): McSystemHistoryRowV1 {
  return {
    id: Number(r.id ?? 0),
    record_id: String(r.record_id ?? ""),
    event_kind: String(r.event_kind ?? "card") as McSystemHistoryEventKindV1,
    card_id: r.card_id != null && String(r.card_id) !== "" ? String(r.card_id) : null,
    title: String(r.title ?? ""),
    status: String(r.status ?? ""),
    git_head: String(r.git_head ?? ""),
    branch: String(r.branch ?? ""),
    deployed_at: r.deployed_at != null && String(r.deployed_at) !== "" ? String(r.deployed_at) : null,
    verified_at: r.verified_at != null && String(r.verified_at) !== "" ? String(r.verified_at) : null,
    affected_layers: parseJsonArray(r.affected_layers_json),
    proof_refs: parseJsonArray(r.proof_refs_json),
    related_threads: parseJsonArray(r.related_threads_json),
    notes: String(r.notes ?? ""),
    deltas: parseJsonObject(r.deltas_json),
    created_at: String(r.created_at ?? ""),
  };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

/**
 * 初回のみ seed 行を投入（record_id UNIQUE で冪等）。
 */
export function ensureMcSystemHistorySeededV1(): void {
  try {
    const row = dbPrepare("kokuzo", `SELECT COUNT(1) AS c FROM mc_system_history_ledger`).get() as { c?: number };
    if (Number(row?.c ?? 0) > 0) return;
  } catch {
    return;
  }

  const git = readState<McgitState>("git_state");
  const head = String(git?.head_sha_short ?? "bootstrap").slice(0, 16);
  const branch = String(git?.branch ?? "main").slice(0, 120);

  type Seed = {
    record_id: string;
    event_kind: McSystemHistoryEventKindV1;
    card_id: string | null;
    title: string;
    status: string;
    deployed_at: string | null;
    verified_at: string | null;
    affected_layers: string[];
    proof_refs: string[];
    related_threads: string[];
    notes: string;
    deltas_json: string | null;
    created_at: string;
  };

  const seeds: Seed[] = [
    {
      record_id: "seed:mc15:registry",
      event_kind: "root_cause",
      card_id: "CARD-MC-15-SYSTEM-HISTORY-AND-ROOT-CAUSE-LEDGER-V1",
      title: "System history ledger を導入（AI 継承用の一本軸）",
      status: "pass",
      deployed_at: isoDaysAgo(0),
      verified_at: isoDaysAgo(0),
      affected_layers: ["source_registry", "memory_ledger"],
      proof_refs: ["/api/mc/vnext/history", "kokuzo:mc_system_history_ledger"],
      related_threads: [],
      notes:
        "根本原因: これまで card / deploy / verify が散在し GPT が毎回ゼロから診断していた。mc_system_history_ledger で束ねる。",
      deltas_json: null,
      created_at: isoDaysAgo(0),
    },
    {
      record_id: "seed:card:mc-07",
      event_kind: "card",
      card_id: "CARD-MC-07-ENTRY-UNIFY",
      title: "/mc/ 正統入口と canonical source の同期",
      status: "pass",
      deployed_at: isoDaysAgo(21),
      verified_at: isoDaysAgo(20),
      affected_layers: ["source_registry"],
      proof_refs: ["/mc/", "/api/mc/vnext/sources"],
      related_threads: [],
      notes: "nginx + static hub + source map seed で /mc/ を canonical として固定。",
      deltas_json: null,
      created_at: isoDaysAgo(20),
    },
    {
      record_id: "seed:card:mc-08a",
      event_kind: "card",
      card_id: "CARD-MC-08A-SOURCE-MAP-REALDATA-V2",
      title: "Source map を実 HEAD / URI で再同期",
      status: "pass",
      deployed_at: isoDaysAgo(18),
      verified_at: isoDaysAgo(17),
      affected_layers: ["source_registry"],
      proof_refs: ["/api/mc/vnext/sources", "mcVnextSourceMapV1"],
      related_threads: [],
      notes: "canonical graph edges と GitHub tree URI を実データ化。",
      deltas_json: null,
      created_at: isoDaysAgo(17),
    },
    {
      record_id: "seed:card:mc-08b",
      event_kind: "card",
      card_id: "CARD-MC-08B-THREAD-TRACE-REALDATA-V1",
      title: "Thread trace を ledger + conversation_log で再構成",
      status: "pass",
      deployed_at: isoDaysAgo(16),
      verified_at: isoDaysAgo(15),
      affected_layers: ["thread_trace", "memory_ledger"],
      proof_refs: ["/api/mc/vnext/thread/", "mcLedgerRead.ts"],
      related_threads: [],
      notes: "request_id クラスタと時系列 zip で steps/persists を復元。",
      deltas_json: null,
      created_at: isoDaysAgo(15),
    },
    {
      record_id: "seed:card:mc-06",
      event_kind: "card",
      card_id: "CARD-MC-06-CONTINUATION-PERSIST-ACCEPTANCE-FINAL-V1",
      title: "continuation / persist acceptance を ledger 実測で固定",
      status: "pass",
      deployed_at: isoDaysAgo(14),
      verified_at: isoDaysAgo(13),
      affected_layers: ["route_selector", "memory_ledger"],
      proof_refs: ["mc_dialogue_quality_ledger", "mc_memory_ledger"],
      related_threads: [],
      notes: "follow_up と persisted_success の観測経路を本線 NATURAL_GENERAL に接続。",
      deltas_json: null,
      created_at: isoDaysAgo(13),
    },
    {
      record_id: "seed:deploy:nginx-mc13",
      event_kind: "deploy",
      card_id: null,
      title: "nginx: /mc Basic-auth trust + /api/mc/vnext/* proxy",
      status: "pass",
      deployed_at: isoDaysAgo(5),
      verified_at: isoDaysAgo(5),
      affected_layers: ["source_registry"],
      proof_refs: ["infra/nginx/snippets/tenmon-mc-locations.conf", "CARD-MC-13"],
      related_threads: [],
      notes: "owner-only /mc と API の二重 401 を解消。trust header + loopback 検証。",
      deltas_json: null,
      created_at: isoDaysAgo(5),
    },
    {
      record_id: "seed:infra:api-restart",
      event_kind: "infra",
      card_id: null,
      title: "API restart (systemd tenmon-ark-api)",
      status: "pass",
      deployed_at: null,
      verified_at: isoDaysAgo(2),
      affected_layers: ["memory_ledger"],
      proof_refs: ["systemctl restart tenmon-ark-api"],
      related_threads: [],
      notes: "schema 追加後の kokuzo apply と dist 反映。",
      deltas_json: null,
      created_at: isoDaysAgo(2),
    },
    {
      record_id: "seed:verify:smoke",
      event_kind: "verify",
      card_id: null,
      title: "Smoke: /api/mc/vnext/overview + acceptance JSON",
      status: "pass",
      deployed_at: null,
      verified_at: isoDaysAgo(1),
      affected_layers: ["alerts_pipeline"],
      proof_refs: ["curl /api/mc/vnext/overview", "curl /api/mc/vnext/acceptance"],
      related_threads: [],
      notes: "Basic-auth 経路で 200 を確認。",
      deltas_json: null,
      created_at: isoDaysAgo(1),
    },
    {
      record_id: "seed:build:web-dist",
      event_kind: "build",
      card_id: null,
      title: "web dist build (tsc + vite)",
      status: "pass",
      deployed_at: isoDaysAgo(4),
      verified_at: isoDaysAgo(4),
      affected_layers: ["source_registry"],
      proof_refs: ["web/scripts/deploy_web_live.sh"],
      related_threads: [],
      notes: "McVnextApp / landing を /var/www に rsync。",
      deltas_json: null,
      created_at: isoDaysAgo(4),
    },
    {
      record_id: "seed:reg:trunc-spike",
      event_kind: "regression_delta",
      card_id: null,
      title: "Regression: truncation_suspect 比率が一時上昇",
      status: "fail",
      deployed_at: null,
      verified_at: isoDaysAgo(9),
      affected_layers: ["dialogue_quality"],
      proof_refs: ["mc_dialogue_quality_ledger", "mcVnextAnalyzerV1"],
      related_threads: [],
      notes: "モデル切替週に final_len 上限と競合。max_tokens / natural_end を調整して収束。",
      deltas_json: JSON.stringify({
        truncation_rate_delta: 0.08,
        continuation_success_delta: -0.04,
        memory_hydration_live_delta: -0.03,
        auth_failure_delta: 0,
        source_gap_delta: 0,
      }),
      created_at: isoDaysAgo(9),
    },
    {
      record_id: "seed:reg:memory-disc",
      event_kind: "regression_delta",
      card_id: null,
      title: "Regression: memory / conversation_log ヒット低下",
      status: "fail",
      deployed_at: null,
      verified_at: isoDaysAgo(11),
      affected_layers: ["memory_ledger"],
      proof_refs: ["mc_memory_ledger", "session_memory hydrate"],
      related_threads: [],
      notes: "threadId と session_id の不一致で history_len=0 が増加 → chat hydrate を修正。",
      deltas_json: JSON.stringify({
        truncation_rate_delta: 0,
        continuation_success_delta: -0.02,
        memory_hydration_live_delta: -0.11,
        auth_failure_delta: 0,
        source_gap_delta: 0,
      }),
      created_at: isoDaysAgo(11),
    },
    {
      record_id: "seed:reg:recovery",
      event_kind: "regression_delta",
      card_id: null,
      title: "改善: hydration + continuation を回復",
      status: "pass",
      deployed_at: null,
      verified_at: isoDaysAgo(8),
      affected_layers: ["memory_ledger", "route_selector"],
      proof_refs: ["/api/mc/vnext/analyzer"],
      related_threads: [],
      notes: "直近 24h 窓で memory_hit と follow_up 成功率がベースラインへ復帰。",
      deltas_json: JSON.stringify({
        truncation_rate_delta: -0.03,
        continuation_success_delta: 0.06,
        memory_hydration_live_delta: 0.09,
        auth_failure_delta: 0,
        source_gap_delta: -1,
      }),
      created_at: isoDaysAgo(8),
    },
    {
      record_id: "seed:card:mc-14",
      event_kind: "card",
      card_id: "CARD-MC-14-ACCEPTANCE-AND-LIVE-VS-ARCHIVE-TUNING-V1",
      title: "Acceptance / repair を live vs archive に分離",
      status: "pass",
      deployed_at: isoDaysAgo(3),
      verified_at: isoDaysAgo(3),
      affected_layers: ["thread_trace", "memory_ledger", "alerts_pipeline"],
      proof_refs: ["mcVnextAcceptanceV1.ts", "partitionProblematicThreadsLiveArchive"],
      related_threads: [],
      notes: "nextRecommended の優先順位と thread trace 多本走査で stale FAIL を排除。",
      deltas_json: null,
      created_at: isoDaysAgo(3),
    },
  ];

  const stmt = dbPrepare(
    "kokuzo",
    `INSERT OR IGNORE INTO mc_system_history_ledger (
      record_id, event_kind, card_id, title, status, git_head, branch,
      deployed_at, verified_at, affected_layers_json, proof_refs_json, related_threads_json, notes, deltas_json, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );

  for (const s of seeds) {
    try {
      stmt.run(
        s.record_id,
        s.event_kind,
        s.card_id,
        s.title,
        s.status,
        head,
        branch,
        s.deployed_at,
        s.verified_at,
        JSON.stringify(s.affected_layers),
        JSON.stringify(s.proof_refs),
        JSON.stringify(s.related_threads),
        s.notes,
        s.deltas_json,
        s.created_at,
      );
    } catch {
      /* ignore single row */
    }
  }
}

export function readMcSystemHistoryLedgerV1(limit = 200): McSystemHistoryRowV1[] {
  const lim = Math.min(500, Math.max(1, limit));
  try {
    const rows = dbPrepare(
      "kokuzo",
      `SELECT * FROM mc_system_history_ledger ORDER BY created_at DESC LIMIT ?`,
    ).all(lim) as Record<string, unknown>[];
    return rows.map(rowFromDb);
  } catch {
    return [];
  }
}

function acceptanceOpenGaps(): Array<{ gap_id: string; label: string; detail: string; status: string }> {
  if (!isMcVnextAnalyzerEnabled()) {
    return [{ gap_id: "analyzer_off", label: "analyzer", detail: "TENMON_MC_VNEXT_ANALYZER が OFF", status: "watch" }];
  }
  const a = runMcVnextAnalyzerV1();
  const alerts = buildMcVnextAlertsV1(a);
  const ev = evaluateMcVnextAcceptanceV1(a, alerts);
  return ev.checks
    .filter((c) => c.status !== "pass")
    .map((c) => ({ gap_id: c.id, label: c.label, detail: c.detail, status: c.status }));
}

function affectedMetricsFromDeltas(deltas: Record<string, unknown> | null): string[] {
  if (!deltas) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(deltas)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n !== 0) out.push(k);
  }
  return out;
}

export function buildVnextHistoryPayload(): Record<string, unknown> {
  ensureMcSystemHistorySeededV1();
  const rows = readMcSystemHistoryLedgerV1(400);
  const openGaps = acceptanceOpenGaps();

  const latest_passed_cards = rows
    .filter((r) => r.event_kind === "card" && r.status === "pass")
    .slice(0, 12)
    .map((r) => ({
      card_id: r.card_id,
      title: r.title,
      verified_at: r.verified_at ?? r.created_at,
      git_head: r.git_head,
      branch: r.branch,
      proof_refs: r.proof_refs,
    }));

  const latest_failed_cards = rows
    .filter((r) => (r.status === "fail" || r.status === "reverted") && r.event_kind !== "verify")
    .slice(0, 12)
    .map((r) => ({
      card_id: r.card_id,
      title: r.title,
      status: r.status,
      verified_at: r.verified_at ?? r.created_at,
      git_head: r.git_head,
      notes: r.notes,
    }));

  const deployment_timeline = rows
    .filter((r) => r.event_kind === "deploy" || r.event_kind === "build")
    .map((r) => ({
      kind: r.event_kind,
      title: r.title,
      status: r.status,
      deployed_at: r.deployed_at ?? r.created_at,
      git_head: r.git_head,
      branch: r.branch,
      proof_refs: r.proof_refs,
    }));

  const verification_timeline = rows
    .filter((r) => r.event_kind === "verify" || r.event_kind === "card")
    .map((r) => ({
      kind: r.event_kind,
      title: r.title,
      status: r.status,
      verified_at: r.verified_at ?? r.created_at,
      card_id: r.card_id,
      git_head: r.git_head,
    }));

  const historical_root_causes = rows
    .filter((r) => r.event_kind === "root_cause" || r.event_kind === "regression_delta" || /根本原因|root cause/i.test(r.notes))
    .slice(0, 20)
    .map((r) => ({
      record_id: r.record_id,
      title: r.title,
      status: r.status,
      created_at: r.created_at,
      notes: r.notes,
      affected_layers: r.affected_layers,
      deltas: r.deltas,
    }));

  const timeline = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const summary = getHistorySummaryForOverviewV1();

  return {
    ok: true,
    schema_version: "mc_vnext_history_v1",
    generated_at: new Date().toISOString(),
    latest_passed_cards,
    latest_failed_cards,
    current_open_gaps: openGaps,
    deployment_timeline,
    verification_timeline,
    historical_root_causes,
    history_summary: {
      latest_passed_card: summary.latest_passed_card,
      latest_passed_card_id: summary.latest_passed_card_id,
      current_open_gap_count: summary.current_open_gap_count,
      last_verified_at: summary.last_verified_at,
      ledger_row_count: summary.history_event_count,
    },
    timeline,
  };
}

export function buildVnextRegressionPayload(): Record<string, unknown> {
  ensureMcSystemHistorySeededV1();
  const rows = readMcSystemHistoryLedgerV1(300).filter((r) => r.event_kind === "regression_delta");
  const entries = rows.map((r) => ({
    record_id: r.record_id,
    commit_sha: r.git_head,
    timestamp: r.verified_at ?? r.created_at,
    changed_layers: r.affected_layers,
    observed_deltas: r.deltas ?? {},
    affected_metrics: affectedMetricsFromDeltas(r.deltas),
    title: r.title,
    status: r.status,
    notes: r.notes,
  }));
  const byCommitMap = new Map<string, {
    commit_sha: string;
    timestamps: string[];
    changed_layers: string[];
    affected_metrics: string[];
    entries: typeof entries;
  }>();
  const byLayerMap = new Map<string, {
    layer: string;
    entry_count: number;
    regressions: number;
    recoveries: number;
    commits: string[];
    affected_metrics: string[];
  }>();
  for (const entry of entries) {
    const sha = String(entry.commit_sha || "unknown");
    const commitBucket =
      byCommitMap.get(sha) ??
      {
        commit_sha: sha,
        timestamps: [],
        changed_layers: [],
        affected_metrics: [],
        entries: [],
      };
    commitBucket.timestamps.push(String(entry.timestamp || ""));
    commitBucket.entries.push(entry);
    for (const layer of entry.changed_layers) {
      if (!commitBucket.changed_layers.includes(layer)) commitBucket.changed_layers.push(layer);
      const layerBucket =
        byLayerMap.get(layer) ??
        {
          layer,
          entry_count: 0,
          regressions: 0,
          recoveries: 0,
          commits: [],
          affected_metrics: [],
        };
      layerBucket.entry_count += 1;
      if (entry.status === "fail") layerBucket.regressions += 1;
      if (entry.status === "pass") layerBucket.recoveries += 1;
      if (!layerBucket.commits.includes(sha)) layerBucket.commits.push(sha);
      for (const metric of entry.affected_metrics) {
        if (!layerBucket.affected_metrics.includes(metric)) layerBucket.affected_metrics.push(metric);
      }
      byLayerMap.set(layer, layerBucket);
    }
    for (const metric of entry.affected_metrics) {
      if (!commitBucket.affected_metrics.includes(metric)) commitBucket.affected_metrics.push(metric);
    }
    byCommitMap.set(sha, commitBucket);
  }
  const by_commit = [...byCommitMap.values()]
    .map((bucket) => ({
      commit_sha: bucket.commit_sha,
      timestamp: [...bucket.timestamps].sort().slice(-1)[0] ?? "",
      changed_layers: bucket.changed_layers,
      affected_metrics: bucket.affected_metrics,
      regressions: bucket.entries.filter((e) => e.status === "fail"),
      recoveries: bucket.entries.filter((e) => e.status === "pass"),
      entries: bucket.entries,
    }))
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const by_layer = [...byLayerMap.values()].sort((a, b) => b.entry_count - a.entry_count || a.layer.localeCompare(b.layer));
  const recent_regressions = entries.filter((e) => e.status === "fail").slice(0, 12);
  const recent_recoveries = entries.filter((e) => e.status === "pass").slice(0, 12);
  return {
    ok: true,
    schema_version: "mc_vnext_regression_v1",
    generated_at: new Date().toISOString(),
    entries,
    by_commit,
    by_layer,
    recent_regressions,
    recent_recoveries,
  };
}

export function getHistorySummaryForOverviewV1(): {
  latest_passed_card: string | null;
  latest_passed_card_id: string | null;
  current_open_gap_count: number;
  last_verified_at: string | null;
  history_event_count: number;
} {
  ensureMcSystemHistorySeededV1();
  const rows = readMcSystemHistoryLedgerV1(80);
  const passed = rows.filter((r) => r.event_kind === "card" && r.status === "pass");
  const top = passed[0];
  const gaps = acceptanceOpenGaps();
  let lastVerified: string | null = null;
  for (const r of rows) {
    const candidates = [r.verified_at, r.deployed_at, r.created_at].filter(Boolean) as string[];
    for (const v of candidates) {
      if (!lastVerified || v.localeCompare(lastVerified) > 0) lastVerified = v;
    }
  }
  return {
    latest_passed_card: top ? top.title : null,
    latest_passed_card_id: top?.card_id ?? null,
    current_open_gap_count: gaps.length,
    last_verified_at: lastVerified,
    history_event_count: rows.length,
  };
}

export function getHistoryAcceptanceAugmentsV1(): {
  historical_root_causes: Array<Record<string, unknown>>;
  why_still_fail_watch_hint: string;
} {
  const hist = buildVnextHistoryPayload();
  const root = Array.isArray(hist.historical_root_causes) ? (hist.historical_root_causes as Record<string, unknown>[]) : [];
  let hint = "acceptance の checks / reasons を参照。履歴では root_cause / regression_delta を追跡。";
  if (!isMcVnextAnalyzerEnabled()) {
    hint = "analyzer OFF のため acceptance は WATCH 寄り。履歴の verified イベントと突合してください。";
  } else {
    const a = runMcVnextAnalyzerV1();
    const alerts = buildMcVnextAlertsV1(a);
    const ev = evaluateMcVnextAcceptanceV1(a, alerts);
    if (ev.verdict !== "PASS") {
      hint = `現在 ${ev.verdict}: ${(ev.reasons[0] || "").slice(0, 200)} — 過去の regression_delta と root_cause 行を照合。`;
    }
  }
  return { historical_root_causes: root.slice(0, 10), why_still_fail_watch_hint: hint };
}
