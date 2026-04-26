/**
 * いろは言霊解 原典ローダー (天道仁聞 著)
 *
 * 原典: shared/kotodama/iroha_kotodama_hisho.json (1,037 段落)
 * V1.1 追補: 秘密荘厳心を人間の具体的行動指針として取り入れる
 * V2.0: 完成領域への最終実装
 */

import fs from "node:fs";
import path from "node:path";

export type IrohaParagraph = {
  index: number;
  text: string;
  chapter: string | null;
  soundAnchors: string[];
  principleTags: string[];
  healthRelated: boolean;
  chapterTagsV5?: string[]; // CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1 (TENMON 5 章, 構造軸, optional)
};

export type IrohaKotodamaCanon = {
  title: string;
  totalParagraphs: number;
  paragraphs: IrohaParagraph[];
  chapterIndex: Record<string, number[]>;
  soundIndex: Record<string, number[]>;
  principleIndex: Record<string, number[]>;
  healthIndex: number[];
};

let __cache: IrohaKotodamaCanon | null = null;

// 章判定キーワード (V2.0: TENMON 原稿末尾の 7 章構造に準拠)
const CHAPTER_KEYWORDS: Record<string, RegExp> = {
  "第一章_普遍叡智":
    /いろは言[霊灵靈]解に秘められた普遍叡智|空海が天地創造の原理/,
  "第二章_イゑす":
    /イゑす|イエス|命の普遍的展開|天之御中主/,
  "第三章_モせす":
    /モせす|モーセ|律法と境界|結び/,
  "第四章_トカナクテシス":
    /トカナクテシス|咎なくて死す|解組と再発/,
  "第五章_聖書的誤解":
    /聖書的誤解|贖罪の悲劇/,
  "第六章_空海の霊的役割":
    /空海の霊的役割|天照として再|遍照金剛/,
  "第七章_結論":
    /死を悲劇ではなく|再生と光明の扉/,
};

// 音アンカー抽出 (V2.0: カタカナ + ひらがな両対応)
const SOUND_CHARS =
  /[イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセスンいろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす]/gu;

// 理 (ことわり) のカテゴリ判定
const PRINCIPLE_KEYWORDS: Record<string, RegExp> = {
  "水火": /水火|水と火|みずほ|呼吸|循環|血液|消化/,
  "結び": /結び|縁|契り|夫婦|家族|絡み/,
  "生死": /生死|生きる|死ぬ|輪廻|魂|命/,
  "発顕": /顕現|発動|始まり|芽生え|開闢/,
  "浄化": /浄化|清める|濁|手放|整理|執着/,
  "凝固": /凝|固まる|根|定まる|成る/,
};

// 健康関連判定 (V2.0: TENMON 原稿の健康章への対応)
const HEALTH_KEYWORDS =
  /健康|病|治|癒|体調|症状|食|消化|血液|循環|呼吸|水|薬|医|療|快復|浄化|便|尿|栄養/;

// CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1: TENMON 5 章 (構造軸) multi-tag dict (private, no shared/)
const CHAPTER_KEYWORDS_V5: Record<string, string[]> = {
  "47ji":    ["四十七", "47字", "五十音", "いろは47", "ヰ", "ヱ"],
  "ongi":    ["音義", "音意", "音響", "響き", "霊響"],
  "seimei":  ["生命", "命", "いのち", "生きる", "誕生"],
  "shisei":  ["死", "別れ", "終わり", "転化", "再生", "輪廻"],
  "hokekyo": ["法華", "妙法", "蓮華", "如来寿量品", "薬王菩薩", "観世音菩薩", "普門品", "常不軽菩薩", "舍利弗", "提婆達多"],
};

function detectChapter(text: string): string | null {
  for (const [chapter, regex] of Object.entries(CHAPTER_KEYWORDS)) {
    if (regex.test(text)) return chapter;
  }
  return null;
}

function extractSoundAnchors(text: string): string[] {
  const matches = text.match(SOUND_CHARS) || [];
  return Array.from(new Set(matches));
}

function detectPrinciples(text: string): string[] {
  const hit: string[] = [];
  for (const [principle, regex] of Object.entries(PRINCIPLE_KEYWORDS)) {
    if (regex.test(text)) hit.push(principle);
  }
  return hit;
}

// CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1: 既存 paragraph.chapter (7 章) は維持。
export function classifyIrohaChapterTagsV5(paragraph: IrohaParagraph): string[] {
  const text =
    (paragraph.text || "") + " " +
    (paragraph.principleTags || []).join(" ") + " " +
    (paragraph.chapter || "");
  const tags: string[] = [];
  for (const [chapterId, kws] of Object.entries(CHAPTER_KEYWORDS_V5)) {
    for (const kw of kws) {
      if (text.includes(kw)) { tags.push(chapterId); break; }
    }
  }
  return tags;
}

export function loadIrohaKotodama(): IrohaKotodamaCanon {
  if (__cache) return __cache;

  const jsonPath = path.resolve(
    process.cwd(),
    "../shared/kotodama/iroha_kotodama_hisho.json"
  );
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as {
    title: string;
    total_paragraphs: number;
    content: string[];
  };

  const paragraphs: IrohaParagraph[] = raw.content.map((text, index) => ({
    index,
    text,
    chapter: detectChapter(text),
    soundAnchors: extractSoundAnchors(text),
    principleTags: detectPrinciples(text),
    healthRelated: HEALTH_KEYWORDS.test(text),
  }));
  for (const p of paragraphs) p.chapterTagsV5 = classifyIrohaChapterTagsV5(p);

  const chapterIndex: Record<string, number[]> = {};
  const soundIndex: Record<string, number[]> = {};
  const principleIndex: Record<string, number[]> = {};
  const healthIndex: number[] = [];

  for (const p of paragraphs) {
    if (p.chapter) {
      (chapterIndex[p.chapter] ||= []).push(p.index);
    }
    for (const s of p.soundAnchors) {
      (soundIndex[s] ||= []).push(p.index);
    }
    for (const pr of p.principleTags) {
      (principleIndex[pr] ||= []).push(p.index);
    }
    if (p.healthRelated) healthIndex.push(p.index);
  }

  __cache = {
    title: raw.title,
    totalParagraphs: raw.total_paragraphs,
    paragraphs,
    chapterIndex,
    soundIndex,
    principleIndex,
    healthIndex,
  };
  return __cache;
}

/**
 * ユーザー発話から関連する段落を最大 3 件抽出
 * V2.0: 秘密荘厳心の「具体的行動指針」として注入される
 */
export function queryIrohaByUserText(
  userText: string,
  maxParagraphs = 3
): IrohaParagraph[] {
  const canon = loadIrohaKotodama();
  const scores = new Map<number, number>();

  // ユーザー発話の音
  const userSounds = extractSoundAnchors(userText);
  for (const s of userSounds) {
    for (const idx of canon.soundIndex[s] || []) {
      scores.set(idx, (scores.get(idx) || 0) + 1);
    }
  }

  // 理のカテゴリ
  const userPrinciples = detectPrinciples(userText);
  for (const p of userPrinciples) {
    for (const idx of canon.principleIndex[p] || []) {
      scores.set(idx, (scores.get(idx) || 0) + 2);
    }
  }

  // 健康関連ボーナス
  if (HEALTH_KEYWORDS.test(userText)) {
    for (const idx of canon.healthIndex) {
      scores.set(idx, (scores.get(idx) || 0) + 3);
    }
  }

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxParagraphs)
    .map(([idx]) => canon.paragraphs[idx]);

  return ranked;
}

/**
 * system prompt 注入文の生成
 * V2.0: TENMON 原文 (V1.1) の「秘密荘厳心」を反映
 */
export function buildIrohaInjection(
  paragraphs: IrohaParagraph[],
  maxCharsPerParagraph = 300
): string {
  if (paragraphs.length === 0) return "";

  const cited = paragraphs.map((p) => {
    const excerpt =
      p.text.length > maxCharsPerParagraph
        ? p.text.slice(0, maxCharsPerParagraph) + "..."
        : p.text;
    const tags = [
      p.chapter ? `[${p.chapter}]` : "",
      p.principleTags.length ? `[理: ${p.principleTags.join("・")}]` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `${tags}\n「${excerpt}」`;
  });

  return `
【いろは言霊解 原典 (天道仁聞 著) - 秘密荘厳心】

この応答は、以下の原典の理に基づいて構築されること。
LLM の一般的回答ではなく、この原典の視点から具体的な行動指針を示すこと。

${cited.join("\n\n")}

(出典: いろは言霊解, 参照: 言霊秘書 八幡書店)
`;
}

export function irohaCanonStats() {
  const c = loadIrohaKotodama();
  return {
    totalParagraphs: c.totalParagraphs,
    chapters: Object.keys(c.chapterIndex).length,
    indexedSounds: Object.keys(c.soundIndex).length,
    indexedPrinciples: Object.keys(c.principleIndex).length,
    healthParagraphs: c.healthIndex.length,
  };
}

// CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1: 注入 paragraph の 5 章別 KPI 集計 (buildIrohaInjection signature は不変)
export type IrohaChapterSummaryV1 = {
  totalChars: number;
  chapters: Record<string, { chars: number; hits: number }>;
};

export function summarizeIrohaInjectionByChapterV1(paragraphs: IrohaParagraph[]): IrohaChapterSummaryV1 {
  const chapters: Record<string, { chars: number; hits: number }> = Object.fromEntries(
    (["47ji", "ongi", "seimei", "shisei", "hokekyo"] as const).map((k) => [k, { chars: 0, hits: 0 }])
  );
  let totalChars = 0;
  for (const p of paragraphs) {
    const len = (p.text || "").length;
    totalChars += len;
    const tags = p.chapterTagsV5 ?? classifyIrohaChapterTagsV5(p);
    for (const tag of tags) {
      const c = chapters[tag];
      if (c) { c.chars += len; c.hits += 1; }
    }
  }
  return { totalChars, chapters };
}
