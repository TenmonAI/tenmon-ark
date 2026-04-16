/**
 * TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_CURSOR_AUTO_V1
 * truth structure 裁定 + mixed question 密度 + NATURAL_GENERAL 直落ちガードを束ねる（answer 生成はしない）。
 * routeReason / decisionFrame は変更しない。
 */

import {
  resolveTruthStructureVerdictV1,
  type TruthStructureVerdictV1,
} from "./tenmonTruthStructureReasonerV1.js";

export const TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_CARD_V1 =
  "TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_CURSOR_AUTO_V1" as const;

export const TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_TRACE_CARD_V1 =
  "TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_TRACE_CURSOR_AUTO_V1" as const;

/** scripture / 一般 / 法則 / 天聞 等が重なる mixed 意図（ヒューリスティック） */
function isMixedQuestionIntentV1(msg: string): boolean {
  const m = msg;
  const scripture = /法華|経典|言霊|古事記|神話|五十音|カタカムナ|SCRIPTURE|TENMON_SCRIPTURE/u.test(m);
  const worldly = /一般|人生|実装|API|仕事|相談|技術|コード|バグ|哲学|虚無|意味/u.test(m);
  const lawBridge = /水火|火水|法則|律|KHS|天聞|アーク|接点|中心と/u.test(m);
  if ((scripture && worldly) || (scripture && lawBridge) || (worldly && lawBridge)) return true;
  return /TENMON-ARKの理解|法華経の中心と水火/u.test(m);
}

function isNaturalGeneralLlmTopOnlyV1(routeReason: string): boolean {
  const r = String(routeReason || "").trim();
  return r === "NATURAL_GENERAL_LLM_TOP" || r === "NATURAL_GENERAL_LLM_TOP_V1";
}

export type TruthReasoningMixedTraceV1 = {
  truthStructureTraceNeeded: boolean;
  mixedQuestionTuneNeeded: boolean;
  rootReasoningRouteGuardFailed: boolean;
  nextCardIfFail: string | null;
  truthStructureTraceCard: "TENMON_TRUTH_STRUCTURE_TRACE_CURSOR_AUTO_V1" | null;
  mixedQuestionTuneCard: "TENMON_MIXED_QUESTION_QUALITY_TUNE_CURSOR_AUTO_V1" | null;
  rootReasoningRouteGuardCard: "TENMON_ROOT_REASONING_ROUTE_GUARD_CURSOR_AUTO_V1" | null;
};

export type TruthReasoningAndMixedQuestionBundleV1 = {
  card: typeof TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_CARD_V1;
  version: 1;
  truthStructureVerdict: TruthStructureVerdictV1 | null;
  mixedQuestionIntent: boolean;
  /** mixed かつ NATURAL_GENERAL のみ → false（fail-closed） */
  rootReasoningRouteGuardReady: boolean;
  /** ガード通過かつ verdict あり */
  mixedQuestionQualityReady: boolean;
  truthStructureReasoningReady: boolean;
  verdictProjectionReady: boolean;
  trace: TruthReasoningMixedTraceV1;
};

/**
 * truth structure + mixed / route guard を一度に解決。
 */
export function resolveTruthReasoningAndMixedQuestionV1(
  message: string,
  routeReason?: string,
): TruthReasoningAndMixedQuestionBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const rr = String(routeReason || "").trim();

  const truthStructureVerdict = resolveTruthStructureVerdictV1(msg, rr);
  const mixedQuestionIntent = isMixedQuestionIntentV1(msg);
  const naturalOnly = isNaturalGeneralLlmTopOnlyV1(rr);
  const rootReasoningRouteGuardReady = !(mixedQuestionIntent && naturalOnly);
  const mixedQuestionQualityReady = rootReasoningRouteGuardReady && truthStructureVerdict != null;
  const truthStructureReasoningReady = truthStructureVerdict != null;
  const verdictProjectionReady = truthStructureVerdict != null;

  const truthStructureTraceNeeded = truthStructureVerdict == null && msg.length >= 2;
  const rootReasoningRouteGuardFailed = mixedQuestionIntent && naturalOnly;
  /** ガード通過・verdict ありだが mixed 密度補修が必要な可能性（単軸 tune・広域改変なし） */
  const mixedQuestionTuneNeeded =
    mixedQuestionIntent &&
    rootReasoningRouteGuardReady &&
    truthStructureVerdict != null &&
    /説明して|詳しく|接点を|理解として/u.test(msg);

  let nextCardIfFail: string | null = null;
  if (rootReasoningRouteGuardFailed && truthStructureTraceNeeded) {
    nextCardIfFail = TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_TRACE_CARD_V1;
  } else if (rootReasoningRouteGuardFailed) {
    nextCardIfFail = "TENMON_ROOT_REASONING_ROUTE_GUARD_CURSOR_AUTO_V1";
  } else if (truthStructureTraceNeeded) {
    nextCardIfFail = "TENMON_TRUTH_STRUCTURE_TRACE_CURSOR_AUTO_V1";
  } else if (mixedQuestionTuneNeeded) {
    nextCardIfFail = "TENMON_MIXED_QUESTION_QUALITY_TUNE_CURSOR_AUTO_V1";
  }

  const trace: TruthReasoningMixedTraceV1 = {
    truthStructureTraceNeeded,
    mixedQuestionTuneNeeded,
    rootReasoningRouteGuardFailed,
    nextCardIfFail,
    truthStructureTraceCard: truthStructureTraceNeeded ? "TENMON_TRUTH_STRUCTURE_TRACE_CURSOR_AUTO_V1" : null,
    mixedQuestionTuneCard: mixedQuestionTuneNeeded ? "TENMON_MIXED_QUESTION_QUALITY_TUNE_CURSOR_AUTO_V1" : null,
    rootReasoningRouteGuardCard: rootReasoningRouteGuardFailed ? "TENMON_ROOT_REASONING_ROUTE_GUARD_CURSOR_AUTO_V1" : null,
  };

  return {
    card: TENMON_TRUTH_REASONING_AND_MIXED_QUESTION_CARD_V1,
    version: 1,
    truthStructureVerdict,
    mixedQuestionIntent,
    rootReasoningRouteGuardReady,
    mixedQuestionQualityReady,
    truthStructureReasoningReady,
    verdictProjectionReady,
    trace,
  };
}
