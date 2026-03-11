import { getTenmonStyle } from "./personaStyleConstitution.js";
import { shouldUseDanshariCommunication } from "./danshariCommunication.js";
import { computeKanagiSelfKernel } from "./kanagiSelfKernel.js";

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
  /** R3_CONCEPT_MEANINGFRAME_TOPICCLASS_FIX_V1: concept canon 時の topicClass 補正用 */
  conceptKey?: string;
  /** R10_DANSHARI_COMMUNICATION_LOOP_V1: general/support の断捨離整流制御用 */
  driftRisk?: number | null;
  selfPhase?: string | null;
  intentPhase?: string | null;
  shouldPersist?: boolean | number | null;
  shouldRecombine?: boolean | number | null;
};

export type MeaningFrame = {
  routeReason: string;
  mode: string;
  truthWeight: number;
  hasEvidence: boolean;
  hasLawTrace: boolean;
  hasSourceHint: boolean;
  topicClass: "katakamuna" | "kotodama" | "soul" | "general" | "water_fire_law" | "kotodama_hisho" | "subconcept";
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
  const conceptKey = String(input?.conceptKey ?? "").trim();

  let topicClass: MeaningFrame["topicClass"] = "general";
  // R3_CONCEPT_MEANINGFRAME_TOPICCLASS_FIX_V1: concept canon 時は conceptKey で topicClass を固定
  if (
    (routeReason === "TENMON_CONCEPT_CANON_V1" || routeReason === "KATAKAMUNA_CANON_ROUTE_V1") &&
    conceptKey
  ) {
    const allowed: MeaningFrame["topicClass"] =
      conceptKey === "water_fire_law"
        ? "water_fire_law"
        : conceptKey === "kotodama_hisho"
          ? "kotodama_hisho"
          : conceptKey === "katakamuna"
            ? "katakamuna"
            : conceptKey === "kotodama"
              ? "kotodama"
              : "general";
    topicClass = allowed;
  } else if (/KATAKAMUNA/.test(routeReason) || /カタカムナ/.test(rawMessage)) {
    topicClass = "katakamuna";
  } else if (
    routeReason === "DEF_FASTPATH_VERIFIED_V1" ||
    routeReason === "DEF_PROPOSED_FALLBACK_V1"
  ) {
    topicClass = "kotodama";
  } else if (routeReason === "SOUL_FASTPATH_VERIFIED_V1") {
    topicClass = "soul";
  } else if (routeReason === "TENMON_SUBCONCEPT_CANON_V1") {
    topicClass = "subconcept";
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

/** R3_SOUL_SURFACE_CLEANUP_V1 + R4_FOUNDER_DEMO_SURFACE_POLISH_V1 + R4_FOUNDER_SOUL_OCR_POLISH_V1: 二重空白・分断空白・OCRノイズ・単語内空白を整流。 */
function soulSurfaceCleanup(s: string): string {
  if (!s || typeof s !== "string") return s;
  let out = s
    .replace(/[\s\u3000]{2,}/g, " ")
    .replace(/ョ\s+ウィ/g, "ョウィ")
    .replace(/ク\s+マシヒ/g, "クマシヒ")
    .replace(/どこか\s+ら/g, "どこから")
    .replace(/どこ\s+から/g, "どこから")
    .replace(/掘り\s+ますか/g, "掘りますか")
    .replace(/深\s*掘\s*り/g, "深掘り")
    .replace(/魂\s*・\s*息\s*・\s*火水/g, "魂・息・火水");
  return out.trim();
}

/** R3_SOUL_PARAGRAPH_LOCK_V1: SOUL 応答を 1=魂とは〜 2=【根拠】〜 3=次は、〜 の3段落に再構築。 */
function soulParagraphLock(response: string): string {
  if (!response || typeof response !== "string") return response;
  let content = response;
  let prefix = "";
  if (content.startsWith("【天聞の所見】")) {
    const nl = content.indexOf("\n");
    prefix = nl >= 0 ? content.slice(0, nl + 1) : "【天聞の所見】\n";
    content = content.slice(prefix.length);
  }
  const firstEnd = content.indexOf("。");
  const para1 = (firstEnd >= 0 ? content.slice(0, firstEnd + 1) : content).trim();
  const idxRoot = content.indexOf("【根拠】");
  const idxNext = content.indexOf("次は、");
  const para2 =
    idxRoot >= 0
      ? content.slice(idxRoot, idxNext >= 0 ? idxNext : content.length).trim()
      : "";
  const para3 = idxNext >= 0 ? content.slice(idxNext).trim() : "";
  const parts = [para1];
  if (para2) parts.push(para2);
  if (para3) parts.push(para3);
  return soulSurfaceCleanup(prefix + parts.join("\n\n"));
}

/** R3_SOUL_SEGMENT_REBUILD_V1: 3セグメント切り出しで再構築。seg2/seg3 が無い場合は response をそのまま返す。 */
function soulSegmentRebuild(response: string): string {
  if (!response || typeof response !== "string") return response;
  let content = response;
  let prefix = "";
  if (content.startsWith("【天聞の所見】")) {
    const nl = content.indexOf("\n");
    prefix = nl >= 0 ? content.slice(0, nl + 1) : "【天聞の所見】\n";
    content = content.slice(prefix.length);
  }
  const idxRoot = content.indexOf("【根拠】");
  const idxNext = content.indexOf("次は、");
  if (idxRoot < 0 || idxNext < 0) return response;
  let seg1End = -1;
  let i = 0;
  for (;;) {
    const p = content.indexOf("。", i);
    if (p < 0) break;
    const after = content.slice(p + 1);
    if (/^[\s\u3000]/.test(after) || after.startsWith("【根拠】")) {
      seg1End = p + 1;
      break;
    }
    i = p + 1;
  }
  if (seg1End < 0) return response;
  const seg1 = content.slice(0, seg1End).trim();
  const seg2 = content.slice(idxRoot, idxNext).trim();
  const seg3 = content.slice(idxNext).trim();
  return prefix + seg1 + "\n\n" + seg2 + "\n\n" + seg3;
}

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
  // LLMFRAME_STRIP_V4: LLM生成の導入句を先頭行ごと除去
  const LLMFRAME_PATTERNS = [
    /^いまの言葉を[^\n]*\n?/gm,
    /いまの言葉を[^\n]*"次の一歩"[^\n]*/gu,
    /^いまは整理の入口にいます[^\n]*\n?/gm,
    /^[^\n]*[\u201c\u201d"]次の一歩[\u201c\u201d"][^\n]*\n?/gm,
    /^[^\n]*「次の一歩」[^\n]*\n?/gm,
    /^[^\n]*を[""]次の[^"\n]*[""]に落とし[^\n]*\n?/gm,
    /いまの言葉を[^\n]*/gu,
  ];
  for (const pat of LLMFRAME_PATTERNS) out = out.replace(pat, "");
  out = out.replace(/いいまここ/g, "いまここ");
  out = out.replace(/まここ/g, "いまここ");
  out = out.replace(/よく分かる/g, "伝わっている");
  out = out.replace(/捨ててみる/g, "手放してみる");
  out = out.replace(/^の前/gm, "");
  out = out.replace(/^ち込/gm, "");
  out = out.replace(/^まくい/gm, "");
  out = out.replace(/^体的/gm, "");
  out = out.replace(/^えが/gm, "");
  out = out.replace(/^報/gm, "");
  out = out.replace(/^況/gm, "");
  out = out.replace(/^理/gm, "");
  out = out.replace(/どうだろう。/g, "どうでしょうか。");
  out = out.replace(/あるかい\?/g, "ありますか？");
  out = out.replace(/だろうか？/g, "でしょうか。");
  out = out.replace(/かな？/g, "でしょうか。");
  out = out.split("\n").map((l) => l.replace(/^\s+/, "")).join("\n");
  return out.trim();
}

/** R3_CONCEPT_CANON_PWA_POLISH_V1: 概念正準の3段落・空白崩れのみ整流。他は触らない。 */
function conceptCanonPwaPolish(response: string): string {
  if (!response || typeof response !== "string") return response;
  let out = response
    .replace(/次[\s\u3000]+は/g, "次は")
    .replace(/\n{3,}/g, "\n\n");
  out = out.split("\n").map((l) => l.trim()).join("\n").trim();
  return out;
}

function applyPersonaReduction(
  response: string,
  meaningFrame: MeaningFrame,
  rawMessage?: string,
  heart?: any,
  inputOrKanagi?: { routeReason?: string; topicClass?: string; driftRisk?: number | null; [k: string]: unknown }
): string {
  if (!response || typeof response !== "string") return response;

  // R7_SCRIPTURE_ROUTE_PRIORITY_FIX_V1 + R7_SUBCONCEPT_PRIORITY_FIX_V1:
  // scripture / subconcept canon には general phase line を混入させない
  if (
    meaningFrame.routeReason === "TENMON_SCRIPTURE_CANON_V1" ||
    meaningFrame.routeReason === "TENMON_SUBCONCEPT_CANON_V1"
  ) {
    return response;
  }

  if (meaningFrame.routeReason === "TENMON_SUBCONCEPT_CANON_V1") {
    return String(response)
      .replace(/\n\n一手：[^\n]*\s*$/u, "")
      .trim();
  }

  if (
    meaningFrame.routeReason === "TENMON_CONCEPT_CANON_V1" ||
    meaningFrame.routeReason === "KATAKAMUNA_CANON_ROUTE_V1"
  ) {
    return conceptCanonPwaPolish(response);
  }

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
      // R10_DANSHARI_COMMUNICATION_LOOP_V1: driftRisk >= 0.5 かつ topicClass=general のときだけ断捨離整流。scripture/verified/subconcept/katakamuna では抑制。
      const isDanshariTarget = shouldUseDanshariCommunication({
        routeReason: meaningFrame.routeReason,
        topicClass: meaningFrame.topicClass,
        driftRisk: (inputOrKanagi as any)?.driftRisk ?? null,
        selfPhase: (inputOrKanagi as any)?.selfPhase ?? null,
        intentPhase: (inputOrKanagi as any)?.intentPhase ?? null,
        shouldPersist: (inputOrKanagi as any)?.shouldPersist ?? null,
        shouldRecombine: (inputOrKanagi as any)?.shouldRecombine ?? null,
      });
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

      let withFrame = prefix + truthPrefix + "\n\n" + content;

      if (isDanshariTarget) {
        // 断捨離スタイル補助:
        // - 一片へ絞る
        // - 抵抗理由を解く
        // - 相手を責めずに視野を広げる
        const LINES = withFrame.split("\n").map((l) => l.trimEnd());
        const extra: string[] = [];
        const hasFocusLine = LINES.some((l) => l.includes("一つ") || l.includes("一点") || l.includes("一片") || l.includes("一歩"));
        if (!hasFocusLine) {
          extra.push("いまは全部を変えなくて大丈夫です。まず一片だけに絞ると、少し呼吸がしやすくなります。");
        }
        extra.push("もし動けない理由があるなら、それも一緒に見ていきましょう。責めるためではなく、動ける条件を探すためです。");
        extra.push("いま気になっているところを、一歩だけ外側から眺めるとしたら、どこから見てみたいですか？");
        withFrame = (LINES.join("\n") + "\n\n" + extra.join("\n")).trim();
      }

      return generalToneNormalize(withFrame);
    }
  }
}

export function responseComposer(input: ResponseComposerInput): ResponseComposerOutput {
  let out = String(input?.response ?? "").replace(/\u3044\u307e\u306e\u8a00\u8449\u3092[\u201c\u201d""][^\n]*/gu, "").replace(/^\u3044\u307e\u306e\u8a00\u8449\u3092[^\n]*\n?/gm, "").trimStart();
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
  // R10_DANSHARI_COMMUNICATION_LOOP_V1: general/support 時に driftRisk を先行計算して applyPersonaReduction に渡す（gate より前のためここで計算）
  const rr = String(input?.routeReason ?? "");
  if (
    (rr === "NATURAL_GENERAL_LLM_TOP" || rr === "N2_KANAGI_PHASE_TOP") &&
    (input as any).driftRisk == null
  ) {
    try {
      const ks = computeKanagiSelfKernel({
        rawMessage: String(input?.rawMessage ?? ""),
        routeReason: rr,
        heart: (input as any)?.heart,
        topicClass: "general",
      });
      (input as any).driftRisk = ks.driftRisk;
      (input as any).selfPhase = ks.selfPhase;
      (input as any).intentPhase = ks.intentPhase;
      (input as any).shouldPersist = ks.shouldPersist;
      (input as any).shouldRecombine = ks.shouldRecombine;
    } catch {
      // 失敗時は driftRisk 未設定のまま → shouldUseDanshariCommunication は false
    }
  }
  out = applyPersonaReduction(out, meaningFrame, input?.rawMessage, (input as any)?.heart, input);
  if (input?.routeReason === "SOUL_FASTPATH_VERIFIED_V1") {
    out = soulSurfaceCleanup(soulSegmentRebuild(out));
  }
  return { response: out, meaningFrame };
}
