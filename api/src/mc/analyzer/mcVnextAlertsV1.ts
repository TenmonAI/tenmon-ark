/**
 * MC vNext アラート（原因つき・診断のみ）。
 * CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1
 */
import type { McVnextAnalyzerSnapshotV1 } from "./mcVnextAnalyzerV1.js";

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

  const allTime = s.memory_hydration_hit_rate_all_time;
  if (s.memory_hit_rate != null && s.memory_hit_rate < 0.45 && (s.persistence.context_memory_rows_24h ?? 0) > 3) {
    const allPart =
      allTime != null && Number.isFinite(allTime)
        ? ` · all_time ${(allTime * 100).toFixed(1)}%`
        : "";
    alerts.push({
      severity: "MED",
      category: "memory_mismatch",
      message: `memory / conversation_log ヒット率（24h・history_len>0）が低い（${(s.memory_hit_rate * 100).toFixed(1)}%${allPart}）。`,
      hint: "threadId と session_id の一致、session_memory 投入を確認。",
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

  return alerts;
}
