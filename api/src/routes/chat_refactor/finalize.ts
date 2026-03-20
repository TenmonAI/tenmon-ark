/**
 * CHAT_SAFE_REFACTOR_PATCH6_FINALIZE_SINGLE_EXIT_V1
 * 主要出口を single-exit 化する最小ヘルパ。
 */

import type { DensityContractV1 } from "../../planning/responsePlanCore.js";

/** FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1: 密度対象 route（routeReason 不変・PATCH29 期待と独立） */
const DENSITY_CONTRACT_ROUTE_REASONS = new Set<string>([
  "TENMON_STRUCTURE_LOCK_V1",
  "R22_ESSENCE_ASK_V1",
  "R22_JUDGEMENT_PREEMPT_V1",
  "WORLDVIEW_ROUTE_V1",
  "R22_RELATIONAL_WORLDVIEW_V1",
  "R22_SELFAWARE_CONSCIOUSNESS_V1",
  "TENMON_SCRIPTURE_CANON_V1",
  "SCRIPTURE_LOCAL_RESOLVER_V4",
  "TENMON_RESEARCH_RESPONSE_LOOP_V1",
  "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
  "SYSTEM_DIAGNOSIS_PREEMPT_V1",
  "R22_FUTURE_OUTLOOK_V1",
  "EXPLICIT_CHAR_PREEMPT_V1",
  "NATURAL_GENERAL_LLM_TOP",
]);

function hasNonEmptySourcePack(ku: any): boolean {
  const laws = Array.isArray(ku?.lawsUsed) ? ku.lawsUsed.length : 0;
  const evi = Array.isArray(ku?.evidenceIds) ? ku.evidenceIds.length : 0;
  const ss = ku?.sourceStackSummary;
  if (laws > 0 || evi > 0) return true;
  if (ss && typeof ss === "object" && !Array.isArray(ss)) {
    const pm = String((ss as any).primaryMeaning ?? "").trim();
    const ra = String((ss as any).responseAxis ?? "").trim();
    if (pm.length > 0 || ra.length > 0) return true;
  }
  return false;
}

function isDensityEligibleKu(ku: any): boolean {
  const rr = String(ku?.routeReason ?? "").trim();
  const am = String(ku?.answerMode ?? "").trim();
  if (DENSITY_CONTRACT_ROUTE_REASONS.has(rr)) return true;
  if (am === "define" || am === "analysis") return true;
  return false;
}

/** responsePlan に密度契約を付与し、空の source pack に最小束を足す（DB 不要） */
function applyDensityContractAndMinimalSourcePackV1(ku: any): void {
  if (!ku || typeof ku !== "object") return;
  if (!isDensityEligibleKu(ku)) return;

  const rr = String(ku.routeReason ?? "").trim();
  const rp = ku.responsePlan && typeof ku.responsePlan === "object" ? ku.responsePlan : null;
  if (rp && !rp.densityContract) {
    const dc: DensityContractV1 = {
      densityTarget: "high",
      mustGroundOneLayer: true,
      mustCompressToCenterClaim: true,
      mustEndWithActionOrAxis: true,
    };
    rp.densityContract = dc;
  }

  if (hasNonEmptySourcePack(ku)) return;

  const center =
    String(ku.centerLabel || ku.centerKey || ku.threadCenterKey || ku.threadCenterLabel || "").trim() ||
    "この問い";
  ku.sourceStackSummary = {
    ...(typeof ku.sourceStackSummary === "object" && ku.sourceStackSummary ? ku.sourceStackSummary : {}),
    primaryMeaning: center.slice(0, 160),
    responseAxis: "tenmon_density_contract_v1",
    thoughtGuideSummary:
      "脳幹契約（routeReason / responsePlan）を一文の中心命題へ圧縮し、根拠束（law/evidence/source）が空でも『見立ての芯』を本文に残す。",
  };
  if (!Array.isArray(ku.lawsUsed)) ku.lawsUsed = [];
  if (ku.lawsUsed.length === 0) ku.lawsUsed.push("TENMON_DENSITY_SURFACE_PACK_V1");
}

export function finalizeSingleExitV1(
  res: any,
  __tenmonGeneralGateResultMaybe: any,
  payload: any
) {
  try {
    const __df: any = payload?.decisionFrame || null;
    const __ku: any =
      __df && __df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku)
        ? __df.ku
        : null;

    const __routeReason = String(__ku?.routeReason || "");
    const __routeClass = __ku?.routeClass ?? null;

    console.log("[FINALIZE_EXIT_MAP_V1]", {
      routeReason: __routeReason || null,
      routeClass: __routeClass,
      answerLength: __ku?.answerLength ?? null,
      answerMode: __ku?.answerMode ?? null,
      answerFrame: __ku?.answerFrame ?? null,
      hasResponsePlan: Boolean(__ku?.responsePlan),
      exitKind: "single_exit_gate_json",
    });
  } catch {}

  return res.json(__tenmonGeneralGateResultMaybe(payload));
}

/**
 * FINAL_ANSWER_CONSTITUTION_AND_WISDOM_REDUCER_V1
 * 全route共通の最終一声還元（routeReason / contract は不変）。
 */
export function applyFinalAnswerConstitutionAndWisdomReducerV1(payload: any): any {
  const out = payload && typeof payload === "object" ? { ...payload } : payload;
  if (!out || typeof out !== "object") return payload;
  if (typeof out.response !== "string") return out;

  const df: any = out.decisionFrame && typeof out.decisionFrame === "object" ? out.decisionFrame : null;
  const ku: any = df && df.ku && typeof df.ku === "object" ? df.ku : null;
  if (!ku) return out;

  applyDensityContractAndMinimalSourcePackV1(ku);

  const responsePlan = ku.responsePlan && typeof ku.responsePlan === "object" ? ku.responsePlan : null;
  const centerContract =
    String(
      ku.centerLabel ||
      ku.threadCenterLabel ||
      ku.centerKey ||
      ku.threadCenterKey ||
      ""
    ).trim() || "この問い";
  const mission =
    String(ku.answerMode || ku.routeClass || "analysis").trim() || "analysis";
  const oneStepType =
    String(ku.answerFrame || responsePlan?.answerFrame || "one_step").trim() || "one_step";
  const lawsN = Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0;
  const eviN = Array.isArray(ku.evidenceIds) ? ku.evidenceIds.length : 0;
  const sourceHint = String(
    ku?.sourceStackSummary?.primaryMeaning ||
    ku?.sourceStackSummary?.responseAxis ||
    ""
  ).trim();
  const evidencePack = sourceHint || lawsN > 0 || eviN > 0
    ? `根拠束: ${sourceHint || "internal"}${lawsN > 0 ? ` law:${lawsN}` : ""}${eviN > 0 ? ` ev:${eviN}` : ""}`
    : "";

  let body = String(out.response || "").trim();
  const rr = String(ku.routeReason ?? "").trim();
  const densityNoLighten =
    DENSITY_CONTRACT_ROUTE_REASONS.has(rr) || String(ku.answerMode ?? "") === "define" || String(ku.answerMode ?? "") === "analysis";
  if (!densityNoLighten) {
    body = body
      .replace(/^\s*（[^）]{0,36}）を土台に、いまの話を見ていきましょう。?\s*/u, "")
      .replace(/受け取っています。?そのまま続けてください。?/gu, "")
      .trim();
  } else {
    body = body.replace(/受け取っています。?そのまま続けてください。?/gu, "").trim();
  }

  const head = `【天聞の所見】${centerContract}について、今回は${mission}として答えます。`;
  const step =
    oneStepType === "statement_plus_one_question"
      ? "次の一手: 掘る軸を一つだけ選んでください。"
      : "次の一手: いまの中心を一つ保ったまま進めます。";
  const composed = [head, body, evidencePack, step].filter(Boolean).join("\n\n").trim();
  out.response = composed;
  return out;
}
