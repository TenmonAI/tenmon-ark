// Phase29: LawCandidates（法則候補抽出）決定論実装

export type LawCandidate = {
  type: string;
  text: string;
  score: number;
  spanStart: number;
  spanEnd: number;
};

/**
 * テキストから法則候補を抽出（決定論、正規表現ベース）
 */
export function extractLawCandidates(
  text: string,
  opts?: { max?: number }
): LawCandidate[] {
  const max = opts?.max ?? 8;
  const candidates: LawCandidate[] = [];
  
  if (!text || typeof text !== "string") {
    return [];
  }
  
  // キーワードパターン（法則・御伝・云・曰など）
  const lawPatterns = [
    { pattern: /法則[^\n。]*/g, type: "法則", baseScore: 30 },
    { pattern: /御伝[^\n。]*/g, type: "御伝", baseScore: 25 },
    { pattern: /[^。\n]*(?:云|曰)[^。\n]*/g, type: "云曰", baseScore: 20 },
    { pattern: /[^。\n]*とは[^。\n]*/g, type: "定義", baseScore: 15 },
    { pattern: /[^。\n]*を云[^。\n]*/g, type: "云", baseScore: 15 },
    { pattern: /[^。\n]*と云[^。\n]*/g, type: "云", baseScore: 15 },
  ];
  
  // 行単位で分割（段落も考慮）
  const lines = text.split(/\n+/).filter((line) => line.trim().length > 0);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue; // 短すぎる行はスキップ
    
    for (const { pattern, type, baseScore } of lawPatterns) {
      const matches = trimmed.matchAll(pattern);
      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const matchedText = match[0].trim();
        if (matchedText.length < 5) continue; // 短すぎるマッチはスキップ
        
        // スコア計算：基本スコア + 長さボーナス + 密度ボーナス
        const lengthBonus = Math.min(20, Math.floor(matchedText.length / 10));
        const keywordCount = (matchedText.match(/法則|御伝|云|曰|とは|を云|と云/g) || []).length;
        const densityBonus = Math.min(15, keywordCount * 5);
        
        const score = baseScore + lengthBonus + densityBonus;
        
        // テキスト内の位置を計算
        const textIndex = text.indexOf(matchedText);
        const spanStart = textIndex >= 0 ? textIndex : 0;
        const spanEnd = spanStart + matchedText.length;
        
        candidates.push({
          type,
          text: matchedText,
          score,
          spanStart,
          spanEnd,
        });
      }
    }
  }
  
  // スコア降順でソート、重複除去（同じテキストは最高スコアのみ）
  const unique = new Map<string, LawCandidate>();
  for (const cand of candidates) {
    const key = cand.text.slice(0, 50); // 先頭50文字で重複判定
    const existing = unique.get(key);
    if (!existing || existing.score < cand.score) {
      unique.set(key, cand);
    }
  }
  
  const sorted = Array.from(unique.values()).sort((a, b) => b.score - a.score);
  return sorted.slice(0, max);
}
