// src/kanagi/kanagiCoreV0.ts
// Kanagi Core v0（数値化）：語彙ヒットの決定論で中心線を計算

export type EvidenceLawV0 = {
  id: string;
  title: string;
  quote: string;
};

export type KanagiCoreV0Input = {
  laws: EvidenceLawV0[];
  pageText: string;
};

export type KanagiCoreV0Result = {
  taiScore: number;      // 躰スコア（0..1）
  yoScore: number;       // 用スコア（0..1）
  fireScore: number;     // 火スコア（0..1）
  waterScore: number;    // 水スコア（0..1）
  centerline: number;    // 中心線（-1..+1、-1=水寄り、+1=火寄り、0=正中）
  confidence: number;    // 信頼度（0..1）
};

// 語彙セット（決定論）
const TAI_VOCAB = ["躰", "体", "正中", "生成", "法則", "構造", "骨格"];
const YO_VOCAB = ["用", "働", "はたらき", "運用", "流", "機能"];
const FIRE_VOCAB = ["火", "外発", "拡散", "陽", "外", "発散", "拡"];
const WATER_VOCAB = ["水", "内集", "収束", "陰", "内", "集約", "収"];

/**
 * 語彙ヒット数を計算（決定論）
 */
function countVocabHits(text: string, vocab: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return vocab.filter(v => lower.includes(v.toLowerCase())).length;
}

/**
 * スコアを計算（0..1に正規化）
 */
function calculateScore(hits: number, vocabSize: number): number {
  return Math.min(1.0, hits / vocabSize);
}

/**
 * Kanagi Core v0: 語彙ヒットの決定論で中心線を計算
 * 
 * @param input - laws(quote/title)とpageText
 * @returns 数値化された中心線と信頼度
 */
export function computeKanagiCoreV0(input: KanagiCoreV0Input): KanagiCoreV0Result {
  const { laws, pageText } = input;

  // すべてのテキストを統合（title + quote + pageText）
  const allText = [
    ...laws.map(l => l.title || ""),
    ...laws.map(l => l.quote || ""),
    pageText || "",
  ].join(" ");

  // 語彙ヒット数を計算
  const taiHits = countVocabHits(allText, TAI_VOCAB);
  const yoHits = countVocabHits(allText, YO_VOCAB);
  const fireHits = countVocabHits(allText, FIRE_VOCAB);
  const waterHits = countVocabHits(allText, WATER_VOCAB);

  // スコアを計算（0..1に正規化）
  const taiScore = calculateScore(taiHits, TAI_VOCAB.length);
  const yoScore = calculateScore(yoHits, YO_VOCAB.length);
  const fireScore = calculateScore(fireHits, FIRE_VOCAB.length);
  const waterScore = calculateScore(waterHits, WATER_VOCAB.length);

  // 中心線を計算（-1..+1）
  // fire > water なら +1寄り、water > fire なら -1寄り、等しいなら 0
  const fireWaterBalance = fireHits > waterHits 
    ? (fireHits - waterHits) / Math.max(fireHits + waterHits, 1)
    : -(waterHits - fireHits) / Math.max(fireHits + waterHits, 1);

  // 躰/用バランスも補正として加える（小さい補正）
  const taiYoBalance = taiHits > yoHits
    ? (taiHits - yoHits) / Math.max(taiHits + yoHits, 1) * 0.3
    : -(yoHits - taiHits) / Math.max(taiHits + yoHits, 1) * 0.3;

  const centerline = Math.max(-1, Math.min(1, fireWaterBalance + taiYoBalance));

  // 信頼度を計算
  // 根拠の多さ（laws.length）と語彙ヒットの明瞭さ（中心からの距離）から算出
  const evidenceWeight = Math.min(1.0, laws.length / 5); // 5件で1.0
  const clarityWeight = Math.abs(centerline); // 中心からの距離が大きいほど明瞭
  const confidence = Math.min(1.0, evidenceWeight * 0.7 + clarityWeight * 0.3);

  return {
    taiScore,
    yoScore,
    fireScore,
    waterScore,
    centerline,
    confidence,
  };
}

