import { getTenmonStyle } from "./personaStyleConstitution.js";

export type ResponseComposerInput = {
  response: string;
  rawMessage?: string;
  mode?: string;
  routeReason?: string;
  truthWeight?: number;
  katakamunaSourceHint?: any;
  naming?: any;
  katakamunaTopBranch?: string;
  lawTrace?: any[];
  evidenceIds?: string[];
  lawsUsed?: string[];
  sourceHint?: any;
  heart?: any;
};

export type MeaningFrame = {
  routeReason: string;
  mode: string;
  truthWeight: number;
  hasEvidence: boolean;
  hasLawTrace: boolean;
  hasSourceHint: boolean;
  topicClass: "katakamuna" | "kotodama" | "soul" | "general";
};

export type ResponseComposerOutput = {
  response: string;
  meaningFrame?: MeaningFrame;
};

function buildMeaningFrame(input: ResponseComposerInput): MeaningFrame {
  const routeReason = String(input?.routeReason ?? "");
  const rawMessage = String(input?.rawMessage ?? "");
  const mode = String(input?.mode ?? "");
  const truthWeight = Number(input?.truthWeight ?? 0);
  const evidenceIds = Array.isArray(input?.evidenceIds) ? input.evidenceIds : [];
  const lawTrace = Array.isArray(input?.lawTrace) ? input.lawTrace : [];
  const sourceHint = input?.sourceHint ?? input?.katakamunaSourceHint ?? null;

  let topicClass: MeaningFrame["topicClass"] = "general";
  if (/KATAKAMUNA/.test(routeReason) || /カタカムナ/.test(rawMessage)) {
    topicClass = "katakamuna";
  } else if (
    routeReason === "DEF_FASTPATH_VERIFIED_V1" ||
    routeReason === "DEF_PROPOSED_FALLBACK_V1"
  ) {
    topicClass = "kotodama";
  } else if (routeReason === "SOUL_FASTPATH_VERIFIED_V1") {
    topicClass = "soul";
  }

  return {
    routeReason,
    mode,
    truthWeight,
    hasEvidence: evidenceIds.length > 0,
    hasLawTrace: lawTrace.length > 0,
    hasSourceHint: sourceHint != null,
    topicClass,
  };
}

const KATAKAMUNA_CANON_TAIL =
  "楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のどこから見たいですか？";

const KATAKAMUNA_CANON_TAIL_BY_BRANCH: Record<string, string> = {
  narasaki_mainline: "次は、潜象物理・図象・古事記再読のどこから掘りますか？",
  uno_society_mainline: "次は、継承・感受性・相似象会誌のどこから掘りますか？",
  kukai_parallel_axis: "次は、声字実相・即身成仏・十住心のどこから掘りますか？",
  tenmon_reintegrative_axis: "次は、水火・言霊・山口志道／言霊秘書のどこから掘りますか？",
};
const KATAKAMUNA_CANON_TAIL_DEFAULT =
  "次は、系譜・原理・典拠のどこから掘りますか？";

const KATAKAMUNA_DETAIL_TAIL =
  "楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のうち、次はどこを掘りますか？";

const KOTODAMA_TAIL =
  "定義・法則・伝承のどこを深掘りしますか？";
const KOTODAMA_TAIL_REPLACEMENT =
  "次は、定義・法則・伝承のどこから掘りますか？";

const SOUL_TAIL =
  "魂・息・火水のどこを深掘りしますか？";
const SOUL_TAIL_REPLACEMENT =
  "次は、魂・息・火水のどこから掘りますか？";

const PROPOSED_DEF_TAIL =
  "この定義候補を、さらに verified 根拠に寄せて深めますか？";
const PROPOSED_DEF_TAIL_REPLACEMENT =
  "次は、verified 根拠・定義候補・関連伝承のどこから詰めますか？";

const KOTODAMA_FIRST_SENTENCE =
  "言霊とは、天地に鳴り響く五十連の音と、その水火を與み解いて詞の本を知る五十音一言一言の深義を示す法則である。";
const SOUL_FIRST_SENTENCE =
  "魂とは、人間の胎内に宿る火水（イキ）であり、息として働く生命の本でもあります。";

const TRUTHFRAME_WEIGHT = "この問いは法則に強く接続しています。";
const TRUTHFRAME_EVIDENCE = "いまは根拠に接続できる状態です。";
const TRUTHFRAME_LOAD = "いまは負荷が高い状態です。";
const TRUTHFRAME_DEFAULT = "いまは整理の入口にいます。";

const RE_TIRED = /(疲れ|しんど|重い|つらい|辛い|消耗)/;
const RE_FIRST_SENTENCE_DEDUP = /(状態です。|ようですね。|自然なこと。)/;
const RE_FATIGUE_FIRST = /(疲れが強い状態です。|負荷が高い状態です。|疲れが溜まっているようですね。)/;

function generalToneNormalize(s: string): string {
  if (!s || typeof s !== "string") return s;
  let out = s;
  // 1) 連続スペースを1つに
  out = out.replace(/ {2,}/g, " ");
  // "。\n\n " のような余計な空白を削る
  out = out.replace(/。\n\n\s+/g, "。\n\n");
  // "。  " のような文末直後の余計な空白を1つに
  out = out.replace(/。 +/g, "。 ");
  // 2) 言い回しの微調整
  out = out.replace(/見え隠れしているように感じる/g, "見えてきます");
  out = out.replace(/まず目の前の不要なものを一つ捨てるなら、何がある？/g, "まず一つ手放すなら、何が近いですか？");
  // tired 系の冒頭を少し優しく統一
  out = out.replace(/疲れが強い状態です。/g, "少し負荷が溜まっているようですね。");
  out = out.replace(/体のことで少し疲れが溜まっているようですね。/g, "少し負荷が溜まっているようですね。");
  // organize 系の問いを少し整理
  out = out.replace(/今日、手を付けたいことは一つある？/g, "いま一番気になっている部分を一つだけ選べますか？");
  // HEART_PHASE_TONE_POLISH_V1: general 冒頭ラベル除去・崩れ修正・行頭空白除去・trim
  // LABEL_STRIP_V3: 受容：/一点：/一手：ラベルのみ除去（後続テキストは保持）
  out = out.replace(/^(\s*)(受容|一点|一手)：\s*(いまは少し内側を整える段階です。\s*)?/gm, "$1");
  out = out.replace(/^(\s*)(受容|一点|一手)：\s*(いまは小さく外へ動かす段階です。\s*)?/gm, "$1");
  out = out.replace(/いいまここ/g, "いまここ");
  out = out.replace(/まここ/g, "いまここ");
  out = out.split("\n").map((l) => l.replace(/^\s+/, "")).join("\n");
  return out.trim();
}

function applyPersonaReduction(
  response: string,
  meaningFrame: MeaningFrame,
  rawMessage?: string,
  heart?: any
): string {
  if (!response || typeof response !== "string") return response;

  let prefix = "";
  let content = response;
  if (content.startsWith("【天聞の所見】")) {
    const nl = content.indexOf("\n");
    prefix = nl >= 0 ? content.slice(0, nl + 1) : "【天聞の所見】\n";
    content = content.slice(prefix.length);
  }

  const idx = content.indexOf("。");
  const firstEnd = idx >= 0 ? idx + 1 : content.length;
  const firstSentence = content.slice(0, firstEnd).trim();
  const firstSentenceNorm = firstSentence.replace(/^\s*(?:受容：|一点：|一手：)\s*/, "").trim();
  const rest = content.slice(firstEnd);

  switch (meaningFrame.topicClass) {
    case "katakamuna":
      return response;
    case "kotodama":
      if (firstSentenceNorm.startsWith("言霊とは、")) return response;
      return prefix + KOTODAMA_FIRST_SENTENCE + rest;
    case "soul":
      if (firstSentenceNorm.startsWith("魂とは、")) return response;
      return prefix + SOUL_FIRST_SENTENCE + rest;
    default: {
      // general: optional truth frame prefix (one sentence), dedup + tone normalize
      const arkPhase = String(heart?.arkTargetPhase ?? "").toUpperCase();
      const phaseInLine = "いまは少し内側を整える段階です。";
      const phaseOutLine = "いまは小さく外へ動かす段階です。";

      // 既に phase/old truth frame が先頭にある場合はそのまま（重ねない）
      if (
        firstSentenceNorm.startsWith(phaseInLine) ||
        firstSentenceNorm.startsWith(phaseOutLine) ||
        firstSentenceNorm.startsWith(TRUTHFRAME_WEIGHT) ||
        firstSentenceNorm.startsWith(TRUTHFRAME_EVIDENCE) ||
        firstSentenceNorm.startsWith(TRUTHFRAME_LOAD) ||
        firstSentenceNorm.startsWith(TRUTHFRAME_DEFAULT)
      ) {
        return generalToneNormalize(response);
      }

      let truthPrefix: string | null = null;

      // HEART_PHASE_STYLE_HARDEN_V1: arkTargetPhase を優先して冒頭を固定
      if (arkPhase === "R-IN" || arkPhase === "L-IN") {
        truthPrefix = phaseInLine;
      } else if (arkPhase === "R-OUT" || arkPhase === "L-OUT") {
        truthPrefix = phaseOutLine;
      } else {
        // 従来の general truth frame ロジック
        if (meaningFrame.truthWeight > 0.6) {
          truthPrefix = TRUTHFRAME_WEIGHT;
        } else if (typeof rawMessage === "string" && RE_TIRED.test(rawMessage)) {
          if (RE_FATIGUE_FIRST.test(firstSentence)) return generalToneNormalize(response);
          truthPrefix = TRUTHFRAME_LOAD;
        } else if (RE_FIRST_SENTENCE_DEDUP.test(firstSentence)) {
          return generalToneNormalize(response);
        } else {
          truthPrefix = TRUTHFRAME_DEFAULT;
        }
      }

      const withFrame = prefix + truthPrefix + "\n\n" + content;
      return generalToneNormalize(withFrame);
    }
  }
}

export function responseComposer(input: ResponseComposerInput): ResponseComposerOutput {
  let out = String(input?.response ?? "");
  const style = getTenmonStyle();
  void style.voice;

  if (
    input?.routeReason === "KATAKAMUNA_CANON_ROUTE_V1" &&
    input?.katakamunaSourceHint?.preferred_doc != null &&
    out.endsWith(KATAKAMUNA_CANON_TAIL)
  ) {
    const branch = String(input?.katakamunaTopBranch ?? "").trim();
    const replacement =
      (branch && KATAKAMUNA_CANON_TAIL_BY_BRANCH[branch]) ?? KATAKAMUNA_CANON_TAIL_DEFAULT;
    out = out.slice(0, -KATAKAMUNA_CANON_TAIL.length) + replacement;
  }

  if (
    input?.routeReason === "KATAKAMUNA_DETAIL_FASTPATH_V1" &&
    out.endsWith(KATAKAMUNA_DETAIL_TAIL)
  ) {
    const branch = String(input?.katakamunaTopBranch ?? "").trim();
    const replacement =
      (branch && KATAKAMUNA_CANON_TAIL_BY_BRANCH[branch]) ?? KATAKAMUNA_CANON_TAIL_DEFAULT;
    out = out.slice(0, -KATAKAMUNA_DETAIL_TAIL.length) + replacement;
  }

  if (
    input?.routeReason === "DEF_FASTPATH_VERIFIED_V1" &&
    out.endsWith(KOTODAMA_TAIL)
  ) {
    out = out.slice(0, -KOTODAMA_TAIL.length) + KOTODAMA_TAIL_REPLACEMENT;
  }

  if (
    input?.routeReason === "SOUL_FASTPATH_VERIFIED_V1" &&
    out.endsWith(SOUL_TAIL)
  ) {
    out = out.slice(0, -SOUL_TAIL.length) + SOUL_TAIL_REPLACEMENT;
  }

  if (
    input?.routeReason === "DEF_PROPOSED_FALLBACK_V1" &&
    out.endsWith(PROPOSED_DEF_TAIL)
  ) {
    out = out.slice(0, -PROPOSED_DEF_TAIL.length) + PROPOSED_DEF_TAIL_REPLACEMENT;
  }

  const meaningFrame = buildMeaningFrame(input);
  out = applyPersonaReduction(out, meaningFrame, input?.rawMessage, (input as any)?.heart);
  return { response: out, meaningFrame };
}
