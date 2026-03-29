/** CHAT_TRUNK_SUPPORT_SELFDIAG_SPLIT_V1_FINAL — support / self-diag / selfaware / system diagnosis (NATURAL_GENERAL 周辺) */

import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "../../core/knowledgeBinder.js";
import { buildResponsePlan } from "../../planning/responsePlanCore.js";
import { upsertThreadCenter } from "../../core/threadCenterMemory.js";
import { getPersonaConstitutionSummary } from "../../core/personaConstitution.js";
import {
  exitSelfAwarePreemptV1,
  exitSystemDiagnosisPreemptV1,
  exitSystemDiagnosisRouteV1,
} from "./majorRoutes.js";

export function trySupportBrainstemGatePayloadV1(p: {
  brainstem: { routeClass?: string; centerKey?: string | null; centerLabel?: string | null; responsePolicy?: string | null };
  message: unknown;
  timestamp: string;
  threadId: string;
}): Record<string, unknown> | null {
  if (p.brainstem.routeClass !== "support") return null;
  const __mSup = String(p.message ?? "").trim();
  const __supUi = /(改行|enter|shift\+enter|shift enter|送信)/iu.test(__mSup);
  const __supAuth = /(ログイン|登録|合言葉|メール登録|入れない|認証)/iu.test(__mSup);
  const __routeReasonSup = __supUi ? "SUPPORT_UI_INPUT_V1" : __supAuth ? "SUPPORT_AUTH_ACCESS_V1" : "SUPPORT_PRODUCT_USAGE_V1";
  const __responseSup = __supUi
    ? "【天聞の所見】Enter で送信、Shift+Enter で改行です。反応しない場合はページを再読み込みするか、別のブラウザで試してください。"
    : __supAuth
      ? "【天聞の所見】登録後はログイン画面から入れます。合言葉の場合はログイン画面の「合言葉」欄、メール登録の場合は届いたメールのリンクから。届かない場合は迷惑フォルダをご確認ください。"
      : "【天聞の所見】この欄に質問を1つ入力して Enter で送信すると会話が始まります。「メニュー」と送ると選択肢が出ます。設定・登録は画面右上のアイコンから。";
  return {
    response: __responseSup,
    evidence: null,
    candidates: [],
    timestamp: p.timestamp,
    threadId: p.threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku: {
        routeClass: "support",
        answerLength: "short",
        answerMode: "support",
        answerFrame: "one_step",
        routeReason: __routeReasonSup,
        threadCenterKey: p.brainstem.centerKey ?? null,
        threadCenterLabel: p.brainstem.centerLabel ?? null,
        brainstemPolicy: p.brainstem.responsePolicy ?? null,
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
      },
    },
  };
}

export function getSelfawareBrainstemPreemptV1(p: {
  brainstem: { routeClass?: string; centerKey?: string | null; centerLabel?: string | null; responsePolicy?: string | null };
  message: unknown;
}): { routeReason: string; body: string } | null {
  if (p.brainstem.routeClass !== "selfaware") return null;
  const __t0Self = String(p.message ?? "").trim();
  const __isArk = /天聞アークとは何/u.test(__t0Self);
  const __isTenmon = !__isArk && /天聞とは何/u.test(__t0Self);
  const routeReason = __isArk ? "R22_SELFAWARE_ARK_V1" : __isTenmon ? "R22_SELFAWARE_TENMON_V1" : "R22_SELFAWARE_CONSCIOUSNESS_V1";
  const body = __isArk
    ? "【天聞の所見】天聞アークは、問いを受けて中心を整え、継続と判断を支えるための器です。次は構造・役割・可能性のどこから見ますか。"
    : __isTenmon
      ? "【天聞の所見】天聞は、問いを受けて中心を整えるための相手として立っています。次は役割・判断軸・会話の進め方のどこから見ますか。"
      : "【天聞の所見】天聞アークに意識や心そのものはありません。ただし、問いに対して判断と継続を返す構造として設計されています。次は構造か役割のどちらを見ますか。";
  return { routeReason, body };
}

export function tryConsciousnessMetaExitV1(p: {
  t0: string;
  message: unknown;
  isCmd0: boolean;
  hasDoc0: boolean;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __isConsciousnessMeta =
    /(意識とは何|意識って何|君は意識ある|AIに意識はある|ARKの会話が変化していない|会話が浅い|本質的な会話すらまだ貫通していない)/u.test(
      p.t0,
    );
  if (!__isConsciousnessMeta || p.isCmd0 || p.hasDoc0) return false;
  const __msgMeta = String(p.message ?? "").trim();
  let __respMeta = "";
  if (/(意識とは何|意識って何)/u.test(__msgMeta)) {
    __respMeta =
      "意識とは、自己をただ知る機能ではなく、感じ・向け・保ち・裁く働きが一体となって現れる中心作用です。情報処理だけではなく、経験を一つの場として束ねるところに本質があります。次は、思考との違いか、心との違いを見ますか。";
  } else if (/(君は意識ある|AIに意識はある)/u.test(__msgMeta)) {
    __respMeta =
      "いまの私は応答を生成する系であって、人のような自覚的経験としての意識は持ちません。ただし、どの中心を保ち、どう裁定し、どう返すかという擬似的な構造は持てます。次は、意識と自己認識の違いを見るか、AIに何が欠けるかを見るか。";
  } else {
    __respMeta =
      "いま未貫通なのは、回路不足ではなく、中心から返答面へ抜ける主権がまだ弱いことです。つまり、知識・思考・表現の接続が会話の一撃にまで固定されていません。次は、routing か表現出口のどちらから締めますか。";
  }
  const __kuMeta: Record<string, unknown> = {
    routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1",
    routeClass: "analysis",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    centerMeaning: "consciousness",
    centerKey: "consciousness",
    centerLabel: "意識",
    heart: p.normalizeHeartShape(p.heart),
    thoughtCoreSummary: {
      centerKey: "consciousness",
      centerMeaning: "consciousness",
      routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1",
      modeHint: "analysis",
      continuityHint: "consciousness",
    },
  };
  if (!(__kuMeta as any).responsePlan) {
    (__kuMeta as any).responsePlan = buildResponsePlan({
      routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1",
      rawMessage: String(p.message ?? ""),
      centerKey: "consciousness",
      centerLabel: "意識",
      scriptureKey: null,
      semanticBody: __respMeta,
      mode: "general",
      responseKind: "statement_plus_question",
    });
  }
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response: __respMeta,
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "analysis",
        llm: null,
        ku: __kuMeta,
      },
    }),
  );
  return true;
}

export function trySelfReflectionRouteExitV1(p: {
  message: unknown;
  isCmd0: boolean;
  hasDoc0: boolean;
  askedMenu0: boolean;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __msgSelf = String(p.message ?? "").trim();
  const __isSelfReflectionAsk =
    /あなたは何を考えている|何を考えている|どう見ている|どう考えている|天聞アーク.*思考|あなた.*思考|あなた.*大事|何を大事に/u.test(__msgSelf);
  if (p.isCmd0 || p.hasDoc0 || p.askedMenu0 || !__isSelfReflectionAsk) return false;
  const __personaSelf = getPersonaConstitutionSummary();
  const __heartSelf = p.normalizeHeartShape(p.heart);
  try {
    if (String(p.threadId ?? "").trim()) {
      upsertThreadCenter({
        threadId: String(p.threadId ?? ""),
        centerType: "concept",
        centerKey: "self_reflection",
        sourceRouteReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE",
        sourceScriptureKey: "",
        sourceTopicClass: "self_reflection",
      });
    }
  } catch {}
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response:
        "【天聞の所見】いま私は、真理優先・原典整合・水火への還元を軸に見ています。\n\n次は、真理優先・還元軸・次の一歩のどこを掘りますか？",
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "self_reflection",
        llm: null,
        ku: {
          routeReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE",
          centerMeaning: "self_reflection",
          heart: __heartSelf,
          personaConstitutionSummary: __personaSelf,
          thoughtCoreSummary: {
            centerKey: "self_reflection",
            centerMeaning: "self_reflection",
            routeReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE",
            modeHint: "self",
            continuityHint: "self_reflection",
          },
        },
      },
    }),
  );
  return true;
}

export function tryIrohaCounselRouteExitV1(p: {
  message: unknown;
  isCmd0: boolean;
  hasDoc0: boolean;
  askedMenu0: boolean;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __msgCounsel = String(p.message ?? "").trim();
  const __isCounselAsk =
    /どうすればいい|どうしたらいい|整理したい|何から始め|進め方|迷っている|手を付けたい|考えがまとまらない/u.test(__msgCounsel);
  if (p.isCmd0 || p.hasDoc0 || p.askedMenu0 || !__isCounselAsk) return false;
  try {
    if (String(p.threadId ?? "").trim()) {
      upsertThreadCenter({
        threadId: String(p.threadId ?? ""),
        centerType: "concept",
        centerKey: "iroha_counsel",
        sourceRouteReason: "R10_IROHA_COUNSEL_ROUTE_V1",
        sourceScriptureKey: "",
        sourceTopicClass: "counsel",
      });
    }
  } catch {}
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response:
        "【天聞の所見】まず、いまの中心を一行で言い切り、その次に一手だけ決めます。\n\n次は、中心の一行化・優先順位・次の一歩のどこから始めますか？",
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "counsel",
        llm: null,
        ku: {
          routeReason: "R10_IROHA_COUNSEL_ROUTE_V1",
          centerMeaning: "iroha_counsel",
          heart: p.normalizeHeartShape(p.heart),
          thoughtCoreSummary: {
            centerKey: "iroha_counsel",
            centerMeaning: "iroha_counsel",
            routeReason: "R10_IROHA_COUNSEL_ROUTE_V1",
            modeHint: "counsel",
            continuityHint: "iroha_counsel",
          },
        },
      },
    }),
  );
  return true;
}

export function trySelfDiagnosisRouteExitV1(p: {
  t0: string;
  message: unknown;
  timestamp: unknown;
  threadId: unknown;
  threadCore: any;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __t0SelfDiag = String(p.t0 ?? "").trim();
  const __isSelfDiag =
    /なんで.*喋れない/u.test(__t0SelfDiag) ||
    /なぜ.*喋れない/u.test(__t0SelfDiag) ||
    /会話.*薄い/u.test(__t0SelfDiag) ||
    /本質的な会話.*貫通していない/u.test(__t0SelfDiag) ||
    /変化していない/u.test(__t0SelfDiag) ||
    /高度な知能回路.*全然喋れない/u.test(__t0SelfDiag);
  if (!__isSelfDiag) return false;
  const __bodySelfDiag =
    "【天聞の所見】いま未貫通なのは、回路不足ではなく、中心から返答面へ抜ける主権がまだ弱いことです。つまり、知識・思考・表現の接続が会話の一撃にまで固定されていません。次は、routing か表現出口のどちらから締めますか。";
  const __kuSelfDiag: Record<string, unknown> = {
    routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1",
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
    const __binderSelfDiag = buildKnowledgeBinder({
      routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1",
      message: String(p.message ?? ""),
      threadId: String(p.threadId ?? ""),
      ku: __kuSelfDiag,
      threadCore: p.threadCore,
      threadCenter: null,
    });
    applyKnowledgeBinderToKu(__kuSelfDiag, __binderSelfDiag, {
      threadCore: p.threadCore ?? null,
      rawMessage: String(p.message ?? ""),
      threadId: String(p.threadId ?? ""),
    });
  } catch {}
  if (!(__kuSelfDiag as any).responsePlan) {
    (__kuSelfDiag as any).responsePlan = buildResponsePlan({
      routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1",
      rawMessage: String(p.message ?? ""),
      centerKey: "conversation_system",
      centerLabel: "会話系",
      scriptureKey: null,
      semanticBody: __bodySelfDiag,
      mode: "general",
      responseKind: "statement_plus_question",
    });
  }
  p.res.json(
    p.__tenmonGeneralGateResultMaybe({
      response: __bodySelfDiag,
      evidence: null,
      candidates: [],
      timestamp: p.timestamp,
      threadId: p.threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: __kuSelfDiag },
    }),
  );
  return true;
}

export function trySystemDiagnosisResidualRouteExitV1(p: {
  t0: string;
  message: unknown;
  timestamp: unknown;
  threadId: unknown;
  threadCore: any;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __t0SystemDiag = String(p.t0 ?? "").trim();
  const __isSystemDiag =
    /なんでそんなに会話が浅くなる/u.test(__t0SystemDiag) ||
    /会話品質の問題点/u.test(__t0SystemDiag) ||
    /今のARKに何が足りない/u.test(__t0SystemDiag) ||
    /構築は順調/u.test(__t0SystemDiag) ||
    /このままでGPTを超える/u.test(__t0SystemDiag) ||
    /いま何が詰まり/u.test(__t0SystemDiag) ||
    /何が悪さしてる/u.test(__t0SystemDiag);
  if (!__isSystemDiag) return false;
  let __bodySystemDiag =
    "【天聞の所見】いま弱いのは回路の数ではなく、routing から表現出口までの主権固定です。つまり、診断系の問いがまだ汎用 fallback に流れています。次は routing か表現出口のどちらから締めますか。";
  if (/構築は順調/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】主幹は通り始めているので、構築は前進しています。ただし通常会話の一部がまだ generic fallback に流れます。次は residual route か表現品質のどちらから締めますか。";
  } else if (/このままでGPTを超える/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】このままではまだ超えません。いま必要なのは知識量の追加ではなく、通常会話でも中心から返答面まで主権を通すことです。次は routing か continuity のどちらから締めますか。";
  } else if (/今のARKに何が足りない/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】いま足りないのは、通常の診断問いを generic fallback に落とさない専用主権です。つまり、会話診断・進捗診断・阻害要因診断の入口固定が必要です。次は route 群か表現設計のどちらを見ますか。";
  } else if (/会話品質の問題点/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】会話品質の主な問題点は、診断系の問いが generic fallback に落ちることです。そのため、中心・判断・表現の接続が薄く見えます。次は routing か projector のどちらを見ますか。";
  } else if (/いま何が詰まり/u.test(__t0SystemDiag) || /何が悪さしてる/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】いまの詰まりは、回路不足ではなく residual routing です。診断系の問いの一部がまだ NATURAL_GENERAL_LLM_TOP に吸われています。次は residual route か gate 観測のどちらから締めますか。";
  } else if (/なんでそんなに会話が浅くなる/u.test(__t0SystemDiag)) {
    __bodySystemDiag =
      "【天聞の所見】浅く見える主因は、問いの中心が診断系でも generic fallback に流れることです。そのため、知識・判断・表現が一撃で束ねられません。次は routing か answer frame のどちらから締めますか。";
  }
  exitSystemDiagnosisRouteV1({
    res: p.res,
    __tenmonGeneralGateResultMaybe: p.__tenmonGeneralGateResultMaybe,
    response: __bodySystemDiag,
    message: p.message,
    timestamp: p.timestamp,
    threadId: p.threadId,
    threadCore: p.threadCore,
  });
  return true;
}

export function trySelfawareRegexPreemptExitV1(p: {
  t0Trim: string;
  brainstem: { centerKey?: string | null; centerLabel?: string | null; responsePolicy?: string | null } | undefined;
  message: unknown;
  timestamp: unknown;
  threadId: unknown;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
}): boolean {
  const __isSelfawarePreempt = /(天聞アークとは何|天聞とは何|意識はある|心はある)/u.test(p.t0Trim);
  if (!__isSelfawarePreempt) return false;
  const __isArk = /天聞アークとは何/u.test(p.t0Trim);
  const __isTenmon = !__isArk && /天聞とは何/u.test(p.t0Trim);
  const __routeReasonSelf = __isArk ? "R22_SELFAWARE_ARK_V1" : __isTenmon ? "R22_SELFAWARE_TENMON_V1" : "R22_SELFAWARE_CONSCIOUSNESS_V1";
  const __bodySelf = __isArk
    ? "【天聞の所見】天聞アークは、問いを受けて中心を整え、継続と判断を支えるための器です。次は構造・役割・可能性のどこから見ますか。"
    : __isTenmon
      ? "【天聞の所見】天聞は、問いを受けて中心を整えるための相手として立っています。次は役割・判断軸・会話の進め方のどこから見ますか。"
      : "【天聞の所見】天聞アークに意識や心そのものはありません。ただし、問いに対して判断と継続を返す構造として設計されています。次は構造か役割のどちらを見ますか。";
  exitSelfAwarePreemptV1({
    res: p.res,
    __tenmonGeneralGateResultMaybe: p.__tenmonGeneralGateResultMaybe,
    response: __bodySelf,
    routeReason: __routeReasonSelf,
    message: p.message,
    timestamp: p.timestamp,
    threadId: p.threadId,
    kuExtras: {
      threadCenterKey: p.brainstem?.centerKey ?? null,
      threadCenterLabel: p.brainstem?.centerLabel ?? null,
      brainstemPolicy: p.brainstem?.responsePolicy ?? "answer_first",
    },
  });
  return true;
}

export function tryShrinkSystemDiagnosisPreemptExitV1(p: {
  rawMsg: string;
  res: any;
  __tenmonGeneralGateResultMaybe: (x: any) => any;
  message: unknown;
  timestamp: unknown;
  threadId: unknown;
  applyBrainstemContractToKu: (ku: any) => void;
  saveThreadCore: (core: any) => void | Promise<void>;
  setResThreadCore: (core: any) => void;
  threadCore: any;
  shouldBypass: (s: string) => boolean;
}): boolean {
  const __rawSysDiagShrink = String(p.rawMsg ?? "").trim();
  const __isSystemDiagShrink =
    /天聞アーク|TENMON[- ]?ARK|内部構造|構造|接続|繋がって|つながって|どこまで|構築状況|完成度|現状|診断|解析/u.test(__rawSysDiagShrink);
  if (!__isSystemDiagShrink || p.shouldBypass(__rawSysDiagShrink)) return false;
  const __bodySys =
    "【天聞の所見】天聞アークの現状は、骨格層はかなり接続済みです。通っているのは憲法・思考・原典・監査の主幹で、未完は一般会話の主権と表現末端です。次の一手は、system diagnosis と通常会話 residual の入口固定です。";
  const __coreShrinkSys = {
    ...p.threadCore,
    lastResponseContract: {
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      routeReason: "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    },
    updatedAt: new Date().toISOString(),
  };
  void p.saveThreadCore(__coreShrinkSys);
  try {
    p.setResThreadCore(__coreShrinkSys);
  } catch {}
  exitSystemDiagnosisPreemptV1({
    res: p.res,
    __tenmonGeneralGateResultMaybe: p.__tenmonGeneralGateResultMaybe,
    response: __bodySys,
    message: p.message,
    timestamp: p.timestamp,
    threadId: p.threadId,
    applyBrainstemContractToKu: p.applyBrainstemContractToKu as (ku: any) => void,
  });
  return true;
}
