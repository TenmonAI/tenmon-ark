/**
 * SELF_LEARNING_TO_RULE_FEEDBACK_V1
 * kanagiSelf 等の観測を機械可読バンドルにし、ledger 経由で次ターン以降の routing / density / source 候補に載せる。
 */
import { getDb } from "../db/index.js";

export const SELF_LEARNING_RULE_FEEDBACK_V1 = "SELF_LEARNING_RULE_FEEDBACK_V1" as const;
export const SELF_LEARNING_RFB_LEDGER_MARKER = "SELF_LEARNING_RFB_V1" as const;

export type SelfLearningRuleFeedbackV1 = {
  v: typeof SELF_LEARNING_RULE_FEEDBACK_V1;
  routeReason: string | null;
  answerMode: string | null;
  answerLength: string | null;
  answerFrame: string | null;
  densityTarget: string | null;
  sourceKinds: string[];
  lawsUsedSample: string[];
  judgementAxis: string[];
  stabilityScore: number | null;
  driftRisk: number | null;
  selfPhase: string | null;
  intentPhase: string | null;
  /** 次回ルーティング・密度・ソース束のヒント（コード列） */
  ruleHintCodes: string[];
};

function str(v: unknown): string | null {
  return v != null && typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function buildSelfLearningRuleFeedbackV1(
  ku: Record<string, unknown>
): SelfLearningRuleFeedbackV1 {
  const ks = ku.kanagiSelf as Record<string, unknown> | undefined;
  const rp = ku.responsePlan as Record<string, unknown> | undefined;
  const ss = ku.sourceStackSummary as Record<string, unknown> | undefined;
  const dc =
    rp && typeof rp === "object" && rp.densityContract && typeof rp.densityContract === "object"
      ? (rp.densityContract as Record<string, unknown>)
      : null;

  const densityTarget = dc && str(dc.densityTarget) ? str(dc.densityTarget) : null;
  const sourceKinds = Array.isArray(ss?.sourceKinds)
    ? (ss!.sourceKinds as unknown[]).slice(0, 12).map((x) => String(x))
    : [];
  const lawsUsedSample = Array.isArray(ku.lawsUsed)
    ? (ku.lawsUsed as unknown[]).slice(0, 8).map((x) => String(x))
    : [];
  const judgementAxis = Array.isArray(ks?.judgementAxis)
    ? (ks!.judgementAxis as unknown[]).slice(0, 12).map((x) => String(x))
    : [];

  const ruleHintCodes: string[] = [];
  if (densityTarget === "high") ruleHintCodes.push("density_prefer_high");
  const dr = num(ks?.driftRisk);
  if (dr != null && dr >= 0.5) ruleHintCodes.push("drift_mitigate");
  if (sourceKinds.some((k) => /kotodama|scripture|canon/i.test(k))) {
    ruleHintCodes.push("source_grounding_prefer_canon");
  }
  if (str(ku.answerMode) === "define" || str(ku.answerMode) === "analysis") {
    ruleHintCodes.push("answer_mode_define_or_analysis");
  }
  if (lawsUsedSample.some((k) => k.startsWith("KHSL:LAW:"))) {
    ruleHintCodes.push("law_trace_active");
  }

  return {
    v: SELF_LEARNING_RULE_FEEDBACK_V1,
    routeReason: str(ku.routeReason),
    answerMode: str(ku.answerMode),
    answerLength: str(ku.answerLength),
    answerFrame: str(ku.answerFrame ?? rp?.answerFrame),
    densityTarget,
    sourceKinds,
    lawsUsedSample,
    judgementAxis,
    stabilityScore: num(ks?.stabilityScore),
    driftRisk: dr,
    selfPhase: str(ks?.selfPhase),
    intentPhase: str(ks?.intentPhase),
    ruleHintCodes: Array.from(new Set(ruleHintCodes)),
  };
}

/**
 * 直近の機械可読フィードバックを ku に注入（無ければ no-op）。
 */
export function tryHydratePriorRuleFeedbackV1(df: Record<string, unknown> | null | undefined): void {
  if (!df || typeof df !== "object") return;
  const ku = df.ku;
  if (!ku || typeof ku !== "object" || Array.isArray(ku)) return;
  const k = ku as Record<string, unknown>;
  if (k.priorSelfLearningRuleFeedbackV1) return;

  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        `SELECT next_growth_axis FROM kanagi_growth_ledger
         WHERE unresolved_class = ? AND next_growth_axis IS NOT NULL AND length(next_growth_axis) > 12
         ORDER BY id DESC LIMIT 1`
      )
      .get(SELF_LEARNING_RFB_LEDGER_MARKER) as { next_growth_axis?: string } | undefined;
    const raw = row?.next_growth_axis;
    if (!raw) return;
    const parsed = JSON.parse(raw) as SelfLearningRuleFeedbackV1;
    if (parsed && parsed.v === SELF_LEARNING_RULE_FEEDBACK_V1) {
      k.priorSelfLearningRuleFeedbackV1 = parsed;
    }
  } catch {
    /* ignore */
  }
}

/**
 * SELF_LEARNING_RULE_BINDER_V1
 * priorSelfLearningRuleFeedbackV1 を density / sourcePack / growth axis / drift 補助として反映。
 * routeReason / contract は変更しない。prior が無い時は no-op。
 */
export function applySelfLearningRuleBinderV1(ku: Record<string, unknown> | null | undefined): void {
  if (!ku || typeof ku !== "object") return;
  const p = ku.priorSelfLearningRuleFeedbackV1 as SelfLearningRuleFeedbackV1 | undefined;
  if (!p || p.v !== SELF_LEARNING_RULE_FEEDBACK_V1) return;

  const rp = ku.responsePlan as Record<string, unknown> | undefined;
  const rr = String(ku.routeReason ?? "").trim();
  const isDensityLike =
    rr && (/(STRUCTURE_LOCK|ESSENCE|JUDGEMENT|WORLDVIEW|SELFAWARE|SCRIPTURE|RESEARCH|PREEMPT|EXPLICIT|DEF_FASTPATH|TRUTH_GATE|DRIFT|BEAUTY|LANGUAGE)/.test(rr) ||
      String(ku.answerMode ?? "") === "define" ||
      String(ku.answerMode ?? "") === "analysis");

  if (p.densityTarget === "high" && isDensityLike && rp && typeof rp === "object") {
    const dc = rp.densityContract;
    if (!dc || typeof dc !== "object") {
      (rp as Record<string, unknown>).densityContract = {
        densityTarget: "high",
        mustGroundOneLayer: true,
        mustCompressToCenterClaim: true,
        mustEndWithActionOrAxis: true,
      };
    } else if ((dc as Record<string, unknown>).densityTarget !== "high") {
      (dc as Record<string, unknown>).densityTarget = "high";
    }
  }

  const ss = ku.sourceStackSummary as Record<string, unknown> | undefined;
  if (ss && typeof ss === "object" && Array.isArray(p.sourceKinds) && p.sourceKinds.length > 0) {
    const existing = Array.isArray(ss.sourceKinds) ? (ss.sourceKinds as string[]) : [];
    ss.sourceKinds = [...new Set([...existing, ...p.sourceKinds.slice(0, 6)])];
    if (
      p.ruleHintCodes?.includes("source_grounding_prefer_canon") &&
      !String(ss.thoughtGuideSummary ?? "").includes("prior")
    ) {
      ss.thoughtGuideSummary =
        (String(ss.thoughtGuideSummary ?? "").trim() + " (prior: canon grounding)").trim();
    }
  }

  if (!ku.thoughtCoreSummary || typeof ku.thoughtCoreSummary !== "object" || Array.isArray(ku.thoughtCoreSummary)) {
    ku.thoughtCoreSummary = {};
  }
  const tcs = ku.thoughtCoreSummary as Record<string, unknown>;
  if (Array.isArray(p.judgementAxis) && p.judgementAxis.length > 0) {
    tcs.priorGrowthAxisHints = p.judgementAxis.slice(0, 6);
  }
  if (p.ruleHintCodes?.includes("drift_mitigate")) {
    tcs.driftMitigationHint = true;
  }
}
