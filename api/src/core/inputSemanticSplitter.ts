/**
 * TENMON_INPUT_COGNITION_SPLITTER_CURSOR_AUTO_V1
 * 認知入口: ユーザー入力を意図・軸・深さ等へ分解（LLM なし・heuristic のみ）。
 * heartPhase.ts の phase とは別キー（heartHint）で衝突しない。
 */

/** 問いの型（最終は 1 つに決定） */
export type InputSemanticIntentClassV1 =
  | "literal"
  | "define"
  | "practice"
  | "connect"
  | "reframe"
  | "suffering"
  | "general";

export type InputSemanticContextDepthV1 = "surface" | "mid" | "deep";
export type InputSemanticUrgencyV1 = "low" | "medium" | "high";

/** heartPhase / KanagiPhase とは独立した、本文から読み取った情動・姿勢のヒント文字列 */
export type InputSemanticHeartHintV1 = "neutral" | "distress" | "curious" | "directive" | "reflective";

/** responseComposer / brainstem と整合しやすい推定 answer モード */
export type InputSemanticProbableModeV1 = "define" | "analysis" | "support" | "worldview" | "continuity";

export type InputSemanticSplitResultV1 = {
  schema: "TENMON_INPUT_SEMANTIC_SPLIT_V1";
  intentClass: InputSemanticIntentClassV1;
  topicAxis: string;
  contextDepth: InputSemanticContextDepthV1;
  urgency: InputSemanticUrgencyV1;
  heartHint: InputSemanticHeartHintV1;
  probableMode: InputSemanticProbableModeV1;
  canonHit: boolean;
  kotodamaHit: boolean;
  historicalRisk: boolean;
  symbolicAnalogyHit: boolean;
};

/** カード表記 `SplitResult` との整合 */
export type SplitResult = InputSemanticSplitResultV1;
export type SplitResultV1 = InputSemanticSplitResultV1;

const RE_SUFFERING =
  /つらい|辛い|しんどい|苦しい|泣きたい|死にたい|不安で|怖い|パニック|うつ|消えたい|もうダメ/u;
const RE_PRACTICE = /どうすれば|やり方|手順|ステップ|練習|鍛え|実践|習慣化|具体的にどう/u;
const RE_CONNECT = /その続き|続き|前の|さっき|先ほど|その流れ|関連|つながり|同じ話/u;
const RE_REFRAME = /別の見方|読み替え|捉え直|視点|リフレーム|解釈を変|角度を変/u;
const RE_DEFINE = /とは(?:何|なに)?|って\s*何|意味は|定義|何ですか|なにですか|教えて/u;
const RE_LITERAL_SHORT = /^(はい|いいえ|うん|ううん|おはよう|こんにちは|ありがとう|了解|OK|ok|Ok)[。！？\s]*$/u;

const RE_CANON =
  /法華経|法華|空海|即身成仏|真言|密教|経典|般若|涅槃|阿弥陀|釈迦|インド哲学|仏教史|聖典/u;
const RE_KOTODAMA = /言霊|言灵|言靈|いろは|五十連|カタカムナ|水穂伝|稲荷古伝|言霊秘書/u;
const RE_HISTORICAL_RISK =
  /史実|史料|年表|いつから|いつ頃|戦国|明治|大正|昭和|令和|政治|ニュース|速報|大統領|首相|総理/u;
const RE_SYMBOLIC =
  /たとえば|例えば|まるで|のよう(に|な)|メタファ|象徴|比喩|たとえ話|ノア|方舟|重なる|重ねて|類似|同型/u;

function topicAxisFromText(t: string): string {
  if (RE_KOTODAMA.test(t)) return "kotodama_scripture";
  if (RE_CANON.test(t)) return "canon_scripture";
  if (RE_HISTORICAL_RISK.test(t)) return "historical_fact";
  if (/(意識|真理|存在|自由意志|倫理)/u.test(t)) return "metaphysics";
  if (/(仕事|職場|人間関係|家族)/u.test(t)) return "life_situation";
  return "open";
}

function pickIntent(t: string, norm: string): InputSemanticIntentClassV1 {
  if (RE_LITERAL_SHORT.test(norm)) return "literal";
  if (RE_SUFFERING.test(t)) return "suffering";
  if (RE_PRACTICE.test(t)) return "practice";
  if (RE_CONNECT.test(t)) return "connect";
  if (RE_REFRAME.test(t)) return "reframe";
  if (RE_DEFINE.test(t)) return "define";
  return "general";
}

function pickDepth(norm: string): InputSemanticContextDepthV1 {
  const n = norm.length;
  if (n >= 220) return "deep";
  if (n >= 80) return "mid";
  return "surface";
}

function pickUrgency(t: string, intent: InputSemanticIntentClassV1): InputSemanticUrgencyV1 {
  if (intent === "suffering") return "high";
  if (/[！!]{2,}|[？?]{3,}/u.test(t)) return "high";
  if (/急い|至急|すぐに|今すぐ/u.test(t)) return "medium";
  return "low";
}

function pickHeartHint(intent: InputSemanticIntentClassV1, t: string): InputSemanticHeartHintV1 {
  if (intent === "suffering") return "distress";
  if (intent === "literal") return "neutral";
  if (RE_PRACTICE.test(t) || /してほしい|してください|命令/u.test(t)) return "directive";
  if (/\?|？/u.test(t) && intent === "define") return "curious";
  if (intent === "reframe" || intent === "connect") return "reflective";
  return "neutral";
}

function pickProbableMode(intent: InputSemanticIntentClassV1): InputSemanticProbableModeV1 {
  switch (intent) {
    case "define":
    case "literal":
      return "define";
    case "practice":
      return "analysis";
    case "suffering":
      return "support";
    case "connect":
      return "continuity";
    case "reframe":
      return "worldview";
    default:
      return "analysis";
  }
}

/**
 * ユーザー本文から SplitResult を生成（副作用なし・決定的）。
 */
export function splitInputSemanticsV1(rawMessage: string): InputSemanticSplitResultV1 {
  const t = String(rawMessage ?? "").trim();
  const norm = t.replace(/\s+/gu, " ");

  const canonHit = RE_CANON.test(t);
  const kotodamaHit = RE_KOTODAMA.test(t);
  const historicalRisk = RE_HISTORICAL_RISK.test(t);
  const symbolicAnalogyHit = RE_SYMBOLIC.test(t);

  const intentClass = pickIntent(t, norm);
  const topicAxis = topicAxisFromText(t);

  return {
    schema: "TENMON_INPUT_SEMANTIC_SPLIT_V1",
    intentClass,
    topicAxis,
    contextDepth: pickDepth(norm),
    urgency: pickUrgency(t, intentClass),
    heartHint: pickHeartHint(intentClass, t),
    probableMode: pickProbableMode(intentClass),
    canonHit,
    kotodamaHit,
    historicalRisk,
    symbolicAnalogyHit,
  };
}
