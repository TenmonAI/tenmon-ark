/**
 * CHAT_SAFE_REFACTOR_PATCH6_FINALIZE_SINGLE_EXIT_V1
 * 主要出口を single-exit 化する最小ヘルパ。
 */

import {
  type DensityContractV1,
  applyLongformDensityProfileV1,
  applySurfaceMeaningDensityRepairV1,
  buildMeaningCompilerProseV1,
  buildOmegaContractV1,
  clampQuestionMarksInProseV1,
  extractNextStepLineFromSurfaceV1,
  resealFinalMainlineSurfaceV1,
  suppressInterrogativeTemplateSpamV1,
} from "../../planning/responsePlanCore.js";
import {
  buildHumanReadableEvidenceFootingLineV1,
  buildMainlineTenmonHeadV1,
  buildSourcePackFootingClauseV1,
  humanReadableAnswerModeForSurface,
  humanReadableCenterContractFromKu,
  humanizeCenterKeyForDisplay,
  humanizeProseKhslLawKeys,
  humanizeResponseAxisForDisplay,
  isTenmonPrincipleOrCanonProbeMessageV1,
  repairSystemDiagnosisBodyIfMisappliedV1,
  stripDiagnosisTemplateParagraphsV1,
  stripEmbeddedMechanicalBundleLinesV1,
  stripInternalApiKeysFromSurfaceProseV1,
} from "./humanReadableLawLayerV1.js";
import {
  applySelfLearningRuleBinderV1,
  tryHydratePriorRuleFeedbackV1,
} from "../../core/selfLearningRuleFeedbackV1.js";
import { appendConversationDensityLedgerRuntimeV1 } from "../../core/conversationDensityLedgerRuntimeV1.js";
import { applyKokuzoSeedLearningBridgeV1 } from "../../core/kokuzoSeedLearningBridgeV1.js";
import { tryAppendEvolutionLedgerSnapshotOnceV1 } from "../../core/evolutionLedgerV1.js";

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
  "DEF_FASTPATH_VERIFIED_V1",
  "TRUTH_GATE_RETURN_V2",
  "DRIFT_FIREWALL_PREEMPT_V1",
  "BEAUTY_COMPILER_PREEMPT_V1",
  "LANGUAGE_ESSENCE_PREEMPT_V1",
  "WILL_CORE_PREEMPT_V1",
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

/** FINALIZE_BEAUTY_WRAPPER_THINNING_V1: beauty composition 系は説明ラッパーを薄くし、本文の理→情→余韻を前面に */
function isBeautyCompositionFinalizeThinV1(ku: any): boolean {
  const rr = String(ku?.routeReason ?? "").trim();
  if (rr === "BEAUTY_COMPILER_PREEMPT_V1") return true;
  if (String(ku?.centerKey ?? "").trim() === "beauty_compiler") return true;
  const tcs = ku?.thoughtCoreSummary;
  if (tcs && typeof tcs === "object" && !Array.isArray(tcs)) {
    if (String((tcs as Record<string, unknown>).modeHint ?? "") === "beauty_composure") return true;
  }
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

  const centerRaw =
    String(ku.centerLabel || ku.centerKey || ku.threadCenterKey || ku.threadCenterLabel || "").trim() ||
    "この問い";
  const center = humanizeCenterKeyForDisplay(centerRaw).slice(0, 160) || centerRaw.slice(0, 160) || "この問い";
  ku.sourceStackSummary = {
    ...(typeof ku.sourceStackSummary === "object" && ku.sourceStackSummary ? ku.sourceStackSummary : {}),
    primaryMeaning: center,
    responseAxis: "tenmon_density_contract_v1",
    thoughtGuideSummary:
      "脳幹契約（routeReason / responsePlan）を一文の中心命題へ圧縮し、根拠束（law/evidence/source）が空でも『見立ての芯』を本文に残す。",
  };
  if (!Array.isArray(ku.lawsUsed)) ku.lawsUsed = [];
  if (ku.lawsUsed.length === 0) ku.lawsUsed.push("TENMON_DENSITY_SURFACE_PACK_V1");
}

/** OMEGA_D_DELTAS_RUNTIME_LOCK_V1: ku.omegaContract を常時 object で付与（responsePlan 欠落でも保持） */
function attachOmegaContractToOutKuV1(
  out: Record<string, unknown>,
  ku: any,
  responsePlan: any | null,
  finalResponse: string,
  nextStepLine: string,
  mode?: "shaped" | "non_string_response" | "minimal"
): void {
  try {
    ku.omegaContract = buildOmegaContractV1({
      payload: out,
      ku,
      finalResponse,
      nextStepLine: nextStepLine || extractNextStepLineFromSurfaceV1(finalResponse),
      responsePlan,
      mode,
    });
  } catch {
    ku.omegaContract = {
      v: "OMEGA_D_DELTAS_RUNTIME_LOCK_V1",
      equation: "Omega = D · DeltaS",
      shape: "omega_runtime_lock",
      D: {
        constitutionRefs: ["OMEGA_CONTRACT_v1", "PDCA_BUILD_CONTRACT_v1", "KHS_RUNTIME_CONTRACT_v1"],
        verifiedCanonLayer: "degraded",
        nonNegotiables: ["omega_contract_always_object"],
        willCoreSignal: null,
        truthAxis: null,
        routeReasonAnchor: String(ku?.routeReason ?? "").slice(0, 120),
        bindingNote: "fail-shaped minimal shell（ビルダ例外時）",
      },
      deltaS: {
        input_delta: "(unavailable)",
        learning_delta: "none",
        source_delta: "unset",
        failure_delta: "omega_build_exception",
        recovery_delta: "retry_finalize",
        dialogue_delta: "none",
      },
      omega: {
        response_surface: String(finalResponse ?? "").slice(0, 600),
        next_step_line: String(nextStepLine ?? "").slice(0, 400),
        next_card_candidate: "MAINLINE_SURFACE_REHYDRATION_V1",
        auto_heal_hint: "inspect_finalize_trace",
        growth_output: "none",
      },
      meta: {
        shapedAt: new Date().toISOString(),
        responsePlanPresent: Boolean(responsePlan),
        mode: "minimal",
      },
    };
  }
}

export function finalizeSingleExitV1(
  res: any,
  __tenmonGeneralGateResultMaybe: any,
  payload: any
) {
  // SELF_EVOLUTION_RUNTIME_MICROPACK_V1: single-exit 経路でも prior RFB を確実に hydrate（gate 前に 1 回）
  try {
    if (payload?.decisionFrame && typeof payload.decisionFrame === "object") {
      tryHydratePriorRuleFeedbackV1(payload.decisionFrame as Record<string, unknown>);
    }
  } catch {}
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

  const __out = __tenmonGeneralGateResultMaybe(payload);
  // SELF_LEARNING_RULE_BINDER_V1: single-exit 経路でも finalize 末尾で binder を適用（wisdom reducer 非経由の TENMON_STRUCTURE_LOCK 等）
  try {
    const __kuBind: any = __out?.decisionFrame?.ku;
    if (__kuBind && typeof __kuBind === "object" && !Array.isArray(__kuBind)) {
      applySelfLearningRuleBinderV1(__kuBind as Record<string, unknown>);
    }
  } catch {}
  try {
    if (__out && typeof __out === "object") applyKokuzoSeedLearningBridgeV1(__out as Record<string, unknown>);
  } catch {}
  try {
    if (__out && typeof __out === "object") tryAppendEvolutionLedgerSnapshotOnceV1(__out as Record<string, unknown>);
  } catch {}

  return res.json(__out);
}

/**
 * FINAL_ANSWER_CONSTITUTION_AND_WISDOM_REDUCER_V1
 * 全route共通の最終一声還元（routeReason / contract は不変）。
 */
export function applyFinalAnswerConstitutionAndWisdomReducerV1(payload: any): any {
  const out = payload && typeof payload === "object" ? { ...payload } : payload;
  if (!out || typeof out !== "object") return payload;

  const dfEarly: any = out.decisionFrame && typeof out.decisionFrame === "object" ? out.decisionFrame : null;
  const kuEarly: any = dfEarly && dfEarly.ku && typeof dfEarly.ku === "object" ? dfEarly.ku : null;
  if (!kuEarly) {
    return out;
  }

  if (typeof out.response !== "string") {
    const rp0 = kuEarly.responsePlan && typeof kuEarly.responsePlan === "object" ? kuEarly.responsePlan : null;
    attachOmegaContractToOutKuV1(out as Record<string, unknown>, kuEarly, rp0, "", "", "non_string_response");
    return out;
  }

  try {
    if (out.decisionFrame && typeof out.decisionFrame === "object") {
      tryHydratePriorRuleFeedbackV1(out.decisionFrame as Record<string, unknown>);
    }
  } catch {}

  const df: any = out.decisionFrame && typeof out.decisionFrame === "object" ? out.decisionFrame : null;
  const ku: any = df && df.ku && typeof df.ku === "object" ? df.ku : null;
  if (!ku) return out;

  applyDensityContractAndMinimalSourcePackV1(ku);
  applySelfLearningRuleBinderV1(ku as Record<string, unknown>);
  try {
    applyKokuzoSeedLearningBridgeV1(out as Record<string, unknown>);
  } catch {}

  try {
    const ss = ku.sourceStackSummary;
    if (ss && typeof ss === "object" && !Array.isArray(ss)) {
      for (const k of ["primaryMeaning", "responseAxis", "thoughtGuideSummary"] as const) {
        const v = (ss as Record<string, unknown>)[k];
        if (typeof v !== "string") continue;
        let nv = humanizeProseKhslLawKeys(v);
        if (k === "responseAxis") {
          nv = humanizeResponseAxisForDisplay(nv);
        } else if (k === "primaryMeaning") {
          const t = nv.trim();
          if (t.length > 0 && t.length <= 160) nv = humanizeCenterKeyForDisplay(t);
        }
        (ss as Record<string, unknown>)[k] = nv;
      }
    }
  } catch {}

  const responsePlan = ku.responsePlan && typeof ku.responsePlan === "object" ? ku.responsePlan : null;
  const centerContract = humanReadableCenterContractFromKu(ku as Record<string, unknown>);
  const missionRaw =
    String(ku.answerMode || ku.routeClass || "analysis").trim() || "analysis";
  const mission = humanReadableAnswerModeForSurface(missionRaw);
  const oneStepType =
    String(ku.answerFrame || responsePlan?.answerFrame || "one_step").trim() || "one_step";
  const lawsN = Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0;
  const eviN = Array.isArray(ku.evidenceIds) ? ku.evidenceIds.length : 0;
  const pmRaw = String(ku?.sourceStackSummary?.primaryMeaning || "").trim();
  const axRaw = String(ku?.sourceStackSummary?.responseAxis || "").trim();
  const sourceHint = humanizeProseKhslLawKeys(
    pmRaw
      ? humanizeCenterKeyForDisplay(pmRaw)
      : humanizeResponseAxisForDisplay(humanizeCenterKeyForDisplay(axRaw))
  );
  const spRawForEvidence = String(ku.sourcePack ?? "").trim();
  /** MAINLINE_WILL_LAW_SOURCE_VISIBLE_REPAIR_V1: 根拠行を短文・人間可読に（sourcePack 英語直出しを避ける） */
  const evidencePack = buildHumanReadableEvidenceFootingLineV1({
    centerContract: centerContract,
    lawsN,
    eviN,
    sourceHint,
    sourcePackRaw: spRawForEvidence,
  });
  const userMessageForSurface = String(
    (out as { rawMessage?: string }).rawMessage ?? ku.inputText ?? ""
  ).trim();
  const sourceFootingClause = buildSourcePackFootingClauseV1(ku as Record<string, unknown>);

  let body = String(out.response || "").trim();

  // HUMAN_READABLE_LAW_LAYER_V1: responsePlan 表示面の raw law key を抑える（契約フィールド routeReason は不変）
  try {
    if (responsePlan && typeof (responsePlan as any).semanticBody === "string") {
      const sem = String((responsePlan as any).semanticBody || "");
      if (sem.includes("KHSL:LAW:")) {
        (responsePlan as any).semanticBody = humanizeProseKhslLawKeys(sem);
      }
    }
  } catch {}

  const __beautyThin = isBeautyCompositionFinalizeThinV1(ku);

  // MEANING_COMPILER_V1: semanticBody → 命題/原理/還元/次軸 を表面へ還元（薄い 100 字級との乖離を縮小）
  // beauty composition は理→情→余韻の本文を優先し、compiler で置換しない
  if (!__beautyThin) {
    try {
      const __mc = buildMeaningCompilerProseV1({
        semanticBody: String(responsePlan?.semanticBody ?? ""),
        responseSurface: body,
        thoughtCoreSummary: ku.thoughtCoreSummary,
        binderSummary: ku.binderSummary,
        sourceStackSummary: ku.sourceStackSummary,
        densityContract: (responsePlan?.densityContract as DensityContractV1 | null | undefined) ?? null,
      });
      if (__mc?.prose) {
        body = __mc.prose;
        ku.meaningCompilerTrace = __mc.trace;
      }
    } catch {}
  }

  if (!__beautyThin) {
    body = stripEmbeddedMechanicalBundleLinesV1(body);
    if (isTenmonPrincipleOrCanonProbeMessageV1(userMessageForSurface)) {
      body = stripDiagnosisTemplateParagraphsV1(body);
    }
  }

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

  /** MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1: semanticBody 主命題・内部束圧縮・問い過多抑制 */
  body = resealFinalMainlineSurfaceV1({
    routeReason: rr,
    semanticBody: String(responsePlan?.semanticBody ?? ""),
    surfaceBody: body,
    thoughtCoreSummary: ku.thoughtCoreSummary,
    binderSummary: ku.binderSummary,
    sourceStackSummary: ku.sourceStackSummary,
    sourcePack: ku.sourcePack,
    centerKey: ku.centerKey,
    centerLabel: ku.centerLabel,
    scriptureKey: ku.scriptureKey,
    beautyMode: __beautyThin,
  });

  /** MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1: 一般論先頭剥がし＋ semantic 第2層補強 */
  if (!__beautyThin) {
    body = applySurfaceMeaningDensityRepairV1(body, String(responsePlan?.semanticBody ?? ""));
  }

  /** LONGFORM_DENSITY_PROFILE_V1: lengthMode 実質化＋長文帯の段落整理・末尾 N 問まで */
  const __explicitReq = Number((ku as any)?.explicitLengthRequested || 0);
  /** LONGFORM ascent: 中帯（〜1600字）を早めに長文化パイプへ載せる */
  const __longformSurface =
    ku.answerLength === "long" || __explicitReq >= 600 || body.length >= 520;
  if (__longformSurface) {
    body = applyLongformDensityProfileV1({
      body,
      semanticBody: String(responsePlan?.semanticBody ?? ""),
      beautyMode: __beautyThin,
    });
  }

  /** MAINLINE_ASK_OVERUSE_KILL_V1（表面束）: 同型問い連打抑止＋本文疑問符（beauty 以外は1） */
  if (!__beautyThin) {
    body = suppressInterrogativeTemplateSpamV1(body);
    body = clampQuestionMarksInProseV1(body, 1);
  }

  /** 哲学・原理プローブが会話系診断テンプレへ誤って載った場合の本文救済（routeReason は不変） */
  body = repairSystemDiagnosisBodyIfMisappliedV1(body, rr, userMessageForSurface);

  body = humanizeProseKhslLawKeys(body);
  body = stripInternalApiKeysFromSurfaceProseV1(body);

  if (__beautyThin) {
    const __auxBeauty =
      "（補助）余韻で足りるなら、次に残すのは一行の芯だけでよい。";
    out.response = `【天聞の所見】\n\n${body}\n\n${__auxBeauty}`.trim();
    attachOmegaContractToOutKuV1(
      out as Record<string, unknown>,
      ku,
      responsePlan,
      String(out.response),
      __auxBeauty,
      "shaped"
    );
    appendConversationDensityLedgerRuntimeV1(out as Record<string, unknown>);
    try {
      tryAppendEvolutionLedgerSnapshotOnceV1(out as Record<string, unknown>);
    } catch {}
    return out;
  }

  const head = buildMainlineTenmonHeadV1({
    ku: ku as Record<string, unknown>,
    centerContract,
    mission,
    userMessage: userMessageForSurface,
    sourceFootingClause,
  });
  const step =
    oneStepType === "statement_plus_one_question"
      ? "（補助）次の一手: 判断軸を一つ選び、そこから深める。"
      : "（補助）次の一手: 中心を一つ保ち、次に見る点を一つ決める。";
  const composed = [head, body, evidencePack, step].filter(Boolean).join("\n\n").trim();
  out.response = composed;
  attachOmegaContractToOutKuV1(
    out as Record<string, unknown>,
    ku,
    responsePlan,
    String(out.response),
    step,
    "shaped"
  );
  appendConversationDensityLedgerRuntimeV1(out as Record<string, unknown>);
  try {
    tryAppendEvolutionLedgerSnapshotOnceV1(out as Record<string, unknown>);
  } catch {}
  return out;
}
