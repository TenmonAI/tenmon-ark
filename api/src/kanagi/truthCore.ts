// src/kanagi/truthCore.ts
// Truth-Core（躰/用＋空仮中）を判定器として動かし、本質命題（正中）を算出

import type { EvidenceLaw, EvidencePack, TaiYo } from "./kanagiCore.js";
import { loadPatterns } from "./patterns/loadPatterns.js";

export type TruthCoreResult = {
  thesis: string;         // 正中命題（本質命題）
  tai: string;           // 躰（骨格）
  yo: string;            // 用（はたらき）
  kokakechuFlags: string[]; // 空仮中検知
};

export type CenterlineResult = {
  taiScore: number;      // 躰スコア（0..1）
  yoScore: number;       // 用スコア（0..1）
  hiScore: number;       // 火スコア（0..1）
  miScore: number;       // 水スコア（0..1）
  centerline: number;    // 正中軸（-1..+1、-1=水寄り、+1=火寄り、0=正中）
  confidence: number;    // 信頼度（0..1）
};

/**
 * 躰/用から正中命題（thesis）を算出
 * 言霊秘書の「躰/用」を判定器として動かす
 */
function calculateThesis(tai: string, yo: string, question: string): string {
  // 簡易実装：躰と用を統合して正中命題を生成
  // 後で高度化：正中軸での照合・生成鎖展開
  
  if (!tai && !yo) {
    return "（根拠不足：躰/用が抽出できませんでした）";
  }
  
  if (!tai) {
    return `用（${yo.slice(0, 80)}）から見ると、${question}について、はたらきの側面が示されています。`;
  }
  
  if (!yo) {
    return `躰（${tai.slice(0, 80)}）から見ると、${question}について、骨格の側面が示されています。`;
  }
  
  // 躰と用の両方がある場合：正中で統合
  return `躰（${tai.slice(0, 80)}）と用（${yo.slice(0, 80)}）から、${question}の本質は、骨格とはたらきの統合として捉えられます。`;
}

/**
 * 空仮中検知（一般テンプレ/根拠なし断定/循環説明など）
 */
function detectKokakechu(
  response: string,
  claims: Array<{ text: string; evidenceIds: string[] }>,
  evidence: EvidencePack
): string[] {
  const flags: string[] = [];
  
  // 1. 一般テンプレ検知
  const templatePatterns = [
    /(一般的に|通常|よく|しばしば|多くの場合)/,
    /(と言われています|とされています|と考えられています)/,
    /(〜です|〜ます)(が|、)(これは|それは)/,
  ];
  
  for (const pattern of templatePatterns) {
    if (pattern.test(response)) {
      flags.push("一般テンプレ混入");
      break;
    }
  }
  
  // 2. 根拠なし断定検知
  const assertionPatterns = [
    /(必ず|絶対に|確実に|間違いなく)/,
    /(〜である|〜だ)(。|$)/,
  ];
  
  let hasEvidenceForAssertions = false;
  for (const claim of claims) {
    if (claim.evidenceIds.length === 0) {
      // 根拠なしの主張がある
      if (assertionPatterns.some(p => p.test(claim.text))) {
        flags.push("根拠なし断定");
        break;
      }
    } else {
      hasEvidenceForAssertions = true;
    }
  }
  
  // 3. 循環説明検知
  const circularPatterns = [
    /(〜とは|〜は)(、|。)(その|これ|それ)(こと|もの|の)/,
    /(〜である|〜だ)(。|、)(なぜなら|それは)(〜である|〜だ)/,
  ];
  
  for (const pattern of circularPatterns) {
    if (pattern.test(response)) {
      flags.push("循環説明");
      break;
    }
  }
  
  // 4. 根拠不足検知
  if (evidence.laws.length === 0 && !evidence.pageText) {
    flags.push("根拠不足");
  }
  
  return flags;
}

/**
 * Truth-Core（躰/用＋空仮中）を実行
 */
export function runTruthCore(
  question: string,
  taiyo: TaiYo,
  response: string,
  claims: Array<{ text: string; evidenceIds: string[] }>,
  evidence: EvidencePack
): TruthCoreResult {
  const tai = taiyo.tai.text || "";
  const yo = taiyo.yo.text || "";
  
  // 正中命題を算出
  const thesis = calculateThesis(tai, yo, question);
  
  // 空仮中検知
  const kokakechuFlags = detectKokakechu(response, claims, evidence);
  
  return {
    thesis,
    tai,
    yo,
    kokakechuFlags,
  };
}

/**
 * Phase 5: 正中（centerline）を数値化（天津金木"計算"の核）
 * 
 * CorePlanに必ず持たせる：
 * - taiScore, yoScore, hiScore, miScore, centerline(-1..+1), confidence
 */
export function computeCenterline(
  evidencePack: EvidencePack,
  taiyo: TaiYo
): CenterlineResult {
  // まずは決定論で実装（後で改善）
  
  // 躰/用スコア（テキスト長とキーワード含有度から算出）
  const taiText = taiyo.tai.text || "";
  const yoText = taiyo.yo.text || "";
  
  const taiKeywords = ["躰", "体", "正中", "生成", "法則"];
  const yoKeywords = ["用", "働", "はたらき", "運用", "水", "流"];
  const hiKeywords = ["火", "外発", "拡散", "陽"];
  const miKeywords = ["水", "内集", "収束", "陰"];
  
  function calculateScore(text: string, keywords: string[]): number {
    if (!text) return 0;
    const lower = text.toLowerCase();
    const matches = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    const lengthScore = Math.min(1.0, text.length / 200); // 長さは200文字で1.0
    return Math.min(1.0, (matches / keywords.length) * 0.7 + lengthScore * 0.3);
  }
  
  const taiScore = calculateScore(taiText, taiKeywords);
  const yoScore = calculateScore(yoText, yoKeywords);
  
  // 火/水スコア（本文から算出）
  const pageText = evidencePack.pageText || "";
  const pageLower = pageText.toLowerCase();
  
  const hiMatches = hiKeywords.filter(kw => pageLower.includes(kw.toLowerCase())).length;
  const miMatches = miKeywords.filter(kw => pageLower.includes(kw.toLowerCase())).length;
  
  const hiScore = Math.min(1.0, hiMatches / hiKeywords.length);
  const miScore = Math.min(1.0, miMatches / miKeywords.length);
  
  // 正中軸（-1..+1）
  // 火（+1）と水（-1）のバランス、躰/用のバランスから算出
  const fireWaterBalance = hiScore > miScore ? (hiScore - miScore) : -(miScore - hiScore);
  const taiYoBalance = taiScore > yoScore ? (taiScore - yoScore) * 0.3 : -(yoScore - taiScore) * 0.3;
  
  // centerline: 火水バランスを主軸、躰/用バランスを補正
  const centerline = Math.max(-1, Math.min(1, fireWaterBalance + taiYoBalance));
  
  // 信頼度（根拠の多さとスコアの明瞭さから算出）
  const evidenceWeight = Math.min(1.0, evidencePack.laws.length / 5); // 5件で1.0
  const scoreClarity = Math.abs(centerline); // 中心からの距離が大きいほど明瞭
  const confidence = Math.min(1.0, (evidenceWeight * 0.7 + scoreClarity * 0.3));
  
  return {
    taiScore,
    yoScore,
    hiScore,
    miScore,
    centerline,
    confidence,
  };
}

