/**
 * MC vNext アラート（原因つき・診断のみ）。
 * CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1
 */
import type { McVnextAnalyzerSnapshotV1 } from "./mcVnextAnalyzerV1.js";
import { buildIntelligenceFire7dTrendV1 } from "../fire/intelligenceFireTracker.js";

export type McVnextAlertSeverityV1 = "CRIT" | "HIGH" | "MED" | "LOW";

export type McVnextAlertItemV1 = {
  severity: McVnextAlertSeverityV1;
  category: string;
  message: string;
  hint: string;
};

export function buildMcVnextAlertsV1(s: McVnextAnalyzerSnapshotV1): McVnextAlertItemV1[] {
  const alerts: McVnextAlertItemV1[] = [];

  if (s.ledger_rows_24h.llm === 0 && s.ledger_rows_24h.route === 0) {
    alerts.push({
      severity: "LOW",
      category: "empty_ledger",
      message: "24h 内に route / llm ledger が空です（collector 未稼働またはトラフィックなし）。",
      hint: "TENMON_MC_VNEXT_LEDGER=1 と会話を発生させてください。",
    });
  } else if (s.sample_count === 0 && s.ledger_rows_24h.llm > 4) {
    alerts.push({
      severity: "HIGH",
      category: "dialogue_quality_zero",
      message: "LLM 実行は記録されているが mc_dialogue_quality_ledger が 24h で空です。",
      hint: "chat.ts の quality ledger フックと NATURAL_GENERAL 経路を確認。",
    });
  }

  if (s.git.head_clean === false) {
    alerts.push({
      severity: "CRIT",
      category: "git_dirty",
      message: "git working tree が dirty です（HEAD clean でない）。",
      hint: "デプロイ前にコミットまたは退避し、acceptance の前提を満たしてください。",
    });
  }

  if (s.persistence.persist_rows_24h === 0 && s.sample_count > 5) {
    alerts.push({
      severity: "CRIT",
      category: "persistence_stop",
      message: "会話はあるが memory persist ledger（persisted_success=1）が 24h で 0 件です。",
      hint: "memoryPersistMessage 経路を確認（NATURAL 経路の persist 有無）。",
    });
  }

  if (s.provider_fallback_rate != null && s.provider_fallback_rate > 0.2) {
    alerts.push({
      severity: "CRIT",
      category: "provider_drift",
      message: `同一 turn で複数 provider が観測された割合が高い（${(s.provider_fallback_rate * 100).toFixed(1)}%）。`,
      hint: "llm execution ledger の turn 単位の provider 変動を追跡。",
    });
  }

  if (s.route_stability_rate != null && s.route_stability_rate < 0.35) {
    alerts.push({
      severity: "CRIT",
      category: "route_collapse",
      message: `route_reason の集中度が低い（支配率 ${(s.route_stability_rate * 100).toFixed(1)}%）。`,
      hint: "ルーティング監査不能・分岐増加の可能性。",
    });
  }

  if (s.truncation_suspect_rate != null && s.truncation_suspect_rate > 0.35) {
    alerts.push({
      severity: "HIGH",
      category: "truncation_spike",
      message: `truncation_suspect 比率が高い（${(s.truncation_suspect_rate * 100).toFixed(1)}%）。`,
      hint: "max_tokens / 継続リトライ / モデル切替を確認。",
    });
  }

  if (s.continuation_success_rate != null && s.continuation_success_rate < 0.55) {
    alerts.push({
      severity: "HIGH",
      category: "continuation_failure",
      message: `follow_up セレクタに対する非空 LLM 成功率が低い（${(s.continuation_success_rate * 100).toFixed(1)}%）。`,
      hint: "conversation_log / memory 補完と continuation プロバイダを確認。",
    });
  }

  // CARD-MC-09C: MED memory_mismatch は continuation_memory_hit_live（turn_index>=1）で判定。
  //   旧 memory_hit_rate（全 MEMORY_READ 母集団）は Turn 0 の正常 never_persisted を
  //   miss と誤計上し 13% 付近の低値を示していたため誤発火源になっていた。
  //   サンプルが 5 件未満なら判断を保留（発火しない）。
  const contHit = s.continuation_memory_hit_live;
  const contSample = s.continuation_sample_count_live ?? 0;
  const allTimeCont = s.continuation_memory_hit_all_time;
  if (contHit != null && contSample >= 5 && contHit < 0.7) {
    const allPart =
      allTimeCont != null && Number.isFinite(allTimeCont)
        ? ` · all_time ${(allTimeCont * 100).toFixed(1)}%`
        : "";
    alerts.push({
      severity: "MED",
      category: "memory_mismatch",
      message: `継承メモリヒット率（turn≥1・24h）が低い（${(contHit * 100).toFixed(1)}% n=${contSample}${allPart}）。`,
      hint: "threadId と session_id の一致、session_memory 投入、continuation 経路の hydrate を確認。",
    });
  }

  if (s.tenmon_style_fit_score != null && s.tenmon_style_fit_score < 0.45) {
    alerts.push({
      severity: "LOW",
      category: "style_degradation",
      message: `天聞文体適合スコアが低め（${s.tenmon_style_fit_score.toFixed(2)}）。`,
      hint: "generic 逃避・AI定型・高圧表現の混入を final_tail で確認。",
    });
  }

  // CARD-MC-26: soul-root 発火率の 7 日プール平均が 70% 未満（十分なサンプル時）
  try {
    const t7 = buildIntelligenceFire7dTrendV1(7);
    const n7 = t7.events_total;
    const ar7 = t7.avg_fire_ratio_window;
    if (n7 >= 21 && ar7 < 0.7) {
      const worstDay = [...t7.daily].sort((a, b) => a.avg_fire_ratio - b.avg_fire_ratio)[0];
      const dayHint = worstDay ? ` 最弱日 ${worstDay.day}=${(worstDay.avg_fire_ratio * 100).toFixed(0)}%` : "";
      alerts.push({
        severity: "HIGH",
        category: "intelligence_fire_ratio_7d_low",
        message: `7 日平均 soul-root 充填率が閾値未満（avg=${(ar7 * 100).toFixed(1)}% · n=${n7} · want ≥70%）。${dayHint}`,
        hint: "GET /api/mc/vnext/intelligence/fire と mc_intelligence_fire.jsonl を確認。トラフィック偏りか注入退行かを切り分け。",
      });
    }
  } catch {
    /* ignore */
  }

  return alerts;
}
