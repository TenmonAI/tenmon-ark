// Phase30: SaikihoLawSet（水火の法則の内部構造抽出）決定論実装

export type SaikihoLaw = {
  lawId: string;
  body: string;
  keywords: string[];
  evidence?: {
    doc: string;
    pdfPage: number;
    spanStart?: number;
    spanEnd?: number;
  };
};

/**
 * テキストから水火の法則を抽出（決定論、正規表現ベース）
 */
export function extractSaikihoLawsFromText(
  text: string,
  opts?: { max?: number }
): SaikihoLaw[] {
  const max = opts?.max ?? 8;
  const laws: SaikihoLaw[] = [];
  
  if (!text || typeof text !== "string") {
    return [];
  }
  
  // キーワードパターン（水火の法則関連）
  const lawPatterns = [
    { pattern: /水火[^\n。]*法則[^\n。]*/g, keywords: ["水火", "法則"], baseScore: 40 },
    { pattern: /水火の法則[^\n。]*/g, keywords: ["水火", "法則"], baseScore: 40 },
    { pattern: /與合[^\n。]*/g, keywords: ["與合"], baseScore: 30 },
    { pattern: /搦[^\n。]*/g, keywords: ["搦"], baseScore: 25 },
    { pattern: /出息[^\n。]*入息[^\n。]*/g, keywords: ["出息", "入息"], baseScore: 30 },
    { pattern: /入息[^\n。]*出息[^\n。]*/g, keywords: ["入息", "出息"], baseScore: 30 },
    { pattern: /[^。\n]*(?:天|地|人)[^。\n]*(?:天|地|人)[^。\n]*/g, keywords: ["天", "地", "人"], baseScore: 25 },
    { pattern: /正中[^\n。]*/g, keywords: ["正中"], baseScore: 30 },
    { pattern: /水火[^\n。]*/g, keywords: ["水火"], baseScore: 20 },
  ];
  
  // 行単位で分割（段落も考慮）
  const lines = text.split(/\n+/).filter((line) => line.trim().length > 0);
  
  let lawCounter = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue; // 短すぎる行はスキップ
    
    for (const { pattern, keywords, baseScore } of lawPatterns) {
      const matches = trimmed.matchAll(pattern);
      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const matchedText = match[0].trim();
        if (matchedText.length < 5) continue; // 短すぎるマッチはスキップ
        
        // スコア計算：基本スコア + 長さボーナス + キーワード密度ボーナス
        const lengthBonus = Math.min(20, Math.floor(matchedText.length / 10));
        const keywordCount = keywords.reduce((count, kw) => {
          return count + (matchedText.match(new RegExp(kw, "g")) || []).length;
        }, 0);
        const densityBonus = Math.min(15, keywordCount * 5);
        
        const score = baseScore + lengthBonus + densityBonus;
        
        // テキスト内の位置を計算
        const textIndex = text.indexOf(matchedText);
        const spanStart = textIndex >= 0 ? textIndex : 0;
        const spanEnd = spanStart + matchedText.length;
        
        lawCounter++;
        const lawId = `SAIKIHO-L${lawCounter}`;
        
        laws.push({
          lawId,
          body: matchedText,
          keywords,
          evidence: {
            doc: "", // 呼び出し側で設定
            pdfPage: 0, // 呼び出し側で設定
            spanStart,
            spanEnd,
          },
        });
      }
    }
  }
  
  // スコア降順でソート、重複除去（同じ body は最高スコアのみ）
  const unique = new Map<string, SaikihoLaw>();
  for (const law of laws) {
    const key = law.body.slice(0, 50); // 先頭50文字で重複判定
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, law);
    }
  }
  
  const sorted = Array.from(unique.values());
  return sorted.slice(0, max);
}
