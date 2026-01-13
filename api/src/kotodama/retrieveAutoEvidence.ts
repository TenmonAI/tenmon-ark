// retrieveAutoEvidence.ts
// doc/pdfPage未指定でも自動で資料を引いて回答するための検索機能

import fs from "node:fs";
import readline from "node:readline";

export type AutoEvidenceHit = {
  doc: string;
  pdfPage: number;
  score: number;
  quoteSnippets: string[]; // 周辺抜粋（最大3件）
};

export type AutoEvidenceResult = {
  hits: AutoEvidenceHit[];
  confidence: number; // 0.0-1.0（最高スコアの正規化）
};

const TEXT_FILES = [
  { doc: "言霊秘書.pdf", file: "/opt/tenmon-corpus/db/khs_text.jsonl" },
  { doc: "カタカムナ言灵解.pdf", file: "/opt/tenmon-corpus/db/ktk_text.jsonl" },
  { doc: "いろは最終原稿.pdf", file: "/opt/tenmon-corpus/db/iroha_text.jsonl" },
] as const;

/**
 * メッセージからキーワードを抽出（簡易版）
 */
function extractKeywords(message: string): string[] {
  const keywords: string[] = [];
  
  // ドメインキーワード
  const domainPatterns = [
    /(言[霊靈灵]|言霊|言靈|言灵|ことだま)/g,
    /(カタカムナ|天津金木|布斗麻邇|フトマニ)/g,
    /(いろは|辞|テニヲハ|てにをは)/g,
    /(躰|体|用|正中|火水|生成鎖)/g,
  ];
  
  for (const pattern of domainPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.trim()).filter(Boolean));
    }
  }
  
  // 一般キーワード（2文字以上、ひらがな/カタカナ/漢字を含む）
  const generalKeywords = message
    .split(/\s+/)
    .filter(w => w.length >= 2 && /[ひらがなカタカナ漢字]/.test(w))
    .slice(0, 5); // 最大5個
  
  keywords.push(...generalKeywords);
  
  return Array.from(new Set(keywords)).filter(Boolean);
}

/**
 * テキスト内のキーワード一致数をカウント
 */
function countKeywordMatches(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    // 単語境界を考慮したマッチング
    const regex = new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  
  return count;
}

/**
 * キーワード周辺の抜粋を取得（最大3件）
 */
function extractQuoteSnippets(text: string, keywords: string[], maxSnippets: number = 3): string[] {
  const snippets: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords.slice(0, 5)) { // 最初の5個のキーワードのみ
    if (snippets.length >= maxSnippets) break;
    
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    
    if (index >= 0) {
      const start = Math.max(0, index - 100);
      const end = Math.min(text.length, index + keyword.length + 100);
      const snippet = text.substring(start, end).trim();
      
      // 重複チェック
      if (!snippets.some(s => s.includes(snippet.substring(0, 50)))) {
        snippets.push(snippet);
      }
    }
  }
  
  return snippets.slice(0, maxSnippets);
}

/**
 * スコア計算（キーワード一致数 + 長さペナルティ）
 */
function calculateScore(
  keywordMatches: number,
  textLength: number,
  quoteSnippetsCount: number
): number {
  // キーワード一致数（重み: 10）
  const matchScore = keywordMatches * 10;
  
  // 抜粋数ボーナス（重み: 5）
  const snippetBonus = quoteSnippetsCount * 5;
  
  // 長さペナルティ（長すぎるテキストは減点）
  const lengthPenalty = textLength > 5000 ? (textLength - 5000) * 0.01 : 0;
  
  return Math.max(0, matchScore + snippetBonus - lengthPenalty);
}

/**
 * 自動証拠検索（khs/ktk/iroha_text.jsonl を横断検索）
 */
export async function retrieveAutoEvidence(message: string): Promise<AutoEvidenceResult> {
  const keywords = extractKeywords(message);
  
  if (keywords.length === 0) {
    return { hits: [], confidence: 0.0 };
  }
  
  const allHits: AutoEvidenceHit[] = [];
  
  // 各テキストファイルを検索
  for (const { doc, file } of TEXT_FILES) {
    if (!fs.existsSync(file)) {
      continue;
    }
    
    const rl = readline.createInterface({
      input: fs.createReadStream(file, "utf-8"),
      crlfDelay: Infinity,
    });
    
    for await (const line of rl) {
      const t = String(line).trim();
      if (!t) continue;
      
      try {
        const record = JSON.parse(t) as any;
        if (record.doc !== doc || !record.pdfPage || !record.text) {
          continue;
        }
        
        const text = String(record.text);
        const keywordMatches = countKeywordMatches(text, keywords);
        
        if (keywordMatches === 0) {
          continue; // マッチしない場合はスキップ
        }
        
        const quoteSnippets = extractQuoteSnippets(text, keywords, 3);
        const score = calculateScore(keywordMatches, text.length, quoteSnippets.length);
        
        allHits.push({
          doc,
          pdfPage: Number(record.pdfPage),
          score,
          quoteSnippets,
        });
      } catch (e) {
        continue;
      }
    }
  }
  
  // スコアでソート（降順）
  allHits.sort((a, b) => b.score - a.score);
  
  // 上位3件を取得
  const topHits = allHits.slice(0, 3);
  
  // confidence計算（最高スコアを正規化、最低0.0、最高1.0）
  const maxScore = topHits.length > 0 ? topHits[0].score : 0;
  const confidence = maxScore > 0 ? Math.min(1.0, maxScore / 100.0) : 0.0; // スコア100を1.0に正規化
  
  return {
    hits: topHits,
    confidence,
  };
}


