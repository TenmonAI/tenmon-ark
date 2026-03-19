/**
 * CHAT_SAFE_REFACTOR_PATCH8_MAJOR_ROUTE_EXTRACT_BASE_V1
 * major route（judgement / essence）だけを chat.ts から外出しする最小ヘルパ。
 */

import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "../../core/knowledgeBinder.js";
import { buildResponsePlan, type AnswerMode, type AnswerFrame } from "../../planning/responsePlanCore.js";
import { finalizeSingleExitV1 } from "./finalize.js";

export function exitJudgementPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  __t0TrimJ: string;
  message: any;
  timestamp: any;
  threadId: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, __t0TrimJ, message, timestamp, threadId } = args;

  const __bodyJudge =
    /(良い|悪い|正しい|間違い|べき|どっちが|どちらが|した方が)/u.test(__t0TrimJ) ||
    /(良い|悪い)[？?]?\s*$/u.test(__t0TrimJ)
      ? "【天聞の所見】判断軸はすでに出ています。結論から言うと、文脈を一点に固定すれば裁定は可能です。次段で対象を確定して仕上げます。"
      : "【天聞の所見】見立ての軸は出ています。いま必要なのは問い返しではなく、対象を一点に固定して裁定へ進むことです。";

  const __kuJudgement: any = {
    routeReason: "R22_JUDGEMENT_PREEMPT_V1",
    routeClass: "judgement",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };

  __kuJudgement.responsePlan = buildResponsePlan({
    routeReason: "R22_JUDGEMENT_PREEMPT_V1",
    rawMessage: String(message ?? ""),
    centerKey: null,
    centerLabel: null,
    mode: "general",
    responseKind: "statement_plus_question",
    answerMode: "analysis" as AnswerMode,
    answerFrame: "one_step" as AnswerFrame,
    semanticBody:
      "【天聞の所見】次に直すべきは、通常会話の残差ではなく ask-overuse の解消です。判断系は問い返しを減らし、対象を固定して短く裁定する段階に入っています。",
  });

  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: __bodyJudge,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku: __kuJudgement,
    },
  });
}

export function exitEssenceAskPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  __threadCore: any;
  __threadCenterForGeneral: any;
  centerLabelFromKey: any;
}) {
  const {
    res,
    __tenmonGeneralGateResultMaybe,
    message,
    timestamp,
    threadId,
    __threadCore,
    __threadCenterForGeneral,
    centerLabelFromKey,
  } = args;

  const __kuEssenceAsk: any = {
    routeReason: "R22_ESSENCE_ASK_V1",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };

  try {
    const __binderEA = buildKnowledgeBinder({
      routeReason: "R22_ESSENCE_ASK_V1",
      message: String(message ?? ""),
      threadId: String(threadId ?? ""),
      ku: __kuEssenceAsk,
      threadCore: __threadCore,
      threadCenter: null,
    });
    applyKnowledgeBinderToKu(__kuEssenceAsk, __binderEA);
  } catch {}

  const __centerKeyEssAsk =
    String((__kuEssenceAsk as any).centerKey || "").trim() ||
    String((__threadCenterForGeneral as any)?.center_key || "").trim() ||
    String(__threadCore?.centerKey || "").trim() ||
    "";

  const __centerLabelEssAsk =
    String((__kuEssenceAsk as any).centerLabel || "").trim() ||
    (typeof centerLabelFromKey === "function"
      ? String(centerLabelFromKey(__centerKeyEssAsk) || "").trim()
      : "") ||
    String(__threadCore?.centerLabel || "").trim() ||
    "";

  const __respEssAsk =
    "【天聞の所見】要点を聞いています。いまの中心を一言で置くと、答えが締まります。";

  if (!(__kuEssenceAsk as any).answerMode) (__kuEssenceAsk as any).answerMode = "analysis";
  if (!(__kuEssenceAsk as any).answerFrame) (__kuEssenceAsk as any).answerFrame = "statement_plus_one_question";

  (__kuEssenceAsk as any).responsePlan = buildResponsePlan({
    routeReason: "R22_ESSENCE_ASK_V1",
    rawMessage: String(message ?? ""),
    centerKey: null,
    centerLabel: null,
    mode: "general",
    responseKind: "statement_plus_question",
    answerMode: "analysis" as AnswerMode,
    answerFrame: "one_step" as AnswerFrame,
    semanticBody: "【天聞の所見】要点を聞いています。いまの中心を一言で置くと、答えが締まります。",
  });

  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: __respEssAsk,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: __kuEssenceAsk },
  });
}

export function exitStructureLockV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId } = args;

  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response:
      "【天聞の所見】天聞アークは、脳幹で中心を決め、正典と記憶を照合し、最後に会話として投影する構造です。言い換えると、判断核・証拠核・表現核を分離して循環させるための器です。脳幹・正典・会話生成のどこから見ますか。",
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: "openai",
      ku: {
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        routeReason: "TENMON_STRUCTURE_LOCK_V1",
        answerLength: "medium",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
        responsePlan: buildResponsePlan({
          routeReason: "TENMON_STRUCTURE_LOCK_V1",
          rawMessage: String(message ?? ""),
          centerKey: null,
          centerLabel: null,
          scriptureKey: null,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: "define" as AnswerMode,
          answerFrame: "statement_plus_one_question" as AnswerFrame,
          semanticBody:
            "【天聞の所見】天聞アークは、脳幹で中心を決め、正典と記憶を照合し、最後に会話として投影する構造です。言い換えると、判断核・証拠核・表現核を分離して循環させるための器です。脳幹・正典・会話生成のどこから見ますか。",
        }),
      },
    },
  });
}

export function exitExplicitCharPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: any;
  ku: any;
  timestamp: any;
  threadId: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, response, ku, timestamp, threadId } = args;

  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku,
    },
  });
}

/** PATCH31_STRICT_COMPARE_DETECT_EXTRACT_V1: 条件判定＋本文＋exit を一括。一致時 true、不一致時 false。 */
export function tryStrictCompareExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  shapeTenmonOutput: (input: string, suffix: string) => string;
  bodyOverride?: string;
}): boolean {
  const { res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId, shapeTenmonOutput, bodyOverride } = args;
  const __strictCompareInput = String(message ?? "");
  if (
    /言霊|言灵/u.test(__strictCompareInput) &&
    /カタカムナ/u.test(__strictCompareInput) &&
    /違い|ちがい|比較|どう違う|分けて/u.test(__strictCompareInput)
  ) {
    const response =
      bodyOverride !== undefined && bodyOverride !== null
        ? bodyOverride
        : shapeTenmonOutput(__strictCompareInput, "");
    exitCompareStrictPreemptV1({
      res,
      __tenmonGeneralGateResultMaybe,
      response,
      message,
      timestamp,
      threadId,
    });
    return true;
  }
  return false;
}

/** PATCH27_MAJORROUTES_SECOND_WAVE_V1: strict compare 早期 exit（PATCH24 contract 保持） */
export function exitCompareStrictPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: string;
  message: any;
  timestamp: any;
  threadId: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, response, message, timestamp, threadId } = args;
  const ku: any = {
    routeReason: "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
    routeClass: "analysis",
    answerLength: "medium",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    responsePlan: buildResponsePlan({
      routeReason: "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
      rawMessage: String(message ?? ""),
      centerKey: null,
      centerLabel: null,
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "statement_plus_one_question" as AnswerFrame,
      semanticBody: response,
    }),
  };
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: {
      mode: "STRICT",
      intent: "compare",
      llm: null,
      ku,
    },
  });
}

/** PATCH27_MAJORROUTES_SECOND_WAVE_V1: selfaware 早期 exit（ARK / TENMON / CONSCIOUSNESS のいずれか） */
export function exitSelfAwarePreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: string;
  routeReason: string;
  message: any;
  timestamp: any;
  threadId: any;
  kuExtras?: { threadCenterKey?: string | null; threadCenterLabel?: string | null; brainstemPolicy?: string | null };
}) {
  const {
    res,
    __tenmonGeneralGateResultMaybe,
    response,
    routeReason,
    message,
    timestamp,
    threadId,
    kuExtras,
  } = args;
  const ku: any = {
    routeReason,
    routeClass: "selfaware",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    threadCenterKey: kuExtras?.threadCenterKey ?? null,
    threadCenterLabel: kuExtras?.threadCenterLabel ?? null,
    brainstemPolicy: kuExtras?.brainstemPolicy ?? null,
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    responsePlan: buildResponsePlan({
      routeReason,
      rawMessage: String(message ?? ""),
      centerKey: null,
      centerLabel: null,
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "one_step" as AnswerFrame,
      semanticBody: response,
    }),
  };
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku,
    },
  });
}

/** PATCH27_MAJORROUTES_SECOND_WAVE_V1: system diagnosis 早期 exit */
export function exitSystemDiagnosisPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: string;
  message: any;
  timestamp: any;
  threadId: any;
  centerKey?: string | null;
  centerLabel?: string | null;
  applyBrainstemContractToKu?: (ku: any) => void;
}) {
  const {
    res,
    __tenmonGeneralGateResultMaybe,
    response,
    message,
    timestamp,
    threadId,
    centerKey = "conversation_system",
    centerLabel = "会話系",
    applyBrainstemContractToKu,
  } = args;
  const rr = "SYSTEM_DIAGNOSIS_PREEMPT_V1";
  const ku: any = {
    routeReason: rr,
    routeClass: "analysis",
    centerKey: centerKey ?? "conversation_system",
    centerLabel: centerLabel ?? "会話系",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    responsePlan: buildResponsePlan({
      routeReason: rr,
      rawMessage: String(message ?? ""),
      centerKey: centerKey ?? "conversation_system",
      centerLabel: centerLabel ?? "会話系",
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "statement_plus_one_question" as AnswerFrame,
      semanticBody: response,
    }),
  };
  if (typeof applyBrainstemContractToKu === "function") applyBrainstemContractToKu(ku);
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku },
  });
}

/** PATCH27_MAJORROUTES_SECOND_WAVE_V1: future outlook 早期 exit（現行 contract 保持） */
export function exitFutureOutlookPreemptV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: string;
  message: any;
  timestamp: any;
  threadId: any;
  threadCore?: any;
  threadCenterForGeneral?: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, response, message, timestamp, threadId, threadCore, threadCenterForGeneral } = args;
  const ku: any = {
    routeReason: "R22_FUTURE_OUTLOOK_V1",
    routeClass: "analysis",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
    responsePlan: buildResponsePlan({
      routeReason: "R22_FUTURE_OUTLOOK_V1",
      rawMessage: String(message ?? ""),
      centerKey: null,
      centerLabel: null,
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "one_step" as AnswerFrame,
      semanticBody: response,
    }),
  };
  if (threadCore != null) {
    try {
      const binder = buildKnowledgeBinder({
        routeReason: "R22_FUTURE_OUTLOOK_V1",
        message: String(message ?? ""),
        threadId: String(threadId ?? ""),
        ku,
        threadCore,
        threadCenter: threadCenterForGeneral ?? null,
      });
      applyKnowledgeBinderToKu(ku, binder);
    } catch {}
  }
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku },
  });
}

