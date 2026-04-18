export interface SanskritCandidate {
  candidate: string;
  meaning: string;
  confidence: number;
  basis: "音声近似" | "語源推定" | "形態類似";
  note: "候補であり確定ではありません";
}

export interface NameAnalysisResult {
  vowelPattern: string[];
  consonantSeries: string[];
  outwardInwardBias: "outward" | "inward" | "balanced";
  expansionContractionBias: "expansion" | "contraction" | "balanced";
  kotodamaTendency: string;
  kanjiTheme: string;
  sanskritCandidates: SanskritCandidate[];
}

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

const ROMAJI_KANA_MAP: Array<{ pattern: RegExp; vowel: string; consonant: string }> = [
  { pattern: /[あかさたなはまやらわがざだばぱぁゃゎ]/g, vowel: "a", consonant: "a" },
  { pattern: /[いきしちにひみりぎじぢびぴぃ]/g, vowel: "i", consonant: "i" },
  { pattern: /[うくすつぬふむゆるぐずづぶぷぅゅ]/g, vowel: "u", consonant: "u" },
  { pattern: /[えけせてねへめれげぜでべぺぇ]/g, vowel: "e", consonant: "e" },
  { pattern: /[おこそとのほもよろをごぞどぼぽぉょを]/g, vowel: "o", consonant: "o" },
];

const KANJI_THEME_MAP: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /[海湖川泉波水潮洋]/, theme: "水系の流動性" },
  { pattern: /[火炎灯照晴陽日暁]/, theme: "火系の推進力" },
  { pattern: /[月星宙空天光]/, theme: "天体・精神性" },
  { pattern: /[森林木花葉草]/, theme: "自然・育成" },
  { pattern: /[愛心優慈恵結和]/, theme: "関係性・受容" },
  { pattern: /[翔飛走進拓志]/, theme: "行動・拡張" },
];

const SANSKRIT_HINTS: Array<{
  pattern: RegExp;
  candidate: string;
  meaning: string;
  confidence: number;
  basis: "音声近似" | "語源推定" | "形態類似";
}> = [
  { pattern: /(あ|か|ら|ん)/, candidate: "ākāśa", meaning: "虚空", confidence: 0.34, basis: "音声近似" },
  { pattern: /(ま|な|む)/, candidate: "manas", meaning: "意・こころ", confidence: 0.36, basis: "語源推定" },
  { pattern: /(ら|り|る)/, candidate: "rta", meaning: "宇宙秩序", confidence: 0.31, basis: "形態類似" },
  { pattern: /(し|しゃ|しゅ)/, candidate: "śakti", meaning: "力・能動性", confidence: 0.35, basis: "音声近似" },
  { pattern: /(よ|ゆ)/, candidate: "yoga", meaning: "結合・統合", confidence: 0.33, basis: "語源推定" },
  // 閾値確認用（0.3未満は出力しない）
  { pattern: /(え|へ)/, candidate: "veda", meaning: "知識", confidence: 0.29, basis: "形態類似" },
];

function toHiragana(input: string): string {
  return input
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[^\p{Script=Hiragana}\p{Script=Han}]/gu, "");
}

function extractVowelsAndConsonants(kana: string): { vowels: string[]; consonants: string[] } {
  const vowels: string[] = [];
  const consonants: string[] = [];
  for (const { pattern, vowel, consonant } of ROMAJI_KANA_MAP) {
    const m = kana.match(pattern);
    if (!m) continue;
    for (let i = 0; i < m.length; i += 1) {
      vowels.push(vowel);
      consonants.push(consonant);
    }
  }
  return { vowels, consonants };
}

export function analyzeName(nameKanji: string, nameKana: string, nameKatakana?: string): NameAnalysisResult {
  const safeKanji = String(nameKanji || "").trim();
  const safeKanaRaw = String(nameKana || nameKatakana || "").trim();
  const safeKana = toHiragana(safeKanaRaw);
  if (!safeKanji && !safeKana) {
    return {
      vowelPattern: [],
      consonantSeries: [],
      outwardInwardBias: "balanced",
      expansionContractionBias: "balanced",
      kotodamaTendency: "入力が不足しているため、名前傾向は保留",
      kanjiTheme: "未判定",
      sanskritCandidates: [],
    };
  }

  const { vowels, consonants } = extractVowelsAndConsonants(safeKana);
  const outwardScore = vowels.filter((v) => v === "a" || v === "o").length;
  const inwardScore = vowels.filter((v) => v === "i" || v === "u").length;
  const expansionScore = vowels.filter((v) => v === "a" || v === "e").length;
  const contractionScore = vowels.filter((v) => v === "i" || v === "u").length;

  const outwardInwardBias =
    outwardScore - inwardScore >= 2 ? "outward" : inwardScore - outwardScore >= 2 ? "inward" : "balanced";
  const expansionContractionBias =
    expansionScore - contractionScore >= 2
      ? "expansion"
      : contractionScore - expansionScore >= 2
        ? "contraction"
        : "balanced";

  const kanjiTheme =
    KANJI_THEME_MAP.find((entry) => entry.pattern.test(safeKanji))?.theme ||
    (safeKanji ? "中庸・文脈依存" : "未判定");

  const rawSanskritCandidates = SANSKRIT_HINTS.filter((hint) => hint.pattern.test(safeKana))
    .map((hint) => ({
      candidate: hint.candidate,
      meaning: hint.meaning,
      confidence: hint.confidence,
      basis: hint.basis,
      note: "候補であり確定ではありません" as const,
    }))
    .filter((c) => c.confidence >= 0.3);

  const uniq: Record<string, SanskritCandidate> = {};
  for (const c of rawSanskritCandidates) {
    if (!uniq[c.candidate] || uniq[c.candidate].confidence < c.confidence) uniq[c.candidate] = c;
  }

  const kotodamaTendency =
    outwardInwardBias === "outward"
      ? "外へ働きかける発信型。焦りが強い時は内側の整流が鍵"
      : outwardInwardBias === "inward"
        ? "内側で熟成する内観型。溜め込み過多時は外への小出しが鍵"
        : "外内の往復が可能な調和型。場面ごとの切替がテーマ";

  const vowelPattern = vowels.filter((v) => VOWELS.has(v));
  return {
    vowelPattern,
    consonantSeries: consonants,
    outwardInwardBias,
    expansionContractionBias,
    kotodamaTendency,
    kanjiTheme,
    sanskritCandidates: Object.values(uniq),
  };
}
