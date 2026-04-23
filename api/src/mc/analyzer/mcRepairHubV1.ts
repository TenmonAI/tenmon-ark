/**
 * MC vNext repair-hub — 「次に直すべき場所」を 1〜3 件に絞って提示する。
 * CARD-MC-11-REPAIR-HUB-CARD-GENERATOR-V1
 *
 * 入力:
 *   - acceptance verdict & checks (mcVnextAcceptanceV1)
 *   - active alerts (mcVnextAlertsV1)
 *   - problematic threads (readMcProblematicThreadsV1)
 *   - source registry gaps (buildMcSourceRegistryV1)
 *   - continuation / persist / quality 異常 (runMcVnextAnalyzerV1 + readMcOverviewCountersV1)
 *
 * 出力:
 *   - 最大 3 件の McRepairCardV1
 *   - affected_layer で重複を排除
 *   - priority で降順ソート
 *
 * ルールベース（完全自動ではない・機械可読のヒント）。
 */
import type { McVnextAnalyzerSnapshotV1 } from "./mcVnextAnalyzerV1.js";
import type { McVnextAlertItemV1 } from "./mcVnextAlertsV1.js";
import type { McVnextAcceptanceResultV1, McVnextAcceptanceCheckV1 } from "./mcVnextAcceptanceV1.js";
import type { McProblematicThreadV1 } from "../ledger/mcLedgerRead.js";
import type { McSourceRegistryV1 } from "../mcVnextSourceMapV1.js";

export type McRepairAffectedLayerV1 =
  | "chat"
  | "memory_ledger"
  | "conversation_log"
  | "route_selector"
  | "dialogue_quality"
  | "source_registry"
  | "git_workspace"
  | "systemd_runtime"
  | "thread_trace"
  | "alerts_pipeline"
  | "other";

export type McRepairCardV1 = {
  id: string;                         // 安定キー（UI 側で dedup 用）
  priority: number;                   // 100=緊急, 70=高, 50=中, 30=監視
  title: string;                      // 1 行サマリ（人間が読む）
  why_now: string;                    // 実データに根拠を置いた理由（数値・thread_id 入り）
  affected_layer: McRepairAffectedLayerV1;
  suggested_fix_area: string;         // 直すべきファイル / ディレクトリ / 仕組み
  verify_hint: string;                // 直したあと何を見れば PASS 確認できるか
  source_signals: string[];           // どの check / alert / thread から派生したか
  related_thread_ids?: string[];      // 具体 thread の紐付け（あれば）
};

export type McRepairHubSnapshotV1 = {
  schema_version: "mc_repair_hub_v1";
  generated_at: string;
  cards: McRepairCardV1[];
  total_candidates: number;           // ルール発火の総候補数（絞り込み前）
  input_summary: {
    verdict: string;
    crit_alerts: number;
    high_alerts: number;
    /** @deprecated 互換: live 件数と同義。 */
    problematic_threads: number;
    problematic_threads_live: number;
    problematic_threads_archived: number;
    canonical_sources: number;
  };
};

// ---- 候補ビルダー ----

type Candidate = McRepairCardV1;

function candFromCheck(
  check: McVnextAcceptanceCheckV1,
  ctx: {
    alerts: McVnextAlertItemV1[];
    problematic: McProblematicThreadV1[];
  },
): Candidate | null {
  const fail = check.status === "fail";
  const watch = check.status === "watch";
  if (!fail && !watch) return null;
  const prio = fail ? 90 : 55;
  const critCats = ctx.alerts
    .filter((a) => a.severity === "CRIT")
    .map((a) => String(a.category || ""))
    .filter(Boolean);
  const highCats = ctx.alerts
    .filter((a) => a.severity === "HIGH")
    .map((a) => String(a.category || ""))
    .filter(Boolean);
  const probIds = ctx.problematic.slice(0, 2).map((p) => p.thread_id);

  switch (check.id) {
    case "canonical_path":
      return {
        id: `check:${check.id}`,
        priority: prio,
        title: fail
          ? "/mc/ canonical path を宣言し直す"
          : "/mc/ canonical source を拡充する",
        why_now: `acceptance check "canonical path" = ${check.status.toUpperCase()} — ${check.detail}`,
        affected_layer: "source_registry",
        suggested_fix_area:
          "api/src/mc/mcVnextSourceMapV1.ts の seed registry（mc_hub / mc-landing の canonical エントリ）",
        verify_hint:
          "/api/mc/vnext/sources で canonical に /mc/ 系エントリが含まれ、/api/mc/vnext/acceptance の canonical_path check が pass になること",
        source_signals: [`acceptance.check:${check.id}`],
      };
    case "ledger_flowing":
      return {
        id: `check:${check.id}`,
        priority: fail ? 95 : 60,
        title: "ledger 書込経路の死活を確認する",
        why_now: `acceptance check "ledger flowing" = ${check.status.toUpperCase()} — ${check.detail}`,
        affected_layer: "memory_ledger",
        suggested_fix_area:
          "api/src/mc/ledger/mcLedger.ts と chat.ts の ledgerCtx 経路（TENMON_MC_VNEXT_LEDGER フラグ・route/llm/memory/quality 書込位置）",
        verify_hint:
          "チャット送信後に /api/mc/vnext/overview の ledger_24h すべての値が増えること（route/llm/memory/quality）",
        source_signals: [`acceptance.check:${check.id}`],
      };
    case "continuation_healthy": {
      const cf = ctx.problematic.filter((p) => p.reason === "continuation_failure").slice(0, 2);
      const hint = cf.length > 0 ? `（例 thread: ${cf.map((t) => t.thread_id.slice(0, 24)).join(", ")}）` : "";
      return {
        id: `check:${check.id}`,
        priority: fail ? 90 : 60,
        title: "continuation (follow_up) 失敗を潰す",
        why_now: `acceptance check "continuation healthy" = ${check.status.toUpperCase()} — ${check.detail}${hint}`,
        affected_layer: "route_selector",
        suggested_fix_area:
          "api/src/routes/chat.ts の wantsShortAnswerPrompt / continuation keyword 判定・NATURAL_GENERAL_LLM_TOP 分岐",
        verify_hint:
          "短答の追撃質問を複数投げ、/api/mc/vnext/overview の continuation_summary.follow_up_success_rate が 0.6 以上で安定すること",
        source_signals: [`acceptance.check:${check.id}`],
        related_thread_ids: cf.length > 0 ? cf.map((p) => p.thread_id) : undefined,
      };
    }
    case "persist_healthy": {
      const pf = ctx.problematic.filter((p) => p.reason === "persist_failure").slice(0, 2);
      const hint = pf.length > 0 ? `（例 thread: ${pf.map((t) => t.thread_id.slice(0, 24)).join(", ")}）` : "";
      return {
        id: `check:${check.id}`,
        priority: fail ? 90 : 60,
        title: "persist 書込の欠落を塞ぐ",
        why_now: `acceptance check "persist healthy" = ${check.status.toUpperCase()} — ${check.detail}${hint}`,
        affected_layer: "memory_ledger",
        suggested_fix_area:
          "api/src/memory/conversationStore.ts と chat.ts の persistTurn（[PERSIST_FINAL_V1] ログ経路・finalize 後の persisted_success=1 書込）",
        verify_hint:
          "発話を数回繰り返し、mc_memory_ledger に persisted_success=1 の行が該当 turn に残ること（/api/mc/vnext/thread/<id> で確認）",
        source_signals: [`acceptance.check:${check.id}`],
        related_thread_ids: pf.length > 0 ? pf.map((p) => p.thread_id) : undefined,
      };
    }
    case "thread_trace_healthy": {
      const hint = probIds.length > 0 ? `（関連 thread: ${probIds.map((t) => t.slice(0, 24)).join(", ")}）` : "";
      return {
        id: `check:${check.id}`,
        priority: fail ? 85 : 55,
        title: "最新 thread の trace 再構成を直す",
        why_now: `acceptance check "thread trace healthy" = ${check.status.toUpperCase()} — ${check.detail}${hint}`,
        affected_layer: "thread_trace",
        suggested_fix_area:
          "api/src/mc/ledger/mcLedgerRead.ts の buildStepsV1 と readMcThreadTraceV1（request_id クラスタ + 時系列 zip）",
        verify_hint:
          "/api/mc/vnext/thread/<latest> が steps>=2 かつ persists 配列が非空で返ること",
        source_signals: [`acceptance.check:${check.id}`],
        related_thread_ids: probIds.length > 0 ? probIds : undefined,
      };
    }
    case "sources_populated":
      return {
        id: `check:${check.id}`,
        priority: watch ? 50 : 80,
        title: "source registry を最低ラインまで埋める",
        why_now: `acceptance check "sources populated" = ${check.status.toUpperCase()} — ${check.detail}`,
        affected_layer: "source_registry",
        suggested_fix_area:
          "api/src/mc/mcVnextSourceMapV1.ts の seed (canonical/backup/derived + graph edges)",
        verify_hint:
          "/api/mc/vnext/sources で canonical>=3 かつ graph.edges>=8 になること",
        source_signals: [`acceptance.check:${check.id}`],
      };
    case "alerts_below_critical": {
      const cats = [...critCats, ...highCats].slice(0, 4);
      const catPart = cats.length > 0 ? `（対象: ${cats.join(", ")}）` : "";
      return {
        id: `check:${check.id}`,
        priority: fail ? 95 : 65,
        title: "CRIT / HIGH アラートを閉じる",
        why_now: `acceptance check "alerts below critical" = ${check.status.toUpperCase()} — ${check.detail}${catPart}`,
        affected_layer: "alerts_pipeline",
        suggested_fix_area:
          "アラート発火源（api/src/mc/analyzer/mcVnextAlertsV1.ts の rule と各 category の根元サブシステム）",
        verify_hint:
          "/api/mc/vnext/alerts で CRIT=0 かつ HIGH<2 になること",
        source_signals: [`acceptance.check:${check.id}`, ...cats.map((c) => `alert.cat:${c}`)],
      };
    }
  }
  return null;
}

function candFromCritAlerts(alerts: McVnextAlertItemV1[]): Candidate[] {
  const crits = alerts.filter((a) => a.severity === "CRIT");
  if (crits.length === 0) return [];
  const out: Candidate[] = [];
  for (const top of crits) {
    const cat = String(top.category || "crit");
    if (cat === "git_dirty") {
      out.push({
        id: `alert:${cat}`,
        priority: 98,
        title: "git workspace を clean にする",
        why_now: `CRIT アラート "git_dirty" が発火中: ${String(top.message || "")}`,
        affected_layer: "git_workspace",
        suggested_fix_area:
          "git status の未コミット変更を確認し、意味のあるコミットに固めるか .gitignore で整理する",
        verify_hint:
          "git status が clean になり、/api/mc/vnext/alerts から CRIT git_dirty が消えること",
        source_signals: [`alert.CRIT:${cat}`],
      });
      continue;
    }
    out.push({
      id: `alert:${cat}`,
      priority: 97,
      title: `CRIT アラート ${cat} を閉じる`,
      why_now: `CRIT アラート "${cat}" が発火中: ${String(top.message || "")}`,
      affected_layer: "alerts_pipeline",
      suggested_fix_area: String(top.hint || "CRIT を発火させたサブシステムを特定して root cause を直す"),
      verify_hint: `/api/mc/vnext/alerts から CRIT ${cat} が消えること`,
      source_signals: [`alert.CRIT:${cat}`],
    });
  }
  return out;
}

function candFromProblematicThreads(
  problematic: McProblematicThreadV1[],
): Candidate[] {
  if (problematic.length === 0) return [];
  const counts = new Map<string, McProblematicThreadV1[]>();
  for (const p of problematic) {
    const list = counts.get(p.reason) || [];
    list.push(p);
    counts.set(p.reason, list);
  }
  const sorted = Array.from(counts.entries())
    .map(([reason, list]) => ({ reason, list }))
    .sort((a, b) => b.list.length - a.list.length);

  const cards: Candidate[] = [];
  for (const top of sorted) {
    const c = candForReason(top.reason, top.list);
    if (c) cards.push(c);
  }
  return cards;
}

function candForReason(
  reason: string,
  list: McProblematicThreadV1[],
): Candidate | null {
  if (list.length === 0) return null;
  const sample = list[0];
  const ids = list.slice(0, 3).map((p) => p.thread_id);

  switch (reason) {
    case "truncation_suspect":
      return {
        id: `problematic:${reason}`,
        priority: 75,
        title: `truncation 疑い thread を ${list.length} 件処理する`,
        why_now: `24h で truncation_suspect thread ${list.length} 件（例: ${sample.thread_id.slice(0, 24)} final_len=${sample.final_len}）`,
        affected_layer: "dialogue_quality",
        suggested_fix_area:
          "LLM 応答長上限と enforceShortAnswerResponse / natural_end ロジック（chat.ts + llmWrapper.ts）",
        verify_hint:
          "/api/mc/vnext/alerts の truncation_suspect_24h が減り、analyzer.truncation_suspect_rate < 0.42 を保つこと",
        source_signals: ["problematic.truncation_suspect"],
        related_thread_ids: ids,
      };
    case "continuation_failure":
      return {
        id: `problematic:${reason}`,
        priority: 80,
        title: `continuation 失敗 thread を ${list.length} 件追う`,
        why_now: `follow_up で LLM 応答が空になった thread ${list.length} 件（例: ${sample.thread_id.slice(0, 24)} route_reason=${sample.route_reason || "—"}）`,
        affected_layer: "route_selector",
        suggested_fix_area: "chat.ts の follow_up 分岐と memory hydrate（continuation keyword detection）",
        verify_hint:
          "/api/mc/vnext/overview の continuation_success_live が 0.6 以上になること",
        source_signals: ["problematic.continuation_failure"],
        related_thread_ids: ids,
      };
    case "persist_failure":
      return {
        id: `problematic:${reason}`,
        priority: 78,
        title: `persist 失敗 thread を ${list.length} 件追う`,
        why_now: `finalize 済みだが persisted_success=1 が残っていない thread ${list.length} 件（例: ${sample.thread_id.slice(0, 24)}）`,
        affected_layer: "memory_ledger",
        suggested_fix_area:
          "conversationStore.persistTurn と chat.ts の persist 経路（非同期 await 抜け・WAL checkpoint）",
        verify_hint:
          "対象 thread に mc_memory_ledger で persisted_success=1 の行が入ること（/api/mc/vnext/thread/<id>）",
        source_signals: ["problematic.persist_failure"],
        related_thread_ids: ids,
      };
    case "memory_fallback_none":
      return {
        id: `problematic:${reason}`,
        priority: 72,
        title: `記憶未接続 thread を ${list.length} 件再接続する`,
        why_now: `memory source=none で history_len=0 の thread ${list.length} 件（例: ${sample.thread_id.slice(0, 24)}）`,
        affected_layer: "memory_ledger",
        suggested_fix_area:
          "memory/index.ts と chat.ts の hydrate 経路（session_memory / conversation_log のロード）",
        verify_hint:
          "/api/mc/vnext/overview の memory_hit_live が改善し、failing_threads_live から memory_fallback_none が減ること",
        source_signals: ["problematic.memory_fallback_none"],
        related_thread_ids: ids,
      };
  }
  return null;
}

function candFromContinuationAnomaly(
  snap: McVnextAnalyzerSnapshotV1,
): Candidate | null {
  if (snap.continuation_success_rate == null) return null;
  if (snap.continuation_success_rate >= 0.6) return null;
  return {
    id: "anomaly:continuation",
    priority: snap.continuation_success_rate < 0.3 ? 88 : 58,
    title: "continuation 成功率が閾値を割っている",
    why_now: `analyzer.continuation_success_rate=${snap.continuation_success_rate.toFixed(3)} (閾値 0.60)`,
    affected_layer: "route_selector",
    suggested_fix_area: "chat.ts の short-answer continuation と context hydrate",
    verify_hint:
      "analyzer.continuation_success_rate が 0.60 以上で安定すること（/api/mc/vnext/analyzer）",
    source_signals: ["analyzer.continuation_success_rate"],
  };
}

function candFromPersistAnomaly(snap: McVnextAnalyzerSnapshotV1): Candidate | null {
  if (snap.sample_count > 3 && snap.persistence.persist_rows_24h === 0) {
    return {
      id: "anomaly:persist_zero",
      priority: 92,
      title: "persist が完全に止まっている",
      why_now: `quality sample_count=${snap.sample_count} に対して persist_rows_24h=0（persist 経路断絶の疑い）`,
      affected_layer: "memory_ledger",
      suggested_fix_area:
        "conversationStore.persistTurn と ledgerCtx の配線（TENMON_MC_VNEXT_LEDGER フラグも確認）",
      verify_hint: "/api/mc/vnext/analyzer で persistence.persist_rows_24h > 0 になること",
      source_signals: ["analyzer.persistence.persist_rows_24h"],
    };
  }
  return null;
}

function candFromQualityAnomaly(snap: McVnextAnalyzerSnapshotV1): Candidate | null {
  if (snap.truncation_suspect_rate != null && snap.truncation_suspect_rate > 0.42) {
    return {
      id: "anomaly:truncation",
      priority: snap.truncation_suspect_rate > 0.55 ? 87 : 62,
      title: "dialogue の truncation 疑い率が高い",
      why_now: `analyzer.truncation_suspect_rate=${snap.truncation_suspect_rate.toFixed(3)} (閾値 0.42)`,
      affected_layer: "dialogue_quality",
      suggested_fix_area: "LLM 応答の上限・natural_end 判定・enforceShortAnswerResponse",
      verify_hint: "analyzer.truncation_suspect_rate < 0.42 に戻ること",
      source_signals: ["analyzer.truncation_suspect_rate"],
    };
  }
  if (snap.generic_fallback_rate != null && snap.generic_fallback_rate > 0.35) {
    return {
      id: "anomaly:generic_fallback",
      priority: 60,
      title: "generic fallback 率が高い",
      why_now: `analyzer.generic_fallback_rate=${snap.generic_fallback_rate.toFixed(3)} (閾値 0.35)`,
      affected_layer: "dialogue_quality",
      suggested_fix_area: "NATURAL_GENERAL 応答生成と persona overlay",
      verify_hint: "analyzer.generic_fallback_rate < 0.35 に戻ること",
      source_signals: ["analyzer.generic_fallback_rate"],
    };
  }
  return null;
}

function candFromSourceGap(
  registry: McSourceRegistryV1,
  acceptance: McVnextAcceptanceResultV1,
): Candidate | null {
  const srcCheck = acceptance.checks.find((c) => c.id === "sources_populated");
  if (srcCheck?.status === "pass") return null;
  const canonicalCount = registry.canonical.length;
  const edges = registry.graph.edges.length;
  const hasMcHub = registry.canonical.some((s) => {
    const uri = String(s.source_uri || "");
    const id = String(s.id || "");
    return /\/mc\/?/.test(uri) || id.includes("mc_hub") || id.includes("mc-landing");
  });
  if (canonicalCount >= 3 && edges >= 8 && hasMcHub) return null;
  return {
    id: "source_gap:canonical",
    priority: canonicalCount === 0 ? 85 : 45,
    title: "source registry の canonical を埋める",
    why_now: `canonical=${canonicalCount} / graph_edges=${edges} / mc_hub エントリ=${hasMcHub ? "あり" : "なし"}`,
    affected_layer: "source_registry",
    suggested_fix_area:
      "api/src/mc/mcVnextSourceMapV1.ts の SEED 定義（canonical + derived + graph.edges）",
    verify_hint:
      "/api/mc/vnext/sources で canonical>=3, graph.edges>=8, mc_hub canonical エントリありを確認",
    source_signals: ["source_registry.gap"],
  };
}

function dedupByLayer(cards: Candidate[]): Candidate[] {
  const seen = new Set<McRepairAffectedLayerV1>();
  const out: Candidate[] = [];
  for (const c of cards) {
    if (seen.has(c.affected_layer)) continue;
    seen.add(c.affected_layer);
    out.push(c);
  }
  return out;
}

export function buildMcRepairHubV1(input: {
  acceptance: McVnextAcceptanceResultV1;
  alerts: McVnextAlertItemV1[];
  analyzer: McVnextAnalyzerSnapshotV1;
  /** live 窓のみ（履歴 thread は候補に混ぜない / CARD-MC-14） */
  liveProblematic: McProblematicThreadV1[];
  archivedProblematicCount: number;
  registry: McSourceRegistryV1;
}): McRepairHubSnapshotV1 {
  const { acceptance, alerts, analyzer, liveProblematic, archivedProblematicCount, registry } = input;

  const all: Candidate[] = [];

  // 1. CRIT alert（最優先。複数あっても全部候補化、dedup は layer 側で行う）
  for (const c of candFromCritAlerts(alerts)) all.push(c);

  // 2. acceptance failing check（CRIT/HIGH 実カテゴリや具体 thread を why_now に埋める）
  const checkCtx = { alerts, problematic: liveProblematic };
  for (const ch of acceptance.checks) {
    if (ch.status === "pass") continue;
    const c = candFromCheck(ch, checkCtx);
    if (c) all.push(c);
  }

  // 3. persist 完全停止などの analyzer 異常（重大度高いもの）
  const persistAnom = candFromPersistAnomaly(analyzer);
  if (persistAnom) all.push(persistAnom);

  // 4. problematic threads クラスター（reason 別にすべて候補化）— live のみ
  for (const c of candFromProblematicThreads(liveProblematic)) all.push(c);

  // 5. continuation/quality 異常（acceptance が pass なら二重提示しない）
  const contCheck = acceptance.checks.find((c) => c.id === "continuation_healthy");
  if (contCheck?.status !== "pass") {
    const contAnom = candFromContinuationAnomaly(analyzer);
    if (contAnom) all.push(contAnom);
  }
  const qualAnom = candFromQualityAnomaly(analyzer);
  if (qualAnom) all.push(qualAnom);

  // 6. source gap（acceptance sources_populated が pass なら候補から外す）
  const srcGap = candFromSourceGap(registry, acceptance);
  if (srcGap) all.push(srcGap);

  // 並べ替え → layer dedup → top 3
  all.sort((a, b) => b.priority - a.priority);
  const deduped = dedupByLayer(all);
  const cards = deduped.slice(0, 3);

  // 何も候補がないが verdict が PASS でもない場合はメンテ推奨を 1 件出す
  if (cards.length === 0) {
    cards.push({
      id: "maintenance:weekly_trend",
      priority: 30,
      title: "維持: 週次で主要メトリクスを再測する",
      why_now:
        acceptance.verdict === "PASS"
          ? "主要 signal はすべて pass。次の崩れに備えた定点観測を。"
          : "自動生成ルールが発火しなかった（データ不足の可能性あり）。",
      affected_layer: "other",
      suggested_fix_area:
        "週次で /api/mc/vnext/acceptance と /api/mc/vnext/alerts を確認し、閾値トレンドを記録する",
      verify_hint:
        "acceptance.verdict が WATCH/FAIL に落ちたら、repair-hub から具体的カードが自動で出る",
      source_signals: ["fallback.maintenance"],
    });
  }

  let critCount = 0;
  let highCount = 0;
  for (const a of alerts) {
    if (a.severity === "CRIT") critCount += 1;
    else if (a.severity === "HIGH") highCount += 1;
  }

  return {
    schema_version: "mc_repair_hub_v1",
    generated_at: new Date().toISOString(),
    cards,
    total_candidates: all.length,
    input_summary: {
      verdict: String(acceptance.verdict),
      crit_alerts: critCount,
      high_alerts: highCount,
      problematic_threads: liveProblematic.length,
      problematic_threads_live: liveProblematic.length,
      problematic_threads_archived: archivedProblematicCount,
      canonical_sources: registry.canonical.length,
    },
  };
}
