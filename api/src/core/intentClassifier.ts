/**
 * TENMON_INTENT_CLASSIFIER_V1 (ULTRA-10)
 * ユーザー意図分類エンジン
 *
 * ユーザーメッセージの意図を分類し、
 * 応答長・深さ・引用数の動的調整に使用する。
 */

// ============================================================
// Types
// ============================================================

export type UserIntent =
  | "greeting" // 挨拶
  | "factual_def" // 定義質問 (〜とは?)
  | "factual_how" // 方法質問 (どうすれば?)
  | "deep_inquiry" // 深層探究 (なぜ?本質は?)
  | "self_reflection" // 自己省察 (私の〜は?)
  | "comparison" // 比較 (AとBの違いは?)
  | "emotional" // 感情表出
  | "confirmation" // 確認・同意
  | "challenge" // 挑戦・反論
  | "follow_up"; // 前応答への深掘り

export interface IntentClassification {
  primary: UserIntent;
  secondary?: UserIntent;
  depth: "surface" | "middle" | "deep";
  expectedResponseLength: "short" | "medium" | "long";
  targetTokens: number;
}

// ============================================================
// classifyIntent
// ============================================================

export function classifyIntent(
  userMessage: string,
  conversationHistory?: Array<{ role: string; content: string }>,
): IntentClassification {
  const msg = (userMessage || "").trim();
  const msgLen = msg.length;
  const history = conversationHistory || [];

  // ── 挨拶検出 ──
  if (
    /^(こんにちは|はじめまして|おはよう|こんばんは|よろしく|初めまして)/.test(
      msg,
    ) &&
    msgLen < 50
  ) {
    return {
      primary: "greeting",
      depth: "surface",
      expectedResponseLength: "short",
      targetTokens: 300,
    };
  }

  // ── 確認・同意 ──
  if (
    /^(なるほど|わかりました|ありがとう|そうですね|了解|はい|うん)/.test(
      msg,
    ) &&
    msgLen < 30
  ) {
    return {
      primary: "confirmation",
      depth: "surface",
      expectedResponseLength: "short",
      targetTokens: 200,
    };
  }

  // ── 感情表出 ──
  if (
    /疲れ|しんど|つら[いく]|苦し[いく]|悲し[いく]|泣きたい|消えたい|もう無理/.test(
      msg,
    )
  ) {
    return {
      primary: "emotional",
      depth: "deep",
      expectedResponseLength: "medium",
      targetTokens: 1200,
    };
  }

  // ── 自己省察 ──
  if (
    /私の|自分の|僕の|俺の|わたしの/.test(msg) &&
    /宿曜|運|性格|なぜ|本質|使命|天命|課題/.test(msg)
  ) {
    return {
      primary: "self_reflection",
      depth: "deep",
      expectedResponseLength: "long",
      targetTokens: 3000,
    };
  }

  // ── 深層探究 ──
  if (
    /(なぜ|どうして|本質|根源|構造|意味|真理|原理).*(か|\?|？)/.test(msg) ||
    msgLen > 200
  ) {
    return {
      primary: "deep_inquiry",
      depth: "deep",
      expectedResponseLength: "long",
      targetTokens: 2500,
    };
  }

  // ── 定義質問 ──
  if (/とは(何|なに)|とは\??$|って何|って\??$|について教え/.test(msg)) {
    return {
      primary: "factual_def",
      depth: "middle",
      expectedResponseLength: "medium",
      targetTokens: 1000,
    };
  }

  // ── 方法質問 ──
  if (/どうすれば|どうやって|方法|やり方|コツ|手順/.test(msg)) {
    return {
      primary: "factual_how",
      depth: "middle",
      expectedResponseLength: "medium",
      targetTokens: 1200,
    };
  }

  // ── 比較 ──
  if (/違い|比較|vs|と.{0,20}の差|どちらが/.test(msg)) {
    return {
      primary: "comparison",
      depth: "middle",
      expectedResponseLength: "medium",
      targetTokens: 1500,
    };
  }

  // ── 挑戦・反論 ──
  if (/本当に|嘘|おかしい|間違い|矛盾|根拠は|証拠は/.test(msg)) {
    return {
      primary: "challenge",
      depth: "deep",
      expectedResponseLength: "long",
      targetTokens: 2000,
    };
  }

  // ── 追加質問 (前応答への follow-up) ──
  const lastAI = history
    .slice()
    .reverse()
    .find((m) => m.role === "assistant");
  if (
    lastAI &&
    (msg.startsWith("それは") ||
      msg.startsWith("もっと") ||
      msg.startsWith("具体的に") ||
      msg.startsWith("例えば") ||
      msg.startsWith("つまり") ||
      msgLen < 30)
  ) {
    return {
      primary: "follow_up",
      depth: "deep",
      expectedResponseLength: "medium",
      targetTokens: 1200,
    };
  }

  // ── デフォルト ──
  return {
    primary: "factual_def",
    depth: "middle",
    expectedResponseLength: "medium",
    targetTokens: 1000,
  };
}

// ============================================================
// getTemperatureForIntent
// ============================================================

export function getTemperatureForIntent(
  intent: IntentClassification,
): number {
  switch (intent.depth) {
    case "deep":
      return 0.3;
    case "middle":
      return 0.4;
    case "surface":
      return 0.5;
    default:
      return 0.4;
  }
}
