// api/src/kokuzo/search.ts
// Phase25: HYBRID candidates (deterministic, no LLM)

import { getDb, dbPrepare } from "../db/index.js";
import type { KokuzoChunk, KokuzoSeed } from "./indexer.js";

export type KokuzoCandidate = {
  doc: string;
  pdfPage: number;
  snippet: string;
  score: number;
};

/**
 * クエリを正規化（#詳細、doc/pdfPage指定、記号を除去）
 */
function normalizeHybridQuery(q: string): string {
  let normalized = String(q || "");
  
  // #詳細 を削除
  normalized = normalized.replace(/#詳細/g, "");
  
  // doc=... / pdfPage=... / P123 / p123 を削除（日本語/英字どちらも）
  normalized = normalized.replace(/doc\s*=\s*[^\s]+/gi, "");
  normalized = normalized.replace(/pdfPage\s*=\s*\d+/gi, "");
  normalized = normalized.replace(/[Pp]\s*\d+/g, "");
  
  // 記号類を空白に（日本語記号も含む）
  normalized = normalized.replace(/[。．、,：:;!?？#=()\[\]{}<>「」『』/\\]/g, " ");
  
  // 連続空白は1つに
  normalized = normalized.replace(/\s+/g, " ");
  
  // trim
  normalized = normalized.trim();
  
  // 長さが 2 未満なら "" を返す
  if (normalized.length < 2) return "";
  
  return normalized;
}

export function searchPagesForHybrid(docOrNull: string | null, query: string, limit = 10): KokuzoCandidate[] {
  const db = getDb("kokuzo");

  // クエリを正規化
  const normalizedQuery = normalizeHybridQuery(query);
  
  // 正規化後のクエリが空なら fallback へ
  if (!normalizedQuery) {
    // fallback: doc が指定されていればその範囲、なければ全ドキュメント
    if (docOrNull) {
      const range = db
        .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
        .get(docOrNull) as any;
      const minP = Number(range?.minP ?? 0);
      const maxP = Number(range?.maxP ?? 0);
      if (minP && maxP && maxP >= minP) {
        const cand: KokuzoCandidate[] = [];
        for (let p = minP; p <= maxP && cand.length < limit; p++) {
          const pageText = db
            .prepare(`SELECT substr(text, 1, 120) AS snippet FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`)
            .get(docOrNull, p) as any;
          cand.push({
            doc: docOrNull,
            pdfPage: p,
            snippet: String(pageText?.snippet || "(fallback) page indexed"),
            score: 10,
          });
        }
        return cand;
      }
    }
    return [];
  }

  // 1) LIKE検索（doc が null の場合は WHERE doc = ? を外す）
  let rows: any[];
  if (docOrNull) {
    rows = db
      .prepare(
        `SELECT doc, pdfPage, substr(text, 1, 120) AS snippet
         FROM kokuzo_pages
         WHERE doc = ? AND text LIKE ?
         ORDER BY pdfPage ASC
         LIMIT ?`
      )
      .all(docOrNull, `%${normalizedQuery}%`, limit) as any[];
  } else {
    rows = db
      .prepare(
        `SELECT doc, pdfPage, substr(text, 1, 120) AS snippet
         FROM kokuzo_pages
         WHERE text LIKE ?
         ORDER BY pdfPage ASC
         LIMIT ?`
      )
      .all(`%${normalizedQuery}%`, limit) as any[];
  }

  if (rows && rows.length) {
    return rows.map((r: any, i: number) => ({
      doc: String(r.doc),
      pdfPage: Number(r.pdfPage),
      snippet: String(r.snippet || ""),
      score: 100 - i,
    }));
  }

  // 2) フォールバック：投入済みのページ帯を候補として返す（導線成立が目的）
  if (docOrNull) {
    const range = db
      .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
      .get(docOrNull) as any;

    const minP = Number(range?.minP ?? 0);
    const maxP = Number(range?.maxP ?? 0);

    if (minP && maxP && maxP >= minP) {
      const cand: KokuzoCandidate[] = [];
      for (let p = minP; p <= maxP && cand.length < limit; p++) {
        const pageText = db
          .prepare(`SELECT substr(text, 1, 120) AS snippet FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`)
          .get(docOrNull, p) as any;
        cand.push({
          doc: docOrNull,
          pdfPage: p,
          snippet: String(pageText?.snippet || "(fallback) page indexed"),
          score: 10,
        });
      }
      return cand;
    }
  }

  return [];
}

// --- Backward compatible exports for src/routes/kokuzo.ts ---
// NOTE: Keep deterministic. No LLM. Minimal SQL.

// /api/kokuzo route legacy: search chunks by text (LIKE)
export function searchChunks(query: string, limit = 20): KokuzoChunk[] {
  const q = String(query || "").trim();
  if (!q) return [];
  const stmt = dbPrepare(
    "kokuzo",
    `SELECT * FROM kokuzo_chunks
     WHERE text LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`
  );
  return (stmt.all(`%${q}%`, limit) as any[]) as KokuzoChunk[];
}

// /api/kokuzo route legacy: get seeds by file (source_id)
export function getSeedsByFile(fileId: number, limit = 50): KokuzoSeed[] {
  const id = Number(fileId);
  if (!Number.isFinite(id)) return [];
  const stmt = dbPrepare(
    "kokuzo",
    `SELECT * FROM kokuzo_seeds
     WHERE source_type='file' AND source_id=?
     ORDER BY created_at DESC
     LIMIT ?`
  );
  return (stmt.all(id, limit) as any[]) as KokuzoSeed[];
}
