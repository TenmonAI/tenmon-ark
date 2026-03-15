/**
 * CARD_TENMON_BRAINSTEM_V1: 会話判断を単一脳幹で決める
 * answerLength / answerMode / answerFrame / routeClass / responsePolicy を1箇所で出す
 */

export type BrainstemRouteClass =
  | "support"
  | "define"
  | "analysis"
  | "worldview"
  | "continuity"
  | "judgement"
  | "selfaware"
  | "impression"
  | "fallback";

export type BrainstemResponsePolicy =
  | "answer_first"
  | "clarify_first"
  | "summary_then_deepen";

export type BrainstemDecision = {
  routeClass: BrainstemRouteClass;
  centerKey: string | null;
  centerLabel: string | null;
  answerLength: "short" | "medium" | "long";
  answerMode: "support" | "define" | "analysis" | "worldview" | "continuity";
  answerFrame:
    | "one_step"
    | "statement_plus_one_question"
    | "d_delta_s_one_step";
  responsePolicy: BrainstemResponsePolicy;
  explicitLengthRequested: number | null;
  forbiddenMoves: string[];
  nextTurnSeed: string | null;
  fallthroughAllowed: boolean;
};

export type BrainstemInput = {
  message: string;
  threadCore?: {
    centerKey?: string | null;
    centerLabel?: string | null;
    openLoops?: string[];
    commitments?: string[];
    lastResponseContract?: {
      answerLength?: string | null;
      answerMode?: string | null;
      answerFrame?: string | null;
      routeReason?: string | null;
    } | null;
  } | null;
  explicitLengthRequested?: number | null;
  bodyProfile?: {
    answerLength?: "short" | "medium" | "long" | null;
    answerMode?: string | null;
    answerFrame?: string | null;
  } | null;
};

const RE_SUPPORT_UI = /(改行|enter|shift\+enter|shift enter|送信)/iu;
const RE_SUPPORT_AUTH = /(ログイン|登録|合言葉|メール登録|入れない|認証)/iu;
const RE_SUPPORT_PRODUCT = /(使い方|どう使う|始め方|メニュー|どこから)/iu;
const RE_JUDGEMENT = /(良い|悪い|正しい|間違い|べき|どっちが|どちらが|した方が)/u;
const RE_FEELING = /(気分|どんな気分|どう感じる|感情)/u;
const RE_IMPRESSION = /(感想|印象)/u;
const RE_SELFAWARE = /(天聞アークとは何|天聞とは何|意識はある|心はある)/u;
const RE_WORLDVIEW = /(魂|死後|輪廻|霊|灵)/u;
const RE_CONTINUITY_NEXT = /^(次は\?|次は？|次の一手は\?|次の一手は？)$/u;
const RE_CONTINUITY_ESSENCE = /(要するに|要点は|本質は)/u;
const RE_CONTINUITY_COMPARE = /(違いは|どう違う|何が違う)/u;
const RE_CONTINUITY_BACKGROUND = /(背景は|もう少し|法則で見ると)/u;

function isSupport(msg: string): boolean {
  return RE_SUPPORT_UI.test(msg) || RE_SUPPORT_AUTH.test(msg) || RE_SUPPORT_PRODUCT.test(msg);
}

function isContinuity(msg: string, centerKey: string | null | undefined): boolean {
  if (!centerKey || String(centerKey).trim() === "") return false;
  const t = String(msg).trim();
  return RE_CONTINUITY_NEXT.test(t) || RE_CONTINUITY_ESSENCE.test(t) || RE_CONTINUITY_COMPARE.test(t) || RE_CONTINUITY_BACKGROUND.test(t);
}

export function tenmonBrainstem(input: BrainstemInput): BrainstemDecision {
  const msg = String(input.message ?? "").trim();
  const threadCore = input.threadCore ?? null;
  const centerKey = threadCore?.centerKey ?? null;
  const centerLabel = threadCore?.centerLabel ?? null;
  const explicitLen = input.explicitLengthRequested != null && Number(input.explicitLengthRequested) > 0 ? Number(input.explicitLengthRequested) : null;

  // 1. explicit length 最優先
  if (explicitLen != null) {
    return {
      routeClass: "analysis",
      centerKey,
      centerLabel,
      answerLength: "long",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: explicitLen,
      forbiddenMoves: ["feeling_preempt", "future_preempt"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 2. support
  if (isSupport(msg)) {
    return {
      routeClass: "support",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "support",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 3. judgement（既存互換: answerMode=analysis）
  if (RE_JUDGEMENT.test(msg)) {
    return {
      routeClass: "judgement",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "clarify_first",
      explicitLengthRequested: null,
      forbiddenMoves: ["generic_relative_answer"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 4. feeling
  if (RE_FEELING.test(msg)) {
    return {
      routeClass: "analysis",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 5. impression（既存互換: answerMode=analysis）
  if (RE_IMPRESSION.test(msg)) {
    return {
      routeClass: "impression",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 6. continuity (center あり + 継続フレーズ)
  if (isContinuity(msg, centerKey)) {
    return {
      routeClass: "continuity",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "continuity",
      answerFrame: "one_step",
      responsePolicy: "summary_then_deepen",
      explicitLengthRequested: null,
      forbiddenMoves: ["lose_center", "generic_opening"],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 7. selfaware（既存互換: answerMode=analysis）
  if (RE_SELFAWARE.test(msg)) {
    return {
      routeClass: "selfaware",
      centerKey,
      centerLabel,
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      responsePolicy: "answer_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: false,
    };
  }

  // 8. worldview
  if (RE_WORLDVIEW.test(msg)) {
    return {
      routeClass: "worldview",
      centerKey,
      centerLabel,
      answerLength: "medium",
      answerMode: "worldview",
      answerFrame: "statement_plus_one_question",
      responsePolicy: "clarify_first",
      explicitLengthRequested: null,
      forbiddenMoves: [],
      nextTurnSeed: null,
      fallthroughAllowed: true,
    };
  }

  // 9. fallback
  return {
    routeClass: "fallback",
    centerKey,
    centerLabel,
    answerLength: "medium",
    answerMode: "analysis",
    answerFrame: "statement_plus_one_question",
    responsePolicy: "clarify_first",
    explicitLengthRequested: null,
    forbiddenMoves: [],
    nextTurnSeed: null,
    fallthroughAllowed: true,
  };
}
