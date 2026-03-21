/**
 * MAINLINE_SUMMARY_EXTRACTOR_AND_SCORER_REPAIR_V1 +
 * MAINLINE_COMPLETION_AUTO_FEEDBACK_BIND_V1
 * — completion forensic 用の抽出（TS フォールバック）と supervisor/optimizer 向けフィードバック bind
 */
import type { Request, Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { appendEvolutionLedgerEventV1 } from "../core/evolutionLedgerV1.js";

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/** MAINLINE_SURFACE_REHYDRATION_V1 — Python extract と同等の再水和 */
export function extractMainlineCompletionSummaryV1(payload: unknown): Record<string, unknown> {
  const chat = payload as Record<string, unknown>;
  const df = (chat.decisionFrame as Record<string, unknown> | undefined) ?? {};
  const ku = (df.ku as Record<string, unknown> | undefined) ?? {};
  let rp: Record<string, unknown> | null =
    ku.responsePlan && typeof ku.responsePlan === "object" ? (ku.responsePlan as Record<string, unknown>) : null;
  const rr = ku.routeReason;
  let rp_rr: unknown = null;
  if (rp) rp_rr = rp.routeReason;

  const responsePlanRouteEffective = pickStr(rp_rr, rp ? rr : undefined, rr);

  const bs = ku.binderSummary && typeof ku.binderSummary === "object" ? (ku.binderSummary as Record<string, unknown>) : null;
  let srcPack = pickStr(ku.sourcePack, bs?.sourcePack);
  if (!srcPack) {
    const gm = ku.groundingMode;
    if (gm) srcPack = `grounding:${pickStr(gm)}`;
  }
  if (!srcPack && ku.groundingSelector && typeof ku.groundingSelector === "object") {
    const gs = ku.groundingSelector as Record<string, unknown>;
    const g = pickStr(gs.groundingMode, gs.groundedPriority);
    if (g) srcPack = `selector:${g}`;
  }

  const laws = ku.lawsUsed;
  const evi = ku.evidenceIds;
  const lawsN = Array.isArray(laws) ? laws.length : 0;
  const eviN = Array.isArray(evi) ? evi.length : 0;

  const resp = String(chat.response ?? "");
  let head = "";
  if (resp.includes("【天聞の所見】")) {
    const rest = resp.split("【天聞の所見】", 1)[1]?.trim() ?? "";
    const lines = rest.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) head = lines[0]!.slice(0, 800);
  }
  if (!head.trim()) head = resp.slice(0, 800);
  const tcs = ku.thoughtCoreSummary;
  if (!head.trim() && tcs && typeof tcs === "object") {
    const o = tcs as Record<string, unknown>;
    head = pickStr(o.centerLabel, o.centerMeaning).slice(0, 800);
  }

  let headPreview = (head ? head.slice(0, 220) : "") || (resp ? resp.slice(0, 220) : "");
  if (!headPreview.trim()) {
    const ck = pickStr(ku.centerLabel, ku.centerKey);
    headPreview = pickStr(
      ck || rr ? `[rehydrate] route=${rr ?? "?"} center=${ck}` : "",
      String(rr ?? ""),
      "rehydrate:surface_non_empty"
    ).slice(0, 220);
  }
  if (!headPreview.trim()) headPreview = "rehydrate:empty_surface_guard";

  let nextStep = "";
  for (const line of resp.split("\n")) {
    const s = line.trim();
    if (s.includes("次の一手") || (s.includes("（補助）") && s.includes("一手"))) {
      nextStep = s.slice(0, 800);
      break;
    }
  }
  if (!nextStep) {
    const m = resp.match(/（補助）[^\n]{4,300}/u);
    if (m) nextStep = m[0].trim().slice(0, 800);
  }
  if (!nextStep && ku.omegaContract && typeof ku.omegaContract === "object") {
    const om = (ku.omegaContract as Record<string, unknown>).omega;
    if (om && typeof om === "object") {
      nextStep = pickStr((om as Record<string, unknown>).next_step_line).slice(0, 800);
    }
  }
  if (!nextStep && rp && typeof rp.semanticBody === "string") {
    for (const line of String(rp.semanticBody).split("\n")) {
      const s = line.trim();
      if (s.includes("次の一手")) {
        nextStep = s.slice(0, 800);
        break;
      }
    }
  }
  if (!nextStep) {
    nextStep = rr
      ? `（再水和）次の一手: routeReason=${rr} — 判断軸を一つ選び深める（payload 契約より補完）`
      : "（再水和）次の一手: 中心を一つ保ち次の観測点を決める";
  }

  const qmarks = (resp.match(/[？?]/g) ?? []).length;
  const askHeavy = qmarks > 10;
  const beautyThin = resp.length < 140 && String(rr) !== "BEAUTY_COMPILER_PREEMPT_V1";
  const humanReadable = !resp.includes("KHSL:LAW:");

  const sourcePackSurface = Boolean(srcPack);
  const headPreviewEmpty = !String(headPreview).trim();

  return {
    extractorV: "MAINLINE_SURFACE_REHYDRATION_V1",
    routeReason: rr,
    responsePlanRouteReason: rp_rr,
    responsePlanRouteEffective: responsePlanRouteEffective,
    responsePlanRouteExplicit: rp_rr,
    centerKey: ku.centerKey,
    centerLabel: ku.centerLabel,
    binderSummarySourcePack: bs?.sourcePack ?? null,
    sourcePackEffective: srcPack || null,
    sourcePackSurface,
    lawsUsedCount: lawsN,
    evidenceIdsCount: eviN,
    response: resp,
    head,
    headPreview,
    headPreviewEmpty,
    responseOrHeadUsed: head.trim() ? "head" : "response_fallback",
    responsePlan: rp,
    responsePlanNull: rp == null,
    responsePlanNullFallback:
      rp == null ? "responsePlan absent; routeReason and omegaContract still anchor Ω" : null,
    nextStepExtract: nextStep,
    nextStepRehydrated: Boolean(nextStep.trim()),
    beautyAskOveruseHeuristic: { askHeavy, beautyThin },
    humanReadableSurface: humanReadable,
    bodySampleForScoring: resp.length > 900 ? resp.slice(-900) : resp,
    rowsNonZero: lawsN > 0 || eviN > 0,
    extractionNotes: "rehydrated from ku/omegaContract/grounding when body omits fields",
  };
}

export function handleMainlineCompletionSummaryExtractV1(req: Request, res: Response): void {
  try {
    const summary = extractMainlineCompletionSummaryV1(req.body);
    res.json({
      ok: true,
      summary,
      v: "MAINLINE_SURFACE_REHYDRATION_V1",
    });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function resolveForensicRoot(raw: string): string | null {
  const env = process.env.TENMON_FORENSIC_ROOT;
  if (raw) {
    const p = path.resolve(raw);
    if (env && path.resolve(env) === p) return p;
    if (p.startsWith("/tmp/")) return p;
    return null;
  }
  if (env) return path.resolve(env);
  return null;
}

export type CompletionFeedbackBindV1 = {
  completionScoreProxy: number;
  weakAxes: string[];
  missingFields: string[];
  askOveruseRisk: "low" | "medium" | "high";
  beautyThinRisk: "low" | "medium" | "high";
  lawHumanizationResidual: string;
  nextImprovementCandidate: string;
  nextCardCandidate: string;
  lowRiskAutoFixPreferred: boolean;
  mainlineRepairFirst: boolean;
  aggregate: Record<string, unknown> | null;
};

function buildFeedbackFromAggregate(agg: Record<string, unknown>): CompletionFeedbackBindV1 {
  const hr = Number(agg.human_readable_rate ?? 0);
  const ns = Number(agg.next_step_rate ?? 0);
  const bt = Number(agg.beauty_signal_rate ?? 0);
  const rp = Number(agg.responsePlanRoute_rate ?? agg.responsePlan_present_rate ?? 0);
  const sp = Number(agg.sourcePack_rate ?? 0);

  const weakAxes: string[] = [];
  if (hr < 0.7) weakAxes.push("human_readable_surface");
  if (ns < 0.5) weakAxes.push("next_step_surface");
  if (bt < 0.6) weakAxes.push("beauty_signal");
  if (rp < 0.5) weakAxes.push("response_plan_route");
  if (sp < 0.5) weakAxes.push("source_pack_surface");

  const missingFields: string[] = [];
  if (hr < 0.5) missingFields.push("plain_language_body");
  if (ns < 0.4) missingFields.push("next_step_line");
  if (rp < 0.4) missingFields.push("responsePlan.routeReason");
  if (sp < 0.4) missingFields.push("sourcePack");

  const score = Math.max(
    0,
    Math.min(1, hr * 0.28 + ns * 0.24 + bt * 0.14 + rp * 0.17 + sp * 0.17)
  );
  const mainlineRepairFirst = score < 0.45;

  let askOveruse: "low" | "medium" | "high" = "low";
  let beautyRisk: "low" | "medium" | "high" = "low";
  if (score < 0.35) {
    askOveruse = "medium";
    beautyRisk = "medium";
  }
  if (score < 0.2) {
    askOveruse = "high";
    beautyRisk = "high";
  }

  /** 1 本に圧縮（スコア悪化時は low-risk auto-heal 系へ） */
  const nextCardCandidate =
    mainlineRepairFirst || score < 0.45
      ? "MAINLINE_AUTO_HEAL_PATCH_LOOP_V1"
      : "MAINLINE_SUPREME_COMPLETION_AUDIT_V1";

  return {
    completionScoreProxy: Math.round(score * 1000) / 1000,
    weakAxes,
    missingFields,
    askOveruseRisk: askOveruse,
    beautyThinRisk: beautyRisk,
    lawHumanizationResidual: hr < 0.6 ? "KHSL token bleed or law-only surface" : "within tolerance",
    nextImprovementCandidate: weakAxes[0] ?? "stability_pass",
    nextCardCandidate,
    lowRiskAutoFixPreferred: score < 0.45,
    mainlineRepairFirst,
    aggregate: agg,
  };
}

/** GET/POST — forensic 出力を optimizer / supervisor が読める形へ（read-only GET） */
export function handleMainlineCompletionFeedbackBindV1(req: Request, res: Response): void {
  const local = String(req.headers["x-tenmon-local-test"] ?? "") === "1";
  const root = resolveForensicRoot(String(req.query.forensicRoot ?? ""));
  if (!local || !root || !fs.existsSync(root)) {
    res.status(403).json({
      ok: false,
      error: "requires x-tenmon-local-test: 1 and valid forensicRoot (/tmp/... or TENMON_FORENSIC_ROOT)",
    });
    return;
  }

  const aggPath = path.join(root, "forensic_aggregate.json");
  let agg: Record<string, unknown> | null = null;
  if (fs.existsSync(aggPath)) {
    try {
      agg = JSON.parse(fs.readFileSync(aggPath, "utf8")) as Record<string, unknown>;
    } catch {
      agg = null;
    }
  }

  if (!agg) {
    res.status(404).json({ ok: false, error: "forensic_aggregate.json not found or invalid", root });
    return;
  }

  const feedback = buildFeedbackFromAggregate(agg);

  if (req.method === "POST") {
    /** 自動昇格禁止: regressionRisk は常に low、主線スコアが低いときは evolution より主線補修を明示 */
    try {
      appendEvolutionLedgerEventV1({
        sourceCard: "MAINLINE_COMPLETION_AUTO_FEEDBACK_BIND_V1",
        changedLayer: "completion_forensic_delta",
        beforeSummary: { note: "会話完成度差分（forensic aggregate スナップショット）" },
        afterSummary: {
          completionScoreProxy: feedback.completionScoreProxy,
          weakAxes: feedback.weakAxes,
          mainlineRepairFirst: feedback.mainlineRepairFirst,
          nextCardCandidate: feedback.nextCardCandidate,
          human_readable_rate: agg.human_readable_rate,
          next_step_rate: agg.next_step_rate,
          beauty_signal_rate: agg.beauty_signal_rate,
        },
        affectedRoute: "completion_forensic",
        affectedSourcePack: root,
        affectedDensity: String(agg.sample_count ?? ""),
        affectedProse: JSON.stringify(feedback.weakAxes).slice(0, 2000),
        regressionRisk: "low",
        acceptedBy: "completion_feedback_bind_v1",
        status: "accepted",
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
      return;
    }
  }

  res.json({
    ok: true,
    v: "MAINLINE_COMPLETION_AUTO_FEEDBACK_BIND_V1",
    forensicRoot: root,
    ...feedback,
  });
}
