// src/kanagi/truthCore.ts
// Truth-Core（躰/用＋空仮中）を判定器として動かし、本質命題（正中）を算出

import type { EvidenceLaw, EvidencePack, TaiYo } from "./kanagiCore.js";

export type TruthCoreResult = {
  thesis: string;         // 正中命題（本質命題）
  tai: string;           // 躰（骨格）
  yo: string;            // 用（はたらき）
  kokakechuFlags: string[]; // 空仮中検知
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

