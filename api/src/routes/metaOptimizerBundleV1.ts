/**
 * META_OPTIMIZER_V1 — bundle: nextPriority / lists / single suggestedCard / confidence / dispatchMode
 * Read-only. high-risk 勝手に昇格しない（review_required を明示）。
 */
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";
import { SELF_LEARNING_RFB_LEDGER_MARKER } from "../core/selfLearningRuleFeedbackV1.js";

const V = "META_OPTIMIZER_BUNDLE_V1";
const NEXT_CARD = "INTELLIGENCE_OS_MASTER_AUDIT_V1";

/** GET /api/audit/meta-optimizer-bundle-v1 */
export function handleMetaOptimizerBundleV1(_req: Request, res: Response): void {
  const ts = new Date().toISOString();
  try {
    const db = getDb("kokuzo");
    const suppressList: string[] = [];
    const amplifyList: string[] = [];
    const riskList: string[] = [];
    let ledgerN = -1;
    try {
      const r = db.prepare(`SELECT COUNT(*) AS c FROM evolution_ledger_v1`).get() as { c?: number } | undefined;
      ledgerN = Number(r?.c ?? 0);
    } catch {
      ledgerN = -1;
      riskList.push("evolution_ledger_v1:missing_or_error");
    }

    if (ledgerN === 0) {
      riskList.push("evolution_ledger_empty");
      suppressList.push("auto_seal");
      amplifyList.push("run_finalize_path_to_populate_evolution_ledger_v1");
    } else if (ledgerN > 0) {
      amplifyList.push("evolution_ledger_causal_trace");
    }

    let topAxis = "observe";
    let topConf = 0.45;
    try {
      const rfb = db
        .prepare(`SELECT COUNT(*) AS c FROM kanagi_growth_ledger WHERE unresolved_class = ?`)
        .get(SELF_LEARNING_RFB_LEDGER_MARKER) as { c?: number } | undefined;
      const n = Number(rfb?.c ?? 0);
      if (n > 0) {
        amplifyList.push("prior_rule_feedback_surface");
        topAxis = "prior_rule_feedback";
        topConf = Math.min(0.92, 0.4 + n * 0.02);
      }
    } catch {
      riskList.push("kanagi_growth_ledger_read_error");
    }

    try {
      const al = db.prepare(`SELECT COUNT(*) AS c FROM khs_apply_log`).get() as { c?: number } | undefined;
      if (Number(al?.c ?? 0) > 0) amplifyList.push("apply_log_training_loop");
    } catch {
      riskList.push("khs_apply_log_read_error");
    }

    try {
      const sc = db.prepare(`SELECT COUNT(*) AS c FROM khs_seed_clusters`).get() as { c?: number } | undefined;
      if (Number(sc?.c ?? 0) > 0) amplifyList.push("seed_cluster_diversity");
    } catch {
      /* ignore */
    }

    if (riskList.length >= 2) suppressList.push("low_signal_auto_patch");

    const aggregate =
      ledgerN < 0 ? 0.35 : ledgerN === 0 ? 0.42 : Math.min(0.95, 0.55 + Math.min(ledgerN, 500) / 2000 + topConf * 0.25);

    const willMeaningBeautyWorldviewReviewRequired = true;
    const reviewRequired = aggregate < 0.72 || ledgerN < 1 || riskList.length >= 2;
    const dispatchMode = reviewRequired ? "review_required" : "auto_low_risk_candidate";

    const nextPriority =
    ledgerN < 1
      ? "fix_evolution_ledger_visibility"
      : topAxis === "prior_rule_feedback"
        ? "stabilize_self_learning_ku_surface"
        : "run_master_intelligence_audit";

    const rationale =
      `evolution_ledger_v1 rows=${ledgerN}; topAxis=${topAxis}; risks=${riskList.length}; ` +
      (reviewRequired ? "人間レビュー前提（自動昇格なし）" : "低リスク候補のみ自動可");

    res.json({
      ok: true,
      v: V,
      timestamp: ts,
      nextPriority,
      suppressList,
      amplifyList,
      riskList,
      suggestedCard: NEXT_CARD,
      nextCard: NEXT_CARD,
      rationale,
      confidence: Number(aggregate.toFixed(4)),
      dispatchMode,
      reviewRequired,
      willMeaningBeautyWorldviewReviewRequired,
      lowRiskAutoCandidatesOnly: true,
      noAutoEscalation: true,
      legacyProbeHint: "GET /api/audit/evolution/meta-optimizer-v1 for candidates[]",
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      v: V,
      timestamp: ts,
      error: e instanceof Error ? e.message : String(e),
      suggestedCard: NEXT_CARD,
      nextCard: NEXT_CARD,
      confidence: 0,
      dispatchMode: "review_required",
      reviewRequired: true,
    });
  }
}
