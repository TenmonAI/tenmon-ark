// api/src/kokuzo/search.ts
// Phase25: HYBRID candidates (deterministic, no LLM)

import { getDb } from "../db/index.js";

export type KokuzoCandidate = {
  doc: string;
  pdfPage: number;
  snippet: string;
  score: number;
};

export function searchPagesForHybrid(doc: string, query: string, limit = 10): KokuzoCandidate[] {
  const db = getDb("kokuzo");

  const q = String(query || "").trim();
  // 空クエリは候補出せないので即空（呼び出し側でfallbackする）
  if (!q) return [];

  // 1) LIKE検索（最小）
  const rows = db
    .prepare(
      `SELECT doc, pdfPage, substr(text, 1, 120) AS snippet
       FROM kokuzo_pages
       WHERE doc = ? AND text LIKE ?
       ORDER BY pdfPage ASC
       LIMIT ?`
    )
    .all(doc, `%${q}%`, limit) as any[];

  if (rows && rows.length) {
    return rows.map((r: any, i: number) => ({
      doc: String(r.doc),
      pdfPage: Number(r.pdfPage),
      snippet: String(r.snippet || ""),
      score: 100 - i,
    }));
  }

  // 2) フォールバック：投入済みのページ帯を候補として返す（導線成立が目的）
  const range = db
    .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
    .get(doc) as any;

  const minP = Number(range?.minP ?? 0);
  const maxP = Number(range?.maxP ?? 0);

  if (minP && maxP && maxP >= minP) {
    const cand: KokuzoCandidate[] = [];
    for (let p = minP; p <= maxP && cand.length < limit; p++) {
      cand.push({
        doc,
        pdfPage: p,
        snippet: "(fallback) page indexed",
        score: 10,
      });
    }
    return cand;
  }

  return [];
}
