/**
 * MC vNext acceptance — PASS / WATCH / FAIL を実データで下す裁定器。
 * CARD-MC-10-ACCEPTANCE-VERDICT-TUNING-V1
 *
 * 7 本の signal:
 *   1. canonical_path        — /mc/ 正統パスと canonical source が揃っているか
 *   2. ledger_flowing        — route / llm / memory / quality の 24h ledger が書かれているか
 *   3. continuation_healthy  — follow_up の成功率が閾値を超えているか
 *   4. persist_healthy       — finalize 済み turn が memory_ledger.persisted_success=1 を伴っているか
 *   5. thread_trace_healthy  — 直近スレッドの trace が 2 turn 以上・persist 付きで再構成できるか
 *   6. sources_populated     — source registry に canonical と graph edge が十分あるか
 *   7. alerts_below_critical — CRIT=0 かつ HIGH<=1
 */
import type { McVnextAnalyzerSnapshotV1 } from "./mcVnextAnalyzerV1.js";
import type { McVnextAlertItemV1 } from "./mcVnextAlertsV1.js";
import { isMcVnextAnalyzerEnabled } from "./mcVnextAnalyzerFlag.js";
import {
  readLatestMcThreadIdV1,
  readMcOverviewCountersV1,
  partitionProblematicThreadsLiveArchive,
  readMcProblematicThreadsV1,
  readMcThreadTraceV1,
  type McProblematicThreadV1,
} from "../ledger/mcLedgerRead.js";
import { buildMcSourceRegistryV1 } from "../mcVnextSourceMapV1.js";

export type McVnextAcceptanceStatusV1 = "PASS" | "FAIL" | "WATCH";
export type McVnextAcceptanceCheckStatusV1 = "pass" | "watch" | "fail";

export type McVnextAcceptanceAffectedLayerV1 =
  | "source_registry"
  | "memory_ledger"
  | "route_selector"
  | "thread_trace"
  | "alerts_pipeline"
  | "git_workspace"
  | "none";

export type McVnextAcceptanceCheckV1 = {
  id:
    | "canonical_path"
    | "ledger_flowing"
    | "continuation_healthy"
    | "persist_healthy"
    | "thread_trace_healthy"
    | "sources_populated"
    | "alerts_below_critical"
    | "continuation_memory_healthy";
  label: string;
  status: McVnextAcceptanceCheckStatusV1;
  detail: string;
  affected_layer: McVnextAcceptanceAffectedLayerV1;
  next_card?: string;
};

export type McVnextAcceptanceResultV1 = {
  schema_version: "mc_vnext_acceptance_v1";
  status: McVnextAcceptanceStatusV1;
  verdict: McVnextAcceptanceStatusV1;
  reasons: string[];
  passed: string[];
  missingProof: string[];
  checks: McVnextAcceptanceCheckV1[];
  nextRecommendedCard: string;
  /** 現在の FAIL/WATCH の要約（1 行・UI 用）。PASS 時は確認済みメッセージ。 */
  why_now: string;
  /** live window 内の problematic 件数（partition 後）。 */
  live_problematic_thread_count: number;
  /** 24h 集計だが live 窓外の履歴寄り件数。 */
  archived_problematic_thread_count: number;
  /** FAIL 時は最優先で直すべき層、WATCH 時は最初に watch した層、PASS 時は "none"。 */
  top_affected_layer: McVnextAcceptanceAffectedLayerV1;
  lastVerifiedAt: string;
};

// --- 閾値（tuning 可能） ---
const T_CONTINUATION_RATE = 0.6;       // 以下で WATCH
const T_CONTINUATION_RATE_FAIL = 0.3;  // 以下で FAIL
const T_MIN_CANONICAL_SOURCES = 3;     // 未満で WATCH
const T_MIN_GRAPH_EDGES = 8;           // 未満で WATCH
const T_MIN_THREAD_STEPS = 2;          // 未満で WATCH
const T_HIGH_ALERTS_WATCH = 2;         // 以上で WATCH
// CARD-MC-09C: 継承メモリヒット率（turn_index>=1）の PASS / FAIL 閾値。
const T_CONTINUATION_MEMORY_HIT_PASS = 0.8;  // 以上で PASS
const T_CONTINUATION_MEMORY_HIT_FAIL = 0.5;  // 未満で FAIL
const T_CONTINUATION_MEMORY_MIN_SAMPLE = 3;  // 未満は WATCH 扱い

/** nextRecommendedCard は severity 優先でこの順に採用（古い thread カードが先頭に来るのを防ぐ）。 */
const NEXT_CARD_PRIORITY: McVnextAcceptanceCheckV1["id"][] = [
  "alerts_below_critical",
  "ledger_flowing",
  "persist_healthy",
  "continuation_memory_healthy",
  "continuation_healthy",
  "thread_trace_healthy",
  "canonical_path",
  "sources_populated",
];

const CARD_BY_CHECK: Record<McVnextAcceptanceCheckV1["id"], string> = {
  canonical_path: "CARD-MC-07-ENTRY-UNIFY: /mc/ 正統パスと canonical source を同期",
  ledger_flowing: "CARD-NEXT-04-LEDGER-REQUEST-PROOF: ledger 書込経路の死活を再点検",
  continuation_healthy: "CARD-MC-06-CONTINUATION-PERSIST-ACCEPTANCE-FINAL-V1: continuation を再整備",
  continuation_memory_healthy:
    "CARD-MC-09C-MEMORY-HIT-METRIC-CORRECTNESS-V1: turn_index>=1 の継承メモリヒット率を追い込む",
  persist_healthy: "CARD-MC-06-CONTINUATION-PERSIST-ACCEPTANCE-FINAL-V1: persist ログを追い込む",
  thread_trace_healthy: "CARD-MC-08B-THREAD-TRACE-REALDATA: trace を実データで再確認",
  sources_populated: "CARD-MC-08A-SOURCE-MAP-REALDATA-V2: canonical source seed を拡充",
  alerts_below_critical: "alerts: CRIT / HIGH を閉じてから再評価",
};

const LAYER_BY_CHECK: Record<McVnextAcceptanceCheckV1["id"], McVnextAcceptanceAffectedLayerV1> = {
  canonical_path: "source_registry",
  ledger_flowing: "memory_ledger",
  continuation_healthy: "route_selector",
  continuation_memory_healthy: "memory_ledger",
  persist_healthy: "memory_ledger",
  thread_trace_healthy: "thread_trace",
  sources_populated: "source_registry",
  alerts_below_critical: "alerts_pipeline",
};

function layerOf(id: McVnextAcceptanceCheckV1["id"]): McVnextAcceptanceAffectedLayerV1 {
  return LAYER_BY_CHECK[id] ?? "none";
}

function hasMcHubEntry(registry: ReturnType<typeof buildMcSourceRegistryV1>): boolean {
  return registry.canonical.some((s) => {
    const uri = String(s.source_uri || "");
    const id = String(s.id || "");
    return /\/mc\/?/.test(uri) || id.includes("mc_hub") || id.includes("mc-landing");
  });
}

function dedupeThreadProbeOrder(latest: string, recent: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [latest, ...recent]) {
    const t = String(id || "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.slice(0, 14);
}

function traceStepsPersist(tid: string): { stepsLen: number; persistCount: number; err: boolean } {
  try {
    const trace = readMcThreadTraceV1(tid, 40) as Record<string, unknown>;
    const steps = Array.isArray(trace.steps) ? (trace.steps as Record<string, unknown>[]) : [];
    let persistCount = 0;
    for (const s of steps) {
      const p = s.persists;
      if (Array.isArray(p) && p.length > 0) persistCount += 1;
    }
    return { stepsLen: steps.length, persistCount, err: false };
  } catch {
    return { stepsLen: 0, persistCount: 0, err: true };
  }
}

function resolveNextRecommendedCard(checks: McVnextAcceptanceCheckV1[], verdict: McVnextAcceptanceStatusV1): string {
  const maintenance = "維持: 週次で ledger / continuation / persist の健全性を再測";
  if (verdict === "PASS") return maintenance;
  const byId = new Map(checks.map((c) => [c.id, c] as [McVnextAcceptanceCheckV1["id"], McVnextAcceptanceCheckV1]));
  for (const id of NEXT_CARD_PRIORITY) {
    const c = byId.get(id);
    if (!c || c.status === "pass" || !c.next_card) continue;
    if (c.status === "fail" || c.status === "watch") return c.next_card;
  }
  return maintenance;
}

function buildWhyNow(verdict: McVnextAcceptanceStatusV1, failWatch: string[], passed: string[]): string {
  if (verdict === "PASS") {
    return passed[0] ? `現在状態: ${passed[0].slice(0, 180)}` : "現在状態: 主要 7 signal はすべて確認済み。";
  }
  const head = failWatch[0];
  return head ? `現在状態: ${head.slice(0, 220)}` : "現在状態: 要確認（詳細は checks を参照）。";
}

/**
 * 個別 check 関数の返却用・内部型。affected_layer は evaluator 側で一括付与する
 * （ルールを一箇所に寄せるため）。
 */
type CheckDraft = Omit<McVnextAcceptanceCheckV1, "affected_layer">;

function worstStatus(a: McVnextAcceptanceCheckStatusV1, b: McVnextAcceptanceCheckStatusV1): McVnextAcceptanceCheckStatusV1 {
  if (a === "fail" || b === "fail") return "fail";
  if (a === "watch" || b === "watch") return "watch";
  return "pass";
}

function composeVerdict(checks: McVnextAcceptanceCheckV1[]): McVnextAcceptanceStatusV1 {
  let worst: McVnextAcceptanceCheckStatusV1 = "pass";
  for (const c of checks) worst = worstStatus(worst, c.status);
  return worst === "fail" ? "FAIL" : worst === "watch" ? "WATCH" : "PASS";
}

// ---- individual checks ----

function checkCanonicalPath(registry: ReturnType<typeof buildMcSourceRegistryV1>): CheckDraft {
  const canonicalCount = registry.canonical.length;
  const hasMcEntry = hasMcHubEntry(registry);
  if (canonicalCount === 0) {
    return {
      id: "canonical_path",
      label: "canonical path",
      status: "fail",
      detail: `canonical source が 0 件（/mc/ を正統パスとして宣言できていない）`,
      next_card: CARD_BY_CHECK.canonical_path,
    };
  }
  /** MC-07 相当: mc_hub 系 canonical が揃い件数が実用ラインなら PASS。 */
  if (hasMcEntry && canonicalCount >= T_MIN_CANONICAL_SOURCES) {
    return {
      id: "canonical_path",
      label: "canonical path",
      status: "pass",
      detail: `canonical ${canonicalCount} 件・/mc/ 正統エントリあり（MC-07 ライン満たす）`,
    };
  }
  if (!hasMcEntry) {
    return {
      id: "canonical_path",
      label: "canonical path",
      status: "watch",
      detail: `canonical=${canonicalCount} 件だが mc_hub / mc-landing 系 canonical が未検出`,
      next_card: CARD_BY_CHECK.canonical_path,
    };
  }
  return {
    id: "canonical_path",
    label: "canonical path",
    status: "watch",
    detail: `canonical=${canonicalCount}（閾値 ${T_MIN_CANONICAL_SOURCES} 件未満）・mc_hub はあり`,
    next_card: CARD_BY_CHECK.canonical_path,
  };
}

function checkLedgerFlowing(analyzer: McVnextAnalyzerSnapshotV1): CheckDraft {
  const r = analyzer.ledger_rows_24h;
  const zeros: string[] = [];
  if (r.route === 0) zeros.push("route");
  if (r.llm === 0) zeros.push("llm");
  if (r.memory === 0) zeros.push("memory");
  if (r.quality === 0) zeros.push("quality");
  if (zeros.length === 4) {
    return {
      id: "ledger_flowing",
      label: "ledger flowing",
      status: "fail",
      detail: "24h で route/llm/memory/quality すべてが 0 行（ledger が止まっている）",
      next_card: CARD_BY_CHECK.ledger_flowing,
    };
  }
  if (zeros.length > 0) {
    return {
      id: "ledger_flowing",
      label: "ledger flowing",
      status: "watch",
      detail: `24h で 0 行の ledger: ${zeros.join(", ")}（残りは route=${r.route} llm=${r.llm} memory=${r.memory} quality=${r.quality}）`,
      next_card: CARD_BY_CHECK.ledger_flowing,
    };
  }
  return {
    id: "ledger_flowing",
    label: "ledger flowing",
    status: "pass",
    detail: `24h: route=${r.route} llm=${r.llm} memory=${r.memory} quality=${r.quality} すべて書込あり`,
  };
}

function checkContinuationHealthy(counters: ReturnType<typeof readMcOverviewCountersV1>): CheckDraft {
  const total = counters.follow_up_turns_24h;
  const ok = counters.non_empty_follow_up_24h;
  if (total === 0) {
    return {
      id: "continuation_healthy",
      label: "continuation healthy",
      status: "watch",
      detail: "24h 内に continuation (follow_up) 発火なし（観測不能・要トラフィック投入）",
      next_card: CARD_BY_CHECK.continuation_healthy,
    };
  }
  const rate = ok / total;
  if (rate < T_CONTINUATION_RATE_FAIL) {
    return {
      id: "continuation_healthy",
      label: "continuation healthy",
      status: "fail",
      detail: `continuation 成功率 ${(rate * 100).toFixed(0)}% (${ok}/${total}) < ${(T_CONTINUATION_RATE_FAIL * 100).toFixed(0)}%`,
      next_card: CARD_BY_CHECK.continuation_healthy,
    };
  }
  if (rate < T_CONTINUATION_RATE) {
    return {
      id: "continuation_healthy",
      label: "continuation healthy",
      status: "watch",
      detail: `continuation 成功率 ${(rate * 100).toFixed(0)}% (${ok}/${total}) < ${(T_CONTINUATION_RATE * 100).toFixed(0)}%`,
      next_card: CARD_BY_CHECK.continuation_healthy,
    };
  }
  return {
    id: "continuation_healthy",
    label: "continuation healthy",
    status: "pass",
    detail: `continuation 成功率 ${(rate * 100).toFixed(0)}% (${ok}/${total}) ・閾値 ${(T_CONTINUATION_RATE * 100).toFixed(0)}% 超`,
  };
}

function checkPersistHealthy(
  analyzer: McVnextAnalyzerSnapshotV1,
  counters: ReturnType<typeof readMcOverviewCountersV1>,
  liveProblematic: McProblematicThreadV1[],
): CheckDraft {
  const totalTurns = counters.persist_total_turns_24h;
  const okTurns = counters.persist_ok_turns_24h;
  const persistFailuresLive = liveProblematic.filter((p) => p.reason === "persist_failure").length;

  if (analyzer.sample_count > 3 && analyzer.persistence.persist_rows_24h === 0) {
    return {
      id: "persist_healthy",
      label: "persist healthy",
      status: "fail",
      detail: `quality sample=${analyzer.sample_count} あるが persist 行=0（persist 完全停止の疑い）`,
      next_card: CARD_BY_CHECK.persist_healthy,
    };
  }
  if (totalTurns === 0) {
    return {
      id: "persist_healthy",
      label: "persist healthy",
      status: "watch",
      detail: "24h 内に persist 対象 turn なし（トラフィック不足で観測不能）",
      next_card: CARD_BY_CHECK.persist_healthy,
    };
  }
  const rate = okTurns / totalTurns;
  /** 履歴上の persist_failure は無視し、live 窓で再現中の件数のみで悪化を判定（CARD-MC-14）。 */
  if (rate >= 0.72 && persistFailuresLive === 0) {
    return {
      id: "persist_healthy",
      label: "persist healthy",
      status: "pass",
      detail: `persist 成功率 ${(rate * 100).toFixed(0)}% (${okTurns}/${totalTurns})・live persist_failure=0`,
    };
  }
  const isFail =
    rate < 0.38 || (persistFailuresLive >= 2 && rate < 0.55) || (persistFailuresLive >= 1 && rate < 0.42);
  return {
    id: "persist_healthy",
    label: "persist healthy",
    status: isFail ? "fail" : "watch",
    detail: `persist 成功率 ${(rate * 100).toFixed(0)}% (${okTurns}/${totalTurns})・live persist_failure=${persistFailuresLive}（24h 履歴は別枠）`,
    next_card: CARD_BY_CHECK.persist_healthy,
  };
}

/**
 * MC-08B: 「最新 1 本だけ」ではなく直近スレッドを走査し、健全な trace が 1 本でも取れれば PASS。
 * 単発テスト thread で全体 FAIL になるのを避ける（CARD-MC-14）。
 */
function checkThreadTraceHealthy(threadCandidates: string[]): CheckDraft {
  if (threadCandidates.length === 0) {
    return {
      id: "thread_trace_healthy",
      label: "thread trace healthy",
      status: "watch",
      detail: "trace 対象 thread が列挙できない（ledger 空に近い）",
      next_card: CARD_BY_CHECK.thread_trace_healthy,
    };
  }
  let anyErr = false;
  let bestWatch: { tid: string; stepsLen: number; persistCount: number } | null = null;
  for (const tid of threadCandidates) {
    const { stepsLen, persistCount, err } = traceStepsPersist(tid);
    if (err) {
      anyErr = true;
      continue;
    }
    if (stepsLen >= T_MIN_THREAD_STEPS && persistCount > 0) {
      return {
        id: "thread_trace_healthy",
        label: "thread trace healthy",
        status: "pass",
        detail: `直近 ${threadCandidates.length} 本走査: ${tid.slice(0, 24)}… で step=${stepsLen} / persist 付 step=${persistCount}（MC-08B ライン）`,
      };
    }
    if (!bestWatch || stepsLen > bestWatch.stepsLen) {
      bestWatch = { tid, stepsLen, persistCount };
    }
  }
  if (bestWatch && bestWatch.stepsLen > 0) {
    return {
      id: "thread_trace_healthy",
      label: "thread trace healthy",
      status: "watch",
      detail: `走査 ${threadCandidates.length} 本: 最良 ${bestWatch.tid.slice(0, 24)}… step=${bestWatch.stepsLen} / persist 付=${bestWatch.persistCount}（基準 step≥${T_MIN_THREAD_STEPS} & persist>0 未満）`,
      next_card: CARD_BY_CHECK.thread_trace_healthy,
    };
  }
  return {
    id: "thread_trace_healthy",
    label: "thread trace healthy",
    status: anyErr ? "fail" : "watch",
    detail: anyErr
      ? `走査 ${threadCandidates.length} 本で trace 読出例外あり（再構成不能の疑い）`
      : `走査 ${threadCandidates.length} 本すべて step=0（ledger / conversation_log 突合失敗）`,
    next_card: CARD_BY_CHECK.thread_trace_healthy,
  };
}

function checkSourcesPopulated(registry: ReturnType<typeof buildMcSourceRegistryV1>): CheckDraft {
  const canon = registry.canonical.length;
  const edges = registry.graph.edges.length;
  const hub = hasMcHubEntry(registry);
  if (canon === 0 && edges === 0) {
    return {
      id: "sources_populated",
      label: "sources populated",
      status: "fail",
      detail: "source registry が空（canonical 0・edge 0）",
      next_card: CARD_BY_CHECK.sources_populated,
    };
  }
  /** repair-hub の source gap が閉じているライン = MC-08A 相当 PASS。 */
  if (canon >= T_MIN_CANONICAL_SOURCES && edges >= T_MIN_GRAPH_EDGES && hub) {
    return {
      id: "sources_populated",
      label: "sources populated",
      status: "pass",
      detail: `canonical=${canon} / edges=${edges} / mc_hub あり（MC-08A ライン）`,
    };
  }
  if (canon >= 1 && edges >= 4 && hub) {
    return {
      id: "sources_populated",
      label: "sources populated",
      status: "watch",
      detail: `canonical=${canon} / edges=${edges}（推奨 edges≥${T_MIN_GRAPH_EDGES}）・mc_hub あり`,
      next_card: CARD_BY_CHECK.sources_populated,
    };
  }
  return {
    id: "sources_populated",
    label: "sources populated",
    status: canon === 0 || edges === 0 ? "fail" : "watch",
    detail: `canonical=${canon} / graph_edges=${edges} / mc_hub=${hub ? "あり" : "なし"}`,
    next_card: CARD_BY_CHECK.sources_populated,
  };
}

/**
 * CARD-MC-09C-MEMORY-HIT-METRIC-CORRECTNESS-V1:
 *   旧 memory_hit_rate は Turn 0 の正常な never_persisted を miss と
 *   誤計上していたため、判定に使わない。ここでは turn_index>=1 に
 *   限定した continuation_memory_hit_live で真の継承品質を判定する。
 *   サンプル数が閾値未満なら判断保留（watch、WATCH/FAIL に昇格しない）。
 */
function checkContinuationMemoryHealthy(analyzer: McVnextAnalyzerSnapshotV1): CheckDraft {
  const rate = analyzer.continuation_memory_hit_live;
  const sample = analyzer.continuation_sample_count_live ?? 0;
  if (sample < T_CONTINUATION_MEMORY_MIN_SAMPLE || rate == null) {
    return {
      id: "continuation_memory_healthy",
      label: "continuation memory healthy",
      status: "watch",
      detail: `継承メモリ観測サンプル不足（turn≥1 n=${sample} < ${T_CONTINUATION_MEMORY_MIN_SAMPLE}）・判断保留`,
      next_card: CARD_BY_CHECK.continuation_memory_healthy,
    };
  }
  if (rate < T_CONTINUATION_MEMORY_HIT_FAIL) {
    return {
      id: "continuation_memory_healthy",
      label: "continuation memory healthy",
      status: "fail",
      detail: `継承メモリヒット率 ${(rate * 100).toFixed(0)}% (n=${sample}) < ${(T_CONTINUATION_MEMORY_HIT_FAIL * 100).toFixed(0)}%（turn≥1 で継承失敗）`,
      next_card: CARD_BY_CHECK.continuation_memory_healthy,
    };
  }
  if (rate < T_CONTINUATION_MEMORY_HIT_PASS) {
    return {
      id: "continuation_memory_healthy",
      label: "continuation memory healthy",
      status: "watch",
      detail: `継承メモリヒット率 ${(rate * 100).toFixed(0)}% (n=${sample}) < ${(T_CONTINUATION_MEMORY_HIT_PASS * 100).toFixed(0)}%（要観察）`,
      next_card: CARD_BY_CHECK.continuation_memory_healthy,
    };
  }
  return {
    id: "continuation_memory_healthy",
    label: "continuation memory healthy",
    status: "pass",
    detail: `継承メモリヒット率 ${(rate * 100).toFixed(0)}% (n=${sample}) ≥ ${(T_CONTINUATION_MEMORY_HIT_PASS * 100).toFixed(0)}%（turn≥1 で健全）`,
  };
}

function checkAlertsBelowCritical(alerts: McVnextAlertItemV1[]): CheckDraft {
  let crit = 0;
  let high = 0;
  const critTop: string[] = [];
  const highTop: string[] = [];
  for (const a of alerts) {
    if (a.severity === "CRIT") {
      crit += 1;
      if (critTop.length < 3) critTop.push(String(a.category || a.message || "crit"));
    } else if (a.severity === "HIGH") {
      high += 1;
      if (highTop.length < 3) highTop.push(String(a.category || a.message || "high"));
    }
  }
  if (crit > 0) {
    return {
      id: "alerts_below_critical",
      label: "alerts below critical",
      status: "fail",
      detail: `CRIT=${crit} (${critTop.join(", ")}) / HIGH=${high}`,
      next_card: CARD_BY_CHECK.alerts_below_critical,
    };
  }
  if (high >= T_HIGH_ALERTS_WATCH) {
    return {
      id: "alerts_below_critical",
      label: "alerts below critical",
      status: "watch",
      detail: `HIGH=${high} (${highTop.join(", ")}) ≥ ${T_HIGH_ALERTS_WATCH}`,
      next_card: CARD_BY_CHECK.alerts_below_critical,
    };
  }
  return {
    id: "alerts_below_critical",
    label: "alerts below critical",
    status: "pass",
    detail: `CRIT=0 / HIGH=${high} (<${T_HIGH_ALERTS_WATCH})`,
  };
}

export function evaluateMcVnextAcceptanceV1(
  s: McVnextAnalyzerSnapshotV1,
  alerts: McVnextAlertItemV1[],
): McVnextAcceptanceResultV1 {
  const lastVerifiedAt = new Date().toISOString();

  if (!isMcVnextAnalyzerEnabled()) {
    return {
      schema_version: "mc_vnext_acceptance_v1",
      status: "WATCH",
      verdict: "WATCH",
      reasons: ["TENMON_MC_VNEXT_ANALYZER が OFF のため集計していません。"],
      passed: [],
      missingProof: ["analyzer snapshot", "style batch", "git HEAD"],
      checks: [],
      nextRecommendedCard: "CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1: set TENMON_MC_VNEXT_ANALYZER=1",
      why_now: "analyzer が OFF のため current state を測定していません。",
      live_problematic_thread_count: 0,
      archived_problematic_thread_count: 0,
      top_affected_layer: "none",
      lastVerifiedAt,
    };
  }

  // --- gather shared inputs once ---
  let registry: ReturnType<typeof buildMcSourceRegistryV1>;
  try {
    registry = buildMcSourceRegistryV1();
  } catch {
    const empty = { canonical: [], mirror: [], backup: [], derived: [], graph: { nodes: [], edges: [] } };
    registry = empty as unknown as ReturnType<typeof buildMcSourceRegistryV1>;
  }
  const counters = readMcOverviewCountersV1();
  const problematicAll = readMcProblematicThreadsV1(80);
  const { live: liveProblematic, archived: archivedProblematic } =
    partitionProblematicThreadsLiveArchive(problematicAll);
  const threadCandidates = dedupeThreadProbeOrder(readLatestMcThreadIdV1(), counters.recent_threads);

  const rawChecks = [
    checkCanonicalPath(registry),
    checkLedgerFlowing(s),
    checkContinuationHealthy(counters),
    checkContinuationMemoryHealthy(s),
    checkPersistHealthy(s, counters, liveProblematic),
    checkThreadTraceHealthy(threadCandidates),
    checkSourcesPopulated(registry),
    checkAlertsBelowCritical(alerts),
  ];

  // affected_layer を check id から機械的に付与する（個別関数側は知らなくてよい）
  const checks: McVnextAcceptanceCheckV1[] = rawChecks.map((c) => ({
    ...c,
    affected_layer: layerOf(c.id),
  }));

  const verdict = composeVerdict(checks);

  const passed: string[] = [];
  const failWatch: string[] = [];
  const missingProof: string[] = [];
  for (const c of checks) {
    const line = `${c.label}: ${c.detail}`;
    if (c.status === "pass") passed.push(line);
    else failWatch.push(line);
  }

  // reasons は verdict で意味を変える:
  //   - PASS  : "何が確認済みか" (passed と同等の内容)
  //   - WATCH : "何が未閉鎖か" (fail/watch の詳細)
  //   - FAIL  : "何が破綻しているか" (fail/watch の詳細 / 先頭は fail)
  const reasons: string[] =
    verdict === "PASS"
      ? passed.slice()
      : failWatch.slice();

  // missing proof = 閾値未満・欠損系 (verdict 非 PASS の時だけ意味を持つ)
  if (s.sample_count === 0) missingProof.push("dialogue_quality_ledger sample (24h)");
  if (s.git.head_clean !== true) missingProof.push("clean git HEAD");
  if (counters.follow_up_turns_24h === 0) missingProof.push("follow_up traffic (continuation 観測サンプル)");
  if (counters.persist_total_turns_24h === 0) missingProof.push("persist 対象 turn (memory ledger)");
  if (registry.canonical.length < T_MIN_CANONICAL_SOURCES) missingProof.push(`canonical source seed (want ≥${T_MIN_CANONICAL_SOURCES})`);

  // top_affected_layer = FAIL: 最初の fail の layer / WATCH: 最初の watch / PASS: "none"
  const firstFail = checks.find((c) => c.status === "fail");
  const firstWatch = checks.find((c) => c.status === "watch");
  const top_affected_layer: McVnextAcceptanceAffectedLayerV1 =
    verdict === "FAIL"
      ? firstFail?.affected_layer ?? firstWatch?.affected_layer ?? "none"
      : verdict === "WATCH"
        ? firstWatch?.affected_layer ?? "none"
        : "none";

  const nextRecommendedCard = resolveNextRecommendedCard(checks, verdict);
  const why_now = buildWhyNow(verdict, failWatch, passed);

  return {
    schema_version: "mc_vnext_acceptance_v1",
    status: verdict,
    verdict,
    reasons,
    passed,
    missingProof,
    checks,
    nextRecommendedCard,
    why_now,
    live_problematic_thread_count: liveProblematic.length,
    archived_problematic_thread_count: archivedProblematic.length,
    top_affected_layer,
    lastVerifiedAt,
  };
}
