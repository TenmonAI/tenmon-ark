// /opt/tenmon-ark/api/src/kotodama/retrievalIndex.ts
// Retrieval Index（高速で“本当に当たる”ページ推定）

import fs from "node:fs";
import readline from "node:readline";
import { getTokenizer } from "../kanagi/utils/tokenizerCache.js";

export type RetrievalResult = {
  doc: string;
  pdfPage: number;
  score: number;
  explain: string;
};

// インデックス: Map<doc, Map<term, Set<pdfPage>>>
type TermIndex = Map<string, Map<number, number>>; // term -> (pdfPage -> count)
type DocIndex = Map<string, TermIndex>; // doc -> TermIndex

let indexCache: DocIndex | null = null;

// ストップワード（最小限）
const STOPWORDS = new Set([
  "の", "に", "は", "を", "が", "と", "で", "て", "た", "し", "ある", "いる", "も", "から", "ため",
  "これ", "それ", "あれ", "この", "その", "あの", "これら", "それら", "あれら",
  "という", "こと", "もの", "ため", "よう", "ところ", "とき", "場合",
  "ある", "いる", "あるいは", "または", "しかし", "でも", "ただし", "なお",
]);

/**
 * テキストをトークン化（名詞/重要語のみ抽出）
 */
async function tokenizeQuery(text: string): Promise<string[]> {
  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(text);
    
    // 名詞、動詞（基本形）、形容詞を抽出
    const terms: string[] = [];
    for (const token of tokens) {
      const pos = token.pos;
      const surface = token.surface_form;
      
      // ストップワードをスキップ
      if (STOPWORDS.has(surface)) continue;
      
      // 名詞、動詞（基本形）、形容詞を抽出
      if (pos === "名詞" || pos === "動詞" || pos === "形容詞") {
        // 基本形があれば基本形を使用、なければ表層形
        const term = token.basic_form || surface;
        if (term.length > 1) { // 1文字は除外
          terms.push(term);
        }
      }
    }
    
    return [...new Set(terms)]; // 重複除去
  } catch (e) {
    console.warn("[RETRIEVAL-INDEX] Tokenization failed, using regex fallback:", e);
    // フォールバック: 漢字・カタカナ・ひらがなを抽出
    return text.match(/[一-龠々〆〤]+|[ァ-ヶー]+|[ぁ-ん]+/g) || [];
  }
}

/**
 * text.jsonl と law_candidates.jsonl を読み込んでインデックスを構築
 */
async function buildIndex(): Promise<DocIndex> {
  if (indexCache) {
    return indexCache;
  }

  const index: DocIndex = new Map();
  
  const docFiles = [
    { doc: "言霊秘書.pdf", textFile: "/opt/tenmon-corpus/db/khs_text.jsonl", lawFile: "/opt/tenmon-corpus/db/khs_law_candidates.jsonl" },
    { doc: "カタカムナ言灵解.pdf", textFile: "/opt/tenmon-corpus/db/ktk_text.jsonl", lawFile: "/opt/tenmon-corpus/db/ktk_law_candidates.jsonl" },
    { doc: "いろは最終原稿.pdf", textFile: "/opt/tenmon-corpus/db/iroha_text.jsonl", lawFile: "/opt/tenmon-corpus/db/iroha_law_candidates.jsonl" },
  ];

  for (const { doc, textFile, lawFile } of docFiles) {
    const termIndex: TermIndex = new Map();
    
    // text.jsonl を読み込み
    if (fs.existsSync(textFile)) {
      const rl = readline.createInterface({
        input: fs.createReadStream(textFile, "utf-8"),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const t = String(line).trim();
        if (!t) continue;
        try {
          const record = JSON.parse(t) as any;
          if (record.doc === doc && record.pdfPage && record.text) {
            const pdfPage = Number(record.pdfPage);
            const text = String(record.text);
            
            // テキストをトークン化
            const terms = await tokenizeQuery(text);
            for (const term of terms) {
              if (!termIndex.has(term)) {
                termIndex.set(term, new Map());
              }
              const pageMap = termIndex.get(term)!;
              pageMap.set(pdfPage, (pageMap.get(pdfPage) || 0) + 1);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    // law_candidates.jsonl を読み込み（重み2倍）
    if (fs.existsSync(lawFile)) {
      const rl = readline.createInterface({
        input: fs.createReadStream(lawFile, "utf-8"),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const t = String(line).trim();
        if (!t) continue;
        try {
          const record = JSON.parse(t) as any;
          if (record.doc === doc && record.pdfPage) {
            const pdfPage = Number(record.pdfPage);
            const text = String(record.title || "") + " " + String(record.quote || "");
            
            // テキストをトークン化（重み2倍）
            const terms = await tokenizeQuery(text);
            for (const term of terms) {
              if (!termIndex.has(term)) {
                termIndex.set(term, new Map());
              }
              const pageMap = termIndex.get(term)!;
              pageMap.set(pdfPage, (pageMap.get(pdfPage) || 0) + 2); // 法則候補は重み2倍
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    index.set(doc, termIndex);
    console.log(`[RETRIEVAL-INDEX] Built index for ${doc}: ${termIndex.size} terms`);
  }

  indexCache = index;
  return index;
}

/**
 * インデックスを初期化（起動時に呼ぶ）
 */
export async function initRetrievalIndex(): Promise<void> {
  try {
    await buildIndex();
    console.log("[RETRIEVAL-INDEX] Initialized");
  } catch (e) {
    console.error("[RETRIEVAL-INDEX] Initialization failed:", e);
  }
}

/**
 * クエリでページを検索（TopK=3）
 */
export async function searchPages(query: string, topK: number = 3): Promise<RetrievalResult[]> {
  const index = await buildIndex();
  const queryTerms = await tokenizeQuery(query);
  
  if (queryTerms.length === 0) {
    return [];
  }

  // スコアリング: Map<doc, Map<pdfPage, score>>
  const scores: Map<string, Map<number, number>> = new Map();

  for (const [doc, termIndex] of index.entries()) {
    const docScores = new Map<number, number>();

    for (const term of queryTerms) {
      const pageMap = termIndex.get(term);
      if (pageMap) {
        for (const [pdfPage, count] of pageMap.entries()) {
          docScores.set(pdfPage, (docScores.get(pdfPage) || 0) + count);
        }
      }
    }

    if (docScores.size > 0) {
      scores.set(doc, docScores);
    }
  }

  // トップKを抽出
  const results: RetrievalResult[] = [];
  
  for (const [doc, docScores] of scores.entries()) {
    const sorted = Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    for (const [pdfPage, score] of sorted) {
      const matchedTerms = queryTerms.filter(term => {
        const termIndex = index.get(doc);
        if (!termIndex) return false;
        const pageMap = termIndex.get(term);
        return pageMap?.has(pdfPage);
      });

      results.push({
        doc,
        pdfPage,
        score,
        explain: `クエリ「${query.substring(0, 30)}${query.length > 30 ? "..." : ""}」の重要語「${matchedTerms.slice(0, 3).join("、")}」が一致、${doc} P${pdfPage} に該当（スコア: ${score}）`,
      });
    }
  }

  // スコアでソートしてTopKを返す
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}


