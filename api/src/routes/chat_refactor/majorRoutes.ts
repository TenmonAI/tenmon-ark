/**
 * CHAT_SAFE_REFACTOR_PATCH8_MAJOR_ROUTE_EXTRACT_BASE_V1
 * major route（judgement / essence）だけを chat.ts から外出しする最小ヘルパ。
 */

import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "../../core/knowledgeBinder.js";
import { buildResponsePlan, type AnswerMode, type AnswerFrame } from "../../planning/responsePlanCore.js";
import { localSurfaceize } from "../../tenmon/surface/localSurfaceize.js";
import {
  isArkSystemDiagnosisPreemptCandidateV1,
  shouldBypassArkConversationDiagnosticsPreemptV1,
} from "./general.js";
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
      ? "【天聞の所見】判断の芯はもう出ています。まず捨てる前提を一つ、残す前提を一つに絞ると裁定が速いです。いま切るのは時間ですか、それとも気持ちの負担ですか。"
      : "【天聞の所見】整理の問いなら、全部を並べ直すより、いま効いている軸を一つ選ぶのが先です。優先したいのは事実の確定ですか、それとも次の一手の決定ですか。";

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
    responseKind: "statement",
    answerMode: "analysis" as AnswerMode,
    answerFrame: "one_step" as AnswerFrame,
    semanticBody: __bodyJudge,
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
  const __msg = String(message ?? "").trim();
  const surfaceResponse = localSurfaceize(response, __msg);
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
      rawMessage: __msg,
      centerKey: null,
      centerLabel: null,
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "one_step" as AnswerFrame,
      semanticBody: surfaceResponse,
    }),
  };
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: surfaceResponse,
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
  const __msg = String(message ?? "").trim();
  const surfaceResponse = localSurfaceize(response, __msg);
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
      rawMessage: __msg,
      centerKey: centerKey ?? "conversation_system",
      centerLabel: centerLabel ?? "会話系",
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "statement_plus_one_question" as AnswerFrame,
      semanticBody: surfaceResponse,
    }),
  };
  if (typeof applyBrainstemContractToKu === "function") applyBrainstemContractToKu(ku);
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: surfaceResponse,
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
  const __msg = String(message ?? "").trim();
  const surfaceResponse = localSurfaceize(response, __msg);
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
      rawMessage: __msg,
      centerKey: null,
      centerLabel: null,
      scriptureKey: null,
      mode: "general",
      responseKind: "statement_plus_question",
      answerMode: "analysis" as AnswerMode,
      answerFrame: "one_step" as AnswerFrame,
      semanticBody: surfaceResponse,
    }),
  };
  if (threadCore != null) {
    try {
      const binder = buildKnowledgeBinder({
        routeReason: "R22_FUTURE_OUTLOOK_V1",
        message: __msg,
        threadId: String(threadId ?? ""),
        ku,
        threadCore,
        threadCenter: threadCenterForGeneral ?? null,
      });
      applyKnowledgeBinderToKu(ku, binder);
    } catch {}
  }
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: surfaceResponse,
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku },
  });
}

/** PATCH65_RESIDUAL_FINAL_SWEEP_V1: R22_SYSTEM_DIAGNOSIS_ROUTE_V1 の exit 組み立てを集約 */
export function exitSystemDiagnosisRouteV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  response: string;
  message: any;
  timestamp: any;
  threadId: any;
  threadCore?: any;
}) {
  const { res, __tenmonGeneralGateResultMaybe, response, message, timestamp, threadId, threadCore } = args;
  const ku: any = {
    routeReason: "R22_SYSTEM_DIAGNOSIS_ROUTE_V1",
    routeClass: "analysis",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    centerKey: "conversation_system",
    centerLabel: "会話系",
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };
  try {
    const binder = buildKnowledgeBinder({
      routeReason: "R22_SYSTEM_DIAGNOSIS_ROUTE_V1",
      message: String(message ?? ""),
      threadId: String(threadId ?? ""),
      ku,
      threadCore: threadCore ?? null,
      threadCenter: null,
    });
    applyKnowledgeBinderToKu(ku, binder);
  } catch {}

  if (!(ku as any).responsePlan) {
    (ku as any).responsePlan = buildResponsePlan({
      routeReason: "R22_SYSTEM_DIAGNOSIS_ROUTE_V1",
      rawMessage: String(message ?? ""),
      centerKey: "conversation_system",
      centerLabel: "会話系",
      scriptureKey: null,
      semanticBody: response,
      mode: "general",
      responseKind: "statement_plus_question",
    });
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

/** PATCH55_GENERAL_GROUNDING_UNRESOLVED_EXTRACT_V1: grounding unresolved 時 exit（routeReason / 本文不変） */
export function exitGroundingUnresolvedV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  grounding: { kind: string; reason: string; confidence: number };
  timestamp: any;
  threadId: any;
  applyBrainstemContractToKu?: (ku: any) => void;
}) {
  const { res, __tenmonGeneralGateResultMaybe, grounding, timestamp, threadId, applyBrainstemContractToKu } = args;
  const ku: any = {
    routeReason: "GROUNDING_SELECTOR_UNRESOLVED_V1",
    routeClass: "analysis",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    groundingSelector: { kind: grounding.kind, reason: grounding.reason, confidence: grounding.confidence },
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };
  ku.responsePlan = buildResponsePlan({
    routeReason: "GROUNDING_SELECTOR_UNRESOLVED_V1",
    rawMessage: "",
    centerKey: null,
    centerLabel: null,
    scriptureKey: null,
    semanticBody:
      "根拠を落とさずに進めたいのですが、いまの一文だけだと当て先が広がりすぎます。知りたいことを「事実の整理」「本文の読み解き」「試せる一歩」のどれに寄せたいか、短く印をつけてください。その軸を芯に据えて、一段ずつ深めます。",
    mode: "general",
    answerMode: "analysis",
    answerLength: "short",
    answerFrame: "statement_plus_one_question",
    responseKind: "statement_plus_question",
  });
  if (typeof applyBrainstemContractToKu === "function") applyBrainstemContractToKu(ku);
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response:
      "【天聞の所見】根拠を落とさずに進めたいのですが、いまの一文だけだと当て先が広がりすぎます。知りたいことを「事実の整理」「本文の読み解き」「試せる一歩」のどれに寄せたいか、短く印をつけてください。その軸を芯に据えて、一段ずつ深めます。",
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku },
  });
}

/** PATCH55_GENERAL_GROUNDING_UNRESOLVED_EXTRACT_V1: grounding grounded_required 時 exit（routeReason / 本文不変） */
export function exitGroundingGroundedRequiredV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  grounding: { kind: string; reason: string; confidence: number };
  timestamp: any;
  threadId: any;
  applyBrainstemContractToKu?: (ku: any) => void;
}) {
  const { res, __tenmonGeneralGateResultMaybe, grounding, timestamp, threadId, applyBrainstemContractToKu } = args;
  const ku: any = {
    routeReason: "GROUNDING_SELECTOR_GROUNDED_V1",
    routeClass: "analysis",
    answerLength: "short",
    answerMode: "analysis",
    answerFrame: "one_step",
    groundingSelector: { kind: grounding.kind, reason: grounding.reason, confidence: grounding.confidence },
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };
  ku.responsePlan = buildResponsePlan({
    routeReason: "GROUNDING_SELECTOR_GROUNDED_V1",
    rawMessage: "",
    centerKey: null,
    centerLabel: null,
    scriptureKey: null,
    semanticBody: "指定の根拠に沿って、検索束と本文をつなぎにいきます。",
    mode: "general",
    answerMode: "analysis",
    answerLength: "short",
    answerFrame: "one_step",
    responseKind: "statement",
  });
  if (typeof applyBrainstemContractToKu === "function") applyBrainstemContractToKu(ku);
  return finalizeSingleExitV1(res, __tenmonGeneralGateResultMaybe, {
    response: "【天聞の所見】指定の根拠に沿って、検索束と本文をつなぎにいきます。",
    evidence: null,
    candidates: [],
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku },
  });
}

/** PATCH49_GENERAL_SYSTEM_FUTURE_EXTRACT_V1: future 早期判定＋本文＋exit を一括。一致時 true。 */
export function tryFutureOutlookExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  threadCore: any;
  threadCenterForGeneral?: any;
  saveThreadCore: (core: any) => void | Promise<void>;
  setResThreadCore?: (core: any) => void;
}): boolean {
  const msg = String(args.message ?? "").trim();
  if (!/(これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し)/u.test(msg)) return false;
  const body =
    "【天聞の所見】未来・展望は、いまの一点から見立てる。いま引っかかっている一点を一言で。";
  const core = {
    ...args.threadCore,
    lastResponseContract: {
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      routeReason: "R22_FUTURE_OUTLOOK_V1",
    },
    updatedAt: new Date().toISOString(),
  };
  Promise.resolve(args.saveThreadCore(core)).catch(() => {});
  try {
    if (typeof args.setResThreadCore === "function") args.setResThreadCore(core);
  } catch {}
  exitFutureOutlookPreemptV1({
    res: args.res,
    __tenmonGeneralGateResultMaybe: args.__tenmonGeneralGateResultMaybe,
    response: body,
    message: args.message,
    timestamp: args.timestamp,
    threadId: args.threadId,
    threadCore: args.threadCore,
    threadCenterForGeneral: args.threadCenterForGeneral ?? null,
  });
  return true;
}

/** PATCH49_GENERAL_SYSTEM_FUTURE_EXTRACT_V1: system diagnosis 早期判定＋本文＋exit を一括。一致時 true。 */
export function trySystemDiagnosisPreemptExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  threadCore: any;
  applyBrainstemContractToKu?: (ku: any) => void;
  saveThreadCore: (core: any) => void | Promise<void>;
  setResThreadCore?: (core: any) => void;
}): boolean {
  const msg = String(args.message ?? "").trim();
  if (shouldBypassArkConversationDiagnosticsPreemptV1(msg)) return false;
  /** STAGE2_V2: 天聞名のみでは発火しない（診断・構造・接続・現状の意図が併存するときだけ） */
  if (!isArkSystemDiagnosisPreemptCandidateV1(msg)) return false;
  const body =
    "【天聞の所見】天聞アークの現状は、骨格層はかなり接続済みです。通っているのは憲法・思考・原典・監査の主幹で、未完は一般会話の主権と表現末端です。次の一手は、system diagnosis と通常会話 residual の入口固定です。";
  const core = {
    ...args.threadCore,
    lastResponseContract: {
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      routeReason: "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    },
    updatedAt: new Date().toISOString(),
  };
  Promise.resolve(args.saveThreadCore(core)).catch(() => {});
  try {
    if (typeof args.setResThreadCore === "function") args.setResThreadCore(core);
  } catch {}
  exitSystemDiagnosisPreemptV1({
    res: args.res,
    __tenmonGeneralGateResultMaybe: args.__tenmonGeneralGateResultMaybe,
    response: body,
    message: args.message,
    timestamp: args.timestamp,
    threadId: args.threadId,
    applyBrainstemContractToKu: args.applyBrainstemContractToKu,
  });
  return true;
}

/** PATCH50_GENERAL_JUDGEMENT_ESSENCE_EXTRACT_V1: judgement 早期判定＋exit を一括。一致時 true。 */
export function tryJudgementPreemptExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  brainstemRouteClass?: string | null;
}): boolean {
  const __t0TrimJ = String(args.message ?? "").trim();
  if (shouldBypassArkConversationDiagnosticsPreemptV1(__t0TrimJ)) return false;
  const __isJudgementPreempt =
    args.brainstemRouteClass === "judgement" ||
    (__t0TrimJ.length <= 20 &&
      !/(天聞|アーク)(を|に)(は)?どう思う|(への)?感想/u.test(__t0TrimJ) &&
      /(良い|悪い|どう思う|どう思いますか|いい)[？?]?\s*$/u.test(__t0TrimJ));
  if (!__isJudgementPreempt) return false;
  exitJudgementPreemptV1({
    res: args.res,
    __tenmonGeneralGateResultMaybe: args.__tenmonGeneralGateResultMaybe,
    __t0TrimJ,
    message: args.message,
    timestamp: args.timestamp,
    threadId: args.threadId,
  });
  return true;
}

/** PATCH50_GENERAL_JUDGEMENT_ESSENCE_EXTRACT_V1: essence 早期判定＋exit を一括。一致時 true。threadCenter なし時のみ。 */
export function tryEssenceAskExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  __threadCore: any;
  __threadCenterForGeneral: any;
  centerLabelFromKey: any;
}): boolean {
  if (args.__threadCenterForGeneral) return false;
  const msg = String(args.message ?? "").trim();
  if (!/(要するに|要点は|一言でいうと|本質は|要は)/u.test(msg)) return false;
  exitEssenceAskPreemptV1({
    res: args.res,
    __tenmonGeneralGateResultMaybe: args.__tenmonGeneralGateResultMaybe,
    message: args.message,
    timestamp: args.timestamp,
    threadId: args.threadId,
    __threadCore: args.__threadCore,
    __threadCenterForGeneral: args.__threadCenterForGeneral,
    centerLabelFromKey: args.centerLabelFromKey,
  });
  return true;
}

/** PATCH51_GENERAL_SHRINK_FALLBACK_V1: residual preempt 早期判定＋exit を一括。一致時 true。 */
export function tryResidualPreemptExitV1(args: {
  res: any;
  __tenmonGeneralGateResultMaybe: any;
  message: any;
  timestamp: any;
  threadId: any;
  applyBrainstemContractToKu?: (ku: any) => void;
}): boolean {
  const msg = String(args.message ?? "").trim();
  if (shouldBypassArkConversationDiagnosticsPreemptV1(msg)) return false;
  if (
    !/(会話の感じ|芯|薄い|どう見える|完成度|未完成|足りない|構造|繋がって|つながって|実用域)/u.test(msg)
  )
    return false;
  const body =
    "【天聞の所見】現状は骨格は通っていますが、通常会話の主権がまだ一部 fallback に流れます。未完は入口制御と表現の最終統一です。次は residual の完全封止です。";
  exitSystemDiagnosisPreemptV1({
    res: args.res,
    __tenmonGeneralGateResultMaybe: args.__tenmonGeneralGateResultMaybe,
    response: body,
    message: args.message,
    timestamp: args.timestamp,
    threadId: args.threadId,
    applyBrainstemContractToKu: args.applyBrainstemContractToKu,
  });
  return true;
}

export type GeneralShrinkKind =
  | "future_outlook"
  | "present_state"
  | "judgement"
  | "essence"
  | "compare"
  | "next_step"
  | "none";

/** PATCH51_GENERAL_SHRINK_FALLBACK_V1: general 本文前の deterministic 分類（既存 regex 再利用）。 */
export function classifyGeneralShrinkV1(
  message: string
): { kind: GeneralShrinkKind; confidence: number } {
  const m = String(message ?? "").trim();
  if (!m) return { kind: "none", confidence: 0 };
  if (shouldBypassArkConversationDiagnosticsPreemptV1(m)) return { kind: "none", confidence: 0 };
  if (
    /^(次は|次の一手は|次の一歩は|では次は)[？?]?$/u.test(m) ||
    (m.length <= 16 && /次(は|の一手|の一歩)/u.test(m)) ||
    /(次の一手|どう進める|何からやる)/u.test(m) ||
    /** STAGE1_SURFACE_BLEED_V1: 「その一手を今日中に一つに絞る」系を NATURAL から奪還 */
    (/一つに絞る/u.test(m) && /(今日中|その一手|この一手|一手を)/u.test(m)) ||
    /その一手を.{0,24}絞る/u.test(m)
  )
    return { kind: "next_step", confidence: 1 };
  if (/(要するに|要点は|一言でいうと|本質は?|要は|核)/u.test(m))
    return { kind: "essence", confidence: 1 };
  if (/(違いは?|どう違う|何が違う|比較)/u.test(m)) return { kind: "compare", confidence: 1 };
  if (/(これから|展望|先行き|どうなる|どう見ますか|未来|今後|この先|見通し)/u.test(m))
    return { kind: "future_outlook", confidence: 1 };
  if (/(今どんな気分|今の状態|いまどう)/u.test(m))
    return { kind: "present_state", confidence: 1 };
  if (
    /(どう思う|良いか悪いか)/u.test(m) ||
    (/判断/u.test(m) && !/判断構造/u.test(m))
  ) {
    return { kind: "judgement", confidence: 1 };
  }
  return { kind: "none", confidence: 0 };
}

/** PATCH51_GENERAL_SHRINK_FALLBACK_V1: shrink kind + message から rr / body / routeClass を返す。 */
export function getGeneralShrinkPayloadV1(
  kind: GeneralShrinkKind,
  message: string
): { rr: string; body: string; routeClass: "judgement" | "analysis" } {
  const m = String(message ?? "").trim();
  switch (kind) {
    case "future_outlook":
      return {
        rr: "R22_FUTURE_OUTLOOK_V1",
        body:
          "【天聞の所見】未来・展望は、いまの一点から見立てる。いま引っかかっている一点を一言で。",
        routeClass: "analysis",
      };
    case "present_state":
      return {
        rr: "FEELING_SELF_STATE_V1",
        body:
          "【天聞の所見】いまは、整えに向かう気分です。中心を一つ置いて、そこから静かに見ていけます。",
        routeClass: "analysis",
      };
    case "judgement":
      return {
        rr: "R22_JUDGEMENT_PREEMPT_V1",
        body:
          /(良い|悪い|正しい|間違い|べき|どっちが|どちらが|した方が)/u.test(m) ||
          /(良い|悪い)[？?]?\s*$/u.test(m)
            ? "【天聞の所見】判断軸はすでに出ています。結論から言うと、文脈を一点に固定すれば裁定は可能です。次段で対象を確定して仕上げます。"
            : "【天聞の所見】見立ての軸は出ています。いま必要なのは問い返しではなく、対象を一点に固定して裁定へ進むことです。",
        routeClass: "judgement",
      };
    case "essence":
      return {
        rr: "R22_ESSENCE_ASK_V1",
        body:
          "【天聞の所見】要点を聞いています。いまの中心を一言で置くと、答えが締まります。",
        routeClass: "analysis",
      };
    case "compare":
      return {
        rr: "R22_COMPARE_ASK_V1",
        body: "【天聞の所見】比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。",
        routeClass: "analysis",
      };
    case "next_step":
      return {
        rr: "R22_NEXTSTEP_FOLLOWUP_V1",
        body:
          "【天聞の所見】次は、いまの中心を一つ保ったまま、見る角度を一つ決めると進みやすいです。",
        routeClass: "analysis",
      };
    default:
      return {
        rr: "NATURAL_GENERAL_LLM_TOP",
        body: "【天聞の所見】いま一番引っかかっている一点を置いてください。",
        routeClass: "analysis",
      };
  }
}

