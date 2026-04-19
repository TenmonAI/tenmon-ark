/**
 * 言霊秘書 稲荷古伝五十連法則 ローダー
 *
 * 原典: kotodama_genten_data.json (山口志道霊学全集)
 * 現状: 12 音格納 (ア,イ,ウ,エ,オ,カ,キ,ク,ケ,コ,サ,ハ)
 * V2.0: 12 音を「第一優先」として正式採用、残りは irohaEngine で補完
 */

import fs from "node:fs";
import path from "node:path";

export type GojirenColumn = {
  position: number;
  name: string;
  type: string;
  sounds: string[];
  color: string;
  element: string;
};

export type KotodamaSound = {
  char: string;
  classification: string;
  meanings: string[];
  spiritual_origin: string;
  element: string;
  polarity: string;
  position: string;
  body: string;
};

export type KotodamaGentenCanon = {
  title: string;
  source: string;
  gojirenColumns: GojirenColumn[];
  soundMeanings: Record<string, KotodamaSound>;
  kuniNoKakaDen: Record<string, string[]>;
};

let __cache: KotodamaGentenCanon | null = null;

export function loadKotodamaGenten(): KotodamaGentenCanon {
  if (__cache) return __cache;

  const jsonPath = path.resolve(
    process.cwd(),
    "../kotodama_genten_data.json"
  );
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  __cache = {
    title: raw.title,
    source: raw.source,
    gojirenColumns: raw.gojiuren_structure?.columns || [],
    soundMeanings: raw.kotodama_meanings || {},
    kuniNoKakaDen: raw.kuni_no_kaka_den?.structure || {},
  };
  return __cache;
}

/**
 * ユーザー発話から重要音を抽出 (五十連構造に基づく)
 * V2.0: 空中水灵(陰) → 昇火灵(陽) → 水火灵(統合) の流れで重み付け
 */
export function extractKeyKotodamaFromText(
  text: string,
  maxSounds = 5
): KotodamaSound[] {
  const canon = loadKotodamaGenten();
  const found: KotodamaSound[] = [];
  const seen = new Set<string>();

  // ひらがな → カタカナ変換
  const katakanaText = text.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );

  for (const ch of katakanaText) {
    if (seen.has(ch)) continue;
    const sound = canon.soundMeanings[ch];
    if (sound) {
      found.push({ ...sound, char: ch });
      seen.add(ch);
      if (found.length >= maxSounds) break;
    }
  }

  return found;
}

export function buildKotodamaGentenInjection(
  sounds: KotodamaSound[],
  maxLength?: number
): string {
  if (sounds.length === 0) return "";

  const lines = sounds.map(
    (s) =>
      `・${s.char} (${s.classification}): ${s.meanings
        .slice(0, 3)
        .join("・")} / 起源: ${s.spiritual_origin} / 元素: ${s.element}`
  );

  let result = `
【言霊秘書 稲荷古伝五十連法則 (山口志道霊学全集)】

ユーザー発話の重要音:
${lines.join("\n")}

この音の陰陽・元素・極性を踏まえて応答すること。
`;

  if (typeof maxLength === "number" && maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

export function kotodamaGentenStats() {
  const c = loadKotodamaGenten();
  return {
    source: c.source,
    columns: c.gojirenColumns.length,
    soundMeanings: Object.keys(c.soundMeanings).length,
    maxCoverage: 50,
  };
}
