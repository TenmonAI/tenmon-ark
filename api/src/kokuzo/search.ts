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
 * クエリを正規化（#詳細、doc/pdfPage指定、記号を除去、文字揺れ正規化）
 */
function normalizeHybridQuery(q: string): string {
  let normalized = String(q || "");
  
  // #詳細 を削除
  normalized = normalized.replace(/#詳細/g, "");
  
  // doc=... / pdfPage=... / P123 / p123 を削除（日本語/英字どちらも）
  normalized = normalized.replace(/doc\s*=\s*[^\s]+/gi, "");
  normalized = normalized.replace(/pdfPage\s*=\s*\d+/gi, "");
  normalized = normalized.replace(/[Pp]\s*\d+/g, "");
  
  // 文字揺れ正規化: 「言灵」→「言霊」、「灵」→「霊」
  normalized = normalized.replace(/言霊?灵/g, "言霊");
  normalized = normalized.replace(/灵/g, "霊");
  
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
  
  // fallback 用の doc を決定（docOrNull が null の場合は最多ページ数のdocを選ぶ）
  let targetDoc = docOrNull;
  if (!targetDoc) {
    const topDoc = db
      .prepare(
        `SELECT doc, COUNT(*) AS c
         FROM kokuzo_pages
         GROUP BY doc
         ORDER BY c DESC, doc ASC
         LIMIT 1`
      )
      .get() as any;
    targetDoc = topDoc ? String(topDoc.doc) : null;
  }

  // 正規化後のクエリが空なら fallback へ
  if (!normalizedQuery) {
    if (targetDoc) {
      const range = db
        .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
        .get(targetDoc) as any;
      const minP = Number(range?.minP ?? 0);
      const maxP = Number(range?.maxP ?? 0);
      if (minP && maxP && maxP >= minP) {
        const cand: KokuzoCandidate[] = [];
        for (let p = minP; p <= maxP && cand.length < limit; p++) {
          const pageText = db
            .prepare(`SELECT substr(text, 1, 120) AS snippet FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`)
            .get(targetDoc, p) as any;
          cand.push({
            doc: targetDoc,
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

  // 1) FTS5検索（Phase27: 全文検索で精度と速度を向上）
  // FTS5 のクエリは空白区切りで自動的に AND 検索になる
  const ftsQuery = normalizedQuery.split(/\s+/).filter(Boolean).join(" ");
  let rows: any[] = [];
  try {
    if (docOrNull) {
      rows = db
        .prepare(
          `SELECT doc, pdfPage, substr(text, 1, 120) AS snippet
           FROM kokuzo_pages_fts
           WHERE doc = ? AND kokuzo_pages_fts MATCH ?
           ORDER BY pdfPage ASC
           LIMIT ?`
        )
        .all(docOrNull, ftsQuery, limit) as any[];
    } else {
      rows = db
        .prepare(
          `SELECT doc, pdfPage, substr(text, 1, 120) AS snippet
           FROM kokuzo_pages_fts
           WHERE kokuzo_pages_fts MATCH ?
           ORDER BY pdfPage ASC
           LIMIT ?`
        )
        .all(ftsQuery, limit) as any[];
    }
  } catch (e) {
    // FTS5 テーブルが存在しない、またはクエリエラの場合は fallback へ
    console.warn("[KOKUZO-SEARCH] FTS5 search failed, falling back:", e);
    rows = [];
  }

  if (rows && rows.length) {
    return rows.map((r: any, i: number) => ({
      doc: String(r.doc),
      pdfPage: Number(r.pdfPage),
      snippet: String(r.snippet || ""),
      score: 100 - i,
    }));
  }

  // 2) フォールバック：LIKE検索が0件の場合も fallback を返す（導線成立が目的）
  if (targetDoc) {
    const range = db
      .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
      .get(targetDoc) as any;

    const minP = Number(range?.minP ?? 0);
    const maxP = Number(range?.maxP ?? 0);

    if (minP && maxP && maxP >= minP) {
      const cand: KokuzoCandidate[] = [];
      for (let p = minP; p <= maxP && cand.length < limit; p++) {
        const pageText = db
          .prepare(`SELECT substr(text, 1, 120) AS snippet FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`)
          .get(targetDoc, p) as any;
        cand.push({
          doc: targetDoc,
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
