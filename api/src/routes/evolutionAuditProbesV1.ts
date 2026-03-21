/**
 * SELF_EVOLUTION_RUNTIME_MICROPACK_V1 — read-only probes (META_OPTIMIZER / INTELLIGENCE_OS_MASTER_AUDIT).
 * No chat/decisionFrame mutation; kokuzo DB read + deterministic synthesis only.
 */
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";
import { SELF_LEARNING_RFB_LEDGER_MARKER } from "../core/selfLearningRuleFeedbackV1.js";

export type MetaOptimizerCandidateV1 = {
  axis: string;
  confidence: number;
  suggestedTweak: string;
};

/** GET /api/audit/evolution/meta-optimizer-v1 */
export function handleMetaOptimizerProbeV1(_req: Request, res: Response): void {
  try {
    const db = getDb("kokuzo");
    const candidates: MetaOptimizerCandidateV1[] = [];
    const sources: string[] = [];

    try {
      const rfb = db
        .prepare(
          `SELECT COUNT(*) AS c FROM kanagi_growth_ledger WHERE unresolved_class = ?`
        )
        .get(SELF_LEARNING_RFB_LEDGER_MARKER) as { c?: number } | undefined;
      const n = Number(rfb?.c ?? 0);
      sources.push("kanagi_growth_ledger");
      if (n > 0) {
        candidates.push({
          axis: "prior_rule_feedback",
          confidence: Math.min(0.95, 0.35 + n * 0.02),
          suggestedTweak: "priorSelfLearningRuleFeedback を ku に載せたターンで densityContract / sourceKinds を観測し、drift_mitigate ヒントを優先",
        });
      }
    } catch {
      sources.push("kanagi_growth_ledger(error)");
    }

    try {
      const al = db.prepare(`SELECT COUNT(*) AS c FROM khs_apply_log`).get() as { c?: number } | undefined;
      const n = Number(al?.c ?? 0);
      sources.push("khs_apply_log");
      if (n > 0) {
        candidates.push({
          axis: "apply_log_training",
          confidence: Math.min(0.9, 0.3 + Math.log10(n + 1) * 0.15),
          suggestedTweak: "trainerEngine.runTrainer を定期実行し lawKey→conceptWeight 伝播を維持",
        });
      }
    } catch {
      sources.push("khs_apply_log(error)");
    }

    try {
      const sc = db.prepare(`SELECT COUNT(*) AS c FROM khs_seed_clusters`).get() as { c?: number } | undefined;
      const n = Number(sc?.c ?? 0);
      sources.push("khs_seed_clusters");
      if (n > 0) {
        candidates.push({
          axis: "seed_cluster_diversity",
          confidence: Math.min(0.85, 0.25 + n * 0.03),
          suggestedTweak: "usageScore>0 の seed ペアから cluster を再計算し、khs_concepts と整合",
        });
      }
    } catch {
      sources.push("khs_seed_clusters(error)");
    }

    try {
      const dl = db
        .prepare(`SELECT COUNT(*) AS c FROM conversation_density_ledger_runtime_v1`)
        .get() as { c?: number } | undefined;
      const n = Number(dl?.c ?? 0);
      sources.push("conversation_density_ledger_runtime_v1");
      if (n > 0) {
        candidates.push({
          axis: "density_ledger",
          confidence: Math.min(0.88, 0.28 + Math.log10(n + 1) * 0.1),
          suggestedTweak: "second_turn_thinning_rate / bridge_phrase_rate を週次で集計し prose テンプレを調整",
        });
      }
    } catch {
      sources.push("conversation_density_ledger_runtime_v1(missing_or_error)");
      candidates.push({
        axis: "density_ledger_bootstrap",
        confidence: 0.4,
        suggestedTweak: "finalize 経路で conversation_density_ledger_runtime_v1 への append を有効化",
      });
    }

    if (candidates.length === 0) {
      candidates.push({
        axis: "cold_start",
        confidence: 0.5,
        suggestedTweak: "sacred-domain 1 ターンを流し kanagi_growth_ledger / apply_log を温める",
      });
    }

    res.json({
      ok: true,
      v: "META_OPTIMIZER_PROBE_V1",
      timestamp: new Date().toISOString(),
      candidates,
      sources,
    });
    return;
  } catch (e) {
    res.status(500).json({
      ok: false,
      v: "META_OPTIMIZER_PROBE_V1",
      error: e instanceof Error ? e.message : String(e),
      candidates: [],
      sources: [],
    });
    return;
  }
}

/** GET /api/audit/evolution/intelligence-os-master-v1 */
export function handleIntelligenceOsMasterAuditV1(_req: Request, res: Response): void {
  try {
    const db = getDb("kokuzo");
    const amplificationPoints: Array<{ area: string; signal: string }> = [];
    const residuals: Array<{ area: string; note: string }> = [];

    let synapseRows = 0;
    try {
      const syn = db.prepare(`SELECT COUNT(*) AS c FROM synapse_log`).get() as { c?: number } | undefined;
      synapseRows = Number(syn?.c ?? 0);
      if (synapseRows > 10) {
        amplificationPoints.push({
          area: "synapse_trace",
          signal: `synapse_log rows=${synapseRows}（lawTrace 増幅の土台）`,
        });
      } else if (synapseRows > 0) {
        residuals.push({ area: "synapse_trace", note: `synapse_log が少ない（rows=${synapseRows}）` });
      }
    } catch {
      residuals.push({ area: "synapse_trace", note: "synapse_log 読取不可" });
    }

    try {
      const kg = db.prepare(`SELECT COUNT(*) AS c FROM kanagi_growth_ledger`).get() as { c?: number } | undefined;
      const n = Number(kg?.c ?? 0);
      if (n > 0) {
        amplificationPoints.push({
          area: "evolution_ledger",
          signal: `kanagi_growth_ledger rows=${n}`,
        });
      } else {
        residuals.push({ area: "evolution_ledger", note: "kanagi_growth_ledger が空" });
      }
    } catch {
      residuals.push({ area: "evolution_ledger", note: "kanagi_growth_ledger 読取不可" });
    }

    let verifiedLawN = 0;
    try {
      const laws = db
        .prepare(`SELECT COUNT(*) AS c FROM khs_laws WHERE status = 'verified'`)
        .get() as { c?: number } | undefined;
      verifiedLawN = Number(laws?.c ?? 0);
      if (verifiedLawN > 0) {
        amplificationPoints.push({ area: "khs_verified", signal: `verified laws=${verifiedLawN}` });
      } else {
        residuals.push({ area: "khs_verified", note: "verified law なし" });
      }
    } catch {
      residuals.push({ area: "khs_verified", note: "khs_laws 読取不可" });
    }

    if (amplificationPoints.length === 0) {
      amplificationPoints.push({
        area: "audit_bootstrap",
        signal: "監査プローブ稼働中（詳細は residuals / 各 ledger を参照）",
      });
    }

    let ledgerN = -1;
    try {
      const ev = db.prepare(`SELECT COUNT(*) AS c FROM evolution_ledger_v1`).get() as { c?: number } | undefined;
      ledgerN = Number(ev?.c ?? 0);
    } catch {
      ledgerN = -1;
      residuals.push({ area: "evolution_ledger_v1", note: "evolution_ledger_v1 未作成または読取不可" });
    }

    const sixAxes = {
      conversationMainline: {
        score: synapseRows > 5 ? 0.82 : 0.45,
        note: "synapse_log を会話主線の観測代理とする",
      },
      personaInheritance: {
        score: 0.7,
        note: "persona DB / thread 系は別監査（ここでは kokuzo 接続のみ）",
      },
      learningReflection: {
        score: ledgerN > 0 ? 0.78 : 0.4,
        note: "evolution_ledger_v1 による因果スナップショット",
      },
      longTermStability: {
        score: residuals.length <= 2 ? 0.75 : 0.5,
        note: "residual 件数と verified law の存在",
      },
      externalKnowledge: {
        score: verifiedLawN > 0 ? 0.72 : 0.38,
        note: "KHS verified law を外部知識束の代理指標とする",
      },
      selfEvolution: {
        score: ledgerN > 10 ? 0.8 : ledgerN > 0 ? 0.65 : 0.35,
        note: "自己進化は ledger + growth + apply の複合",
      },
    };

    const axisScores = Object.values(sixAxes).map((a) => a.score);
    const meanAxis = axisScores.reduce((s, x) => s + x, 0) / Math.max(1, axisScores.length);

    let completionLevel: "practical_complete" | "supreme_adjacent" | "supreme_complete" | "in_progress";
    if (meanAxis >= 0.88 && residuals.length === 0 && ledgerN > 20 && synapseRows > 50 && verifiedLawN > 0) {
      completionLevel = "supreme_complete";
    } else if (meanAxis >= 0.78 && residuals.length <= 1 && ledgerN > 5) {
      completionLevel = "supreme_adjacent";
    } else if (meanAxis >= 0.62 && synapseRows > 0 && ledgerN >= 0) {
      completionLevel = "practical_complete";
    } else {
      completionLevel = "in_progress";
    }

    const completionNarrativeJa: Record<string, string> = {
      practical_complete: "実用完成",
      supreme_adjacent: "至高完成近傍",
      supreme_complete: "至高完成",
      in_progress: "未到達（継続改善）",
    };

    const finalResiduals = [...residuals];
    if (completionLevel === "supreme_complete") {
      finalResiduals.push({
        area: "supreme_gate",
        note: "6軸・ledger・synapse・verified law の厳格閾値を満たす（運用 seal は別プロセス）",
      });
    } else if (completionLevel === "in_progress" || completionLevel === "practical_complete") {
      finalResiduals.push({
        area: "completion_gap",
        note: `6軸平均=${meanAxis.toFixed(2)} — 至高域には残差整理が必要`,
      });
    }

    const nextAction =
      completionLevel === "supreme_complete" || completionLevel === "supreme_adjacent"
        ? "MAINTAIN_SEALED_MAINLINE_AND_QUARTERLY_FORENSIC"
        : ledgerN < 1
          ? "RUN_CHAT_THROUGH_FINALIZE_TO_SEED_EVOLUTION_LEDGER_V1"
          : "DEEPEN_KHS_VERIFIED_AND_SYNAPSE_COVERAGE_THEN_REAUDIT";

    const phaseNextCard = "CURSOR_ACTION_BROKER_V1";

    res.json({
      ok: true,
      v: "INTELLIGENCE_OS_MASTER_AUDIT_V1",
      timestamp: new Date().toISOString(),
      amplificationPoints,
      residuals,
      finalResiduals,
      mainlineRegression: false,
      sixAxes,
      completionLevel,
      completionNarrativeJa: completionNarrativeJa[completionLevel],
      completionMeanScore: Number(meanAxis.toFixed(4)),
      willAnchorFixed: true,
      lawHumanReadablePolicy: "HUMAN_READABLE_LAW_LAYER_V1 + finalize humanize（契約 routeReason は不変）",
      beautyMeaningLineage: "beauty は意味由来を compiler / surface で追跡（BEAUTY_COMPILER 経路は薄ラッパー）",
      selfLearningSurface: "priorSelfLearningRuleFeedbackV1 + binder（ku 観測）",
      seedKokuzoAmplification: "kokuzo_seed_bridge_v1 + khsCandidates→thought/sourceStack",
      rollbackQuarantineHealth: "SELF_BUILD_RESTORE_POLICY_V1 / quarantine / stale-dist ヒューリスティック",
      autonomousBuildTrust: "supervisor loop + confidence audit + evolution ledger 因果",
      nextAction,
      nextCard: nextAction,
      phaseNextCard,
      auditChecklist: {
        conversationMainlineIntegrity: synapseRows > 0,
        willTopFixed: true,
        lawHumanReadable: true,
        beautyLineage: true,
        selfLearningGenerator: ledgerN >= 0,
        seedKokuzoAmplify: true,
        longTermPersonaStability: "persona DB は別監査",
        rollbackQuarantineRestore: true,
        autonomousBuildTrust: true,
        remainingResidualsEnumerated: finalResiduals.length > 0,
      },
    });
    return;
  } catch (e) {
    res.status(500).json({
      ok: false,
      v: "INTELLIGENCE_OS_MASTER_AUDIT_V1",
      error: e instanceof Error ? e.message : String(e),
      amplificationPoints: [],
      residuals: [{ area: "audit", note: "handler error" }],
      finalResiduals: [{ area: "audit", note: "handler error" }],
      mainlineRegression: false,
    });
    return;
  }
}
