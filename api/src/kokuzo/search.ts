// api/src/kokuzo/search.ts
// Phase25: HYBRID candidates (deterministic, no LLM)

import { getDb, dbPrepare } from "../db/index.js";
import type { KokuzoChunk, KokuzoSeed } from "./indexer.js";
import { extractKotodamaTags, type KotodamaTag } from "../kotodama/tagger.js";
import { getPageText } from "./pages.js";
import { getCaps } from "./capsQueue.js";

/**
 * Phase31: snippet を正規化（\f 除去、空白圧縮、trim）
 */
function normalizeSnippet(s: string): string {
  return String(s || "")
    .replace(/\f/g, "")        // remove form feed
    .replace(/\s+/g, " ")      // collapse whitespace
    .trim();
}

/**
 * テーブルが存在するかチェック
 */
function tableExists(db: any, name: string): boolean {
  try {
    const row = db.prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
    ).get(name) as any;
    return !!row?.ok;
  } catch {
    return false;
  }
}

/**
 * snippet を生成（クエリマッチ位置を中心に）
 */
function mkSnippet(text: string, q: string, max = 160): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return t.slice(0, max);
  const start = Math.max(0, i - Math.floor(max / 3));
  return t.slice(start, start + max);
}

/**
 * LIKE 検索のスコア計算（クエリの出現回数）
 */
function scoreLike(text: string, q: string): number {
  if (!text || !q) return 0;
  const hay = text.toLowerCase();
  const needle = q.toLowerCase();
  let count = 0;
  let pos = 0;
  while (true) {
    const i = hay.indexOf(needle, pos);
    if (i < 0) break;
    count++;
    pos = i + needle.length;
    if (count >= 20) break;
  }
  return count;
}

export type KokuzoCandidate = {
  doc: string;
  pdfPage: number;
  snippet: string;
  score: number;
  tags: KotodamaTag[];
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
  try {
    const db = getDb("kokuzo");

    // ピン指定の解析（doc=... pdfPage=...）
    const pinMatch = query.match(/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i);
    if (pinMatch) {
      const pinDoc = pinMatch[1];
      const pinPdfPage = parseInt(pinMatch[2], 10);
      
      // 直SQLで取得
      const pinStmt = db.prepare(`SELECT doc, pdfPage, text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
      const pinRow = pinStmt.get(pinDoc, pinPdfPage) as { doc: string; pdfPage: number; text: string } | undefined;
      
      if (pinRow) {
        // 見つかったら candidates をその1件で返す（先頭固定）
        const fullText = String(pinRow.text || "");
        const tags = extractKotodamaTags(fullText);
        // snippet は text 先頭120文字（既存ルールに合わせる）
        const snippet = fullText.replace(/\f/g, '').slice(0, 120);
        
        return [{
          doc: pinDoc,
          pdfPage: pinPdfPage,
          snippet: snippet || "(pin) page indexed",
          score: 1000, // ピン指定は最高スコア
          tags,
        }];
      }
      // 見つからない場合のみ、従来検索へフォールバック
    }

    // クエリを正規化
    const normalizedQuery = normalizeHybridQuery(query);
    
    // fallback 用の doc を決定（docOrNull が null の場合は最多ページ数のdocを選ぶ）
    let targetDoc = docOrNull;
    if (!targetDoc) {
      try {
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
      } catch (e: any) {
        // kokuzo_pages が存在しない場合は安全なフォールバック
        const errMsg = String(e?.message || "");
        if (errMsg.includes("no such table: kokuzo_pages") || errMsg.includes("no such module: fts5")) {
          console.warn("[KOKUZO-SEARCH] kokuzo_pages not available, returning safe fallback:", errMsg);
          return getSafeFallbackCandidates(docOrNull, limit);
        }
        throw e; // その他のエラーは再スロー
      }
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
        const pageOne: KokuzoCandidate[] = [];
        const snippetStmt = db.prepare(`SELECT substr(replace(text, char(12), ''), 1, 120) AS snippet, text AS fullText FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
        
        // Phase28: まず p!=1 を limit 件まで詰める
        for (let p = minP; p <= maxP; p++) {
          const pageText = snippetStmt.get(targetDoc, p) as any;
          const fullText = String(pageText?.fullText || "");
          const tags = extractKotodamaTags(fullText);
          const candidate: KokuzoCandidate = {
            doc: targetDoc,
            pdfPage: p,
            snippet: String(pageText?.snippet || "(fallback) page indexed"),
            score: 10,
            tags,
          };
          
          if (p === 1) {
            pageOne.push(candidate); // P1 は保留
          } else {
            if (cand.length < limit) {
              cand.push(candidate); // P1以外は先に追加（limit件まで）
            }
          }
        }
        
        // 余りがある場合のみ p==1 を最後に追加（常に cand0 が p==1 にならないようにする）
        while (cand.length < limit && pageOne.length > 0) {
          cand.push(pageOne.shift()!);
        }
        
        return cand;
      }
    }
    return [];
  }

  // 1) FTS5検索（Phase27: 全文検索で精度と速度を向上）
  // FTS5 があれば FTS、なければ LIKE、それも無理ならフォールバック
  const ftsQuery = normalizedQuery.split(/\s+/).filter(Boolean).join(" ");
  let rows: any[] = [];
  
  // Prefer FTS if available
  const hasFts = tableExists(db, "kokuzo_pages_fts");
  if (hasFts) {
    try {
      if (docOrNull) {
        rows = db
          .prepare(
            `SELECT doc, pdfPage, substr(replace(text, char(12), ''), 1, 120) AS snippet, bm25(kokuzo_pages_fts) AS rank
             FROM kokuzo_pages_fts
             WHERE doc = ? AND kokuzo_pages_fts MATCH ?
             ORDER BY rank ASC
             LIMIT ?`
          )
          .all(docOrNull, ftsQuery, limit) as any[];
      } else {
        rows = db
          .prepare(
            `SELECT doc, pdfPage, substr(replace(text, char(12), ''), 1, 120) AS snippet, bm25(kokuzo_pages_fts) AS rank
             FROM kokuzo_pages_fts
             WHERE kokuzo_pages_fts MATCH ?
             ORDER BY rank ASC
             LIMIT ?`
          )
          .all(ftsQuery, limit) as any[];
      }
    } catch (e) {
      // FTS5 クエリエラの場合は LIKE へ
      console.warn("[KOKUZO-SEARCH] FTS5 query failed, falling back to LIKE:", e);
      rows = [];
    }
  }
  
  // Fallback: LIKE search on base table (always exists)
  if (rows.length === 0) {
    const hasPages = tableExists(db, "kokuzo_pages");
    if (hasPages) {
      try {
        const like = `%${normalizedQuery}%`;
        let likeRows: any[] = [];
        if (docOrNull) {
          likeRows = db
            .prepare(
              `SELECT doc, pdfPage, text
               FROM kokuzo_pages
               WHERE doc = ? AND text LIKE ?
               LIMIT 60`
            )
            .all(docOrNull, like) as any[];
        } else {
          likeRows = db
            .prepare(
              `SELECT doc, pdfPage, text
               FROM kokuzo_pages
               WHERE text LIKE ?
               LIMIT 60`
            )
            .all(like) as any[];
        }
        
        const ranked = likeRows
          .map((r: any) => {
            const text = String(r.text || "");
            const s = scoreLike(text, normalizedQuery);
            return {
              doc: String(r.doc),
              pdfPage: Number(r.pdfPage),
              snippet: mkSnippet(text, normalizedQuery),
              score: s,
            };
          })
          .filter((x: any) => x.score > 0)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, limit);
        
        if (ranked.length > 0) {
          rows = ranked.map((r: any) => ({
            doc: r.doc,
            pdfPage: r.pdfPage,
            snippet: r.snippet,
            rank: 100 - r.score, // bm25 と互換性を持たせる（小さいほど良い）
          }));
        }
      } catch (e) {
        console.warn("[KOKUZO-SEARCH] LIKE search failed, falling back:", e);
        rows = [];
      }
    }
  }

  // doc指定が絶対に効く：docOrNull がある場合は結果を doc で強制フィルタ（FTS/LIKE 両方の後）
  if (docOrNull && rows.length > 0) {
    rows = rows.filter((r: any) => String(r.doc) === docOrNull);
  }

  if (rows && rows.length) {
    // bm25() は小さいほど良いスコアなので、100 - rank で正規化（最大100点）
    // Phase28: ノイズ判定でランキング品質を改善（表紙/奥付を下げる）
    const NOISE_WORDS = ["全集", "監修", "校訂", "発行", "著作権", "目次", "序", "凡例", "奥付", "表紙"];
    const CONTENT_WORDS = ["法則", "云", "曰", "伝", "水", "火", "御", "御灵", "布斗麻邇", "五十"];
    
    // db.prepare を rows.map の外で用意（N+1でもlimit<=10なので許容）
    const pageTextStmt = db.prepare(`SELECT substr(text, 1, 500) AS pageText FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
    
    const scored = rows.map((r: any) => {
      const baseScore = Math.max(0, 100 - (Number(r.rank) || 0));
      const doc = String(r.doc);
      const pdfPage = Number(r.pdfPage);
      
      // ノイズ判定・本文語判定の対象文字列を page text の先頭500文字にする
      let textForAnalysis = String(r.snippet || "").toLowerCase();
      let pageText500 = "";
      try {
        const pageTextRow = pageTextStmt.get(doc, pdfPage) as any;
        if (pageTextRow?.pageText) {
          pageText500 = String(pageTextRow.pageText);
          textForAnalysis = pageText500.toLowerCase();
        }
      } catch (e) {
        // 取得できない場合は snippet を使う（既に設定済み）
        pageText500 = String(r.snippet || "");
      }
      
      // Phase31: pageText500 を正規化
      const pageText500n = normalizeSnippet(pageText500);
      
      // Phase31: 空ページペナルティ（\f や実質空を除外）
      let penalty = 0;
      const trimmedLength = pageText500n.length;
      if (trimmedLength < 20) {
        penalty += 120; // 空ページを大幅減点（実質除外）
      }
      
      // ノイズ語ペナルティ
      for (const noise of NOISE_WORDS) {
        if (textForAnalysis.includes(noise.toLowerCase())) {
          penalty += 30; // ノイズ語が見つかったら大幅減点
        }
      }
      
      // 本文語ボーナス
      let bonus = 0;
      for (const content of CONTENT_WORDS) {
        if (textForAnalysis.includes(content.toLowerCase())) {
          bonus += 10; // 本文語が見つかったら加点
        }
      }
      
      // pdfPage が 1 の場合は大幅ペナルティ（表紙を必ず落とす）
      if (pdfPage === 1) {
        penalty += 300; // 表紙を必ず下げる（同点・僅差で表紙が勝つ余地を潰す）
      }

      const t = pageText500;
      if (t.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
        penalty += 5000; // 強制除外に近づける
      }
      const hasJa = /[ぁ-んァ-ン一-龯]/.test(t);
      if (!hasJa) penalty += 1000; // 日本語が無い
      if ((t.match(/[^\x20-\x7Eぁ-んァ-ン一-龯]/g) || []).length > 40) {
        penalty += 2000; // 制御文字だらけ
      }
      
      const finalScore = Math.max(0, baseScore + bonus - penalty);
      
      // ゴミ候補を候補配列に残さない（penalty が一定以上なら除外）
      if (penalty >= 2000) {
        return { doc, pdfPage, snippet: "", score: -1, tags: [], _penalty: penalty };
      }
      
      // Phase31: snippet を正規化（空なら pageText500n から生成）
      let sn = normalizeSnippet(r.snippet || "");
      if (!sn) {
        sn = pageText500n.slice(0, 200); // 120でもOK。Phase31的には"空/\fでない"ことが大事
      }
      if (!sn) {
        sn = "(本文抽出不可)"; // それでも空なら固定文（捏造ではなく"抽出不可"の明示）
      }
      
      // 言霊秘書タグを抽出（pageText500 から）
      const tags = extractKotodamaTags(pageText500);
      
      return {
        doc,
        pdfPage,
        snippet: sn,
        score: finalScore,
        tags: tags.length > 0 ? tags : [],
        _penalty: penalty,
      };
    });
    
    // penalty >= 2000 のゴミ候補を除外してからソート
    const filtered: KokuzoCandidate[] = scored
      .filter((r: any) => (r._penalty ?? 0) < 2000)
      .map(({ doc, pdfPage, snippet, score, tags }: any) => ({ doc, pdfPage, snippet, score, tags }));
    
    // score DESC でソート、同点なら P1 を後ろに送る tie-break
    filtered.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // score DESC
      }
      // 同点の場合：P1 を後ろに送る
      if (a.pdfPage === 1 && b.pdfPage !== 1) return 1;
      if (a.pdfPage !== 1 && b.pdfPage === 1) return -1;
      // どちらも P1 またはどちらも P1 以外：pdfPage ASC で安定ソート
      return a.pdfPage - b.pdfPage;
    });
    
    // Phase28: 最終整列（cand0 が pdfPage=1 かつ snippet に (全集|監修|校訂) を含む形を絶対に作らない）
    const isBadCover = (c: KokuzoCandidate) => {
      return c.pdfPage === 1 && /(全集|監修|校訂)/.test(String(c.snippet || ""));
    };
    const good: KokuzoCandidate[] = filtered.filter(c => !isBadCover(c));
    const bad: KokuzoCandidate[] = filtered.filter(c => isBadCover(c));
    let final: KokuzoCandidate[] = good.concat(bad).slice(0, limit);
    
    // Phase28: final[0] が bad cover の場合、補完候補を追加して cand0 を回避
    if (final.length > 0 && isBadCover(final[0])) {
      const targetDoc = final[0].doc;
      const existingKeys = new Set(final.map(c => `${c.doc}:${c.pdfPage}`));
      
      // 同一docの pdfPage!=1 から補完候補を取得
      const complementStmt = db.prepare(`
        SELECT pdfPage, substr(replace(text, char(12), ''), 1, 120) AS snippet
        FROM kokuzo_pages
        WHERE doc = ? AND pdfPage != 1
        ORDER BY pdfPage ASC
        LIMIT 50
      `);
      const complementRows = complementStmt.all(targetDoc) as any[];
      
      const complement: KokuzoCandidate[] = [];
      const fullTextStmt = db.prepare(`SELECT text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
      for (const row of complementRows) {
        const key = `${targetDoc}:${row.pdfPage}`;
        if (!existingKeys.has(key)) {
          const fullTextRow = fullTextStmt.get(targetDoc, Number(row.pdfPage)) as any;
          const fullText = String(fullTextRow?.text || "");
          const tags = extractKotodamaTags(fullText);
          complement.push({
            doc: targetDoc,
            pdfPage: Number(row.pdfPage),
            snippet: String(row.snippet || "(complement) page indexed"),
            score: 5, // 補完候補は低スコア
            tags,
          });
          existingKeys.add(key);
          if (complement.length >= limit) break;
        }
      }
      
      // good + complement を先に、bad を後に
      final = [...good, ...complement, ...bad].slice(0, limit) as KokuzoCandidate[];
    }
  // --- S3_7_SNIPPET_BACKFILL_V1 ---
  // snippet が空/弱い場合に、doc/pdfPage から本文先頭を決定論で補完する（LLM禁止）
  for (const c of final) {
    const sn = String((c as any)?.snippet ?? "").trim();
    if (sn.length >= 40) continue;
    const doc = String((c as any)?.doc ?? "");
    const pdfPage = Number((c as any)?.pdfPage ?? 0);
    if (!doc || !pdfPage) continue;
    const full = getPageText(doc, pdfPage);
    const head = String(full || "").replace(/\f/g, "").trim().slice(0, 200);
    if (head.length >= 40) (c as any).snippet = head;

    // --- S3_8_CAPS_BACKFILL_V1 ---
    // 本文が空の場合は caps（補完キャプション）から決定論で補完
    if (head.length < 40) {
      const caps: any = getCaps(doc, pdfPage);
      const capText = String(
        caps?.text ?? caps?.caption ?? caps?.cap ?? caps?.snippet ?? ""
      ).replace(/\f/g, "").trim().slice(0, 200);
      if (capText.length >= 40) (c as any).snippet = capText;
    }
    // --- /S3_8_CAPS_BACKFILL_V1 ---
  }
  // --- /S3_7_SNIPPET_BACKFILL_V1 ---

    
  // --- S3_10_CANDIDATE_OBSERVE_V1 ---
  try {
    const top3 = (final || []).slice(0, 3).map((c: any) => ({
      doc: c?.doc,
      pdfPage: c?.pdfPage,
      snipLen: String(c?.snippet ?? "").trim().length,
      snipHead: String(c?.snippet ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    }));
    console.log("[S3-10] candidates top3:", JSON.stringify(top3));
  } catch {}
  // --- /S3_10_CANDIDATE_OBSERVE_V1 ---
    return final;
  }

  // 2) フォールバック：FTS検索が0件の場合も fallback を返す（導線成立が目的）
  // Phase28: pdfPage=1 を末尾に送る（表紙を下げる）
  // Phase25: 空・例外でも必ず候補を返す（candidates: [] で落ちないようにする）
  if (targetDoc) {
    try {
      const range = db
        .prepare(`SELECT MIN(pdfPage) AS minP, MAX(pdfPage) AS maxP FROM kokuzo_pages WHERE doc = ?`)
        .get(targetDoc) as any;

      const minP = Number(range?.minP ?? 0);
      const maxP = Number(range?.maxP ?? 0);

      if (minP && maxP && maxP >= minP) {
        const cand: KokuzoCandidate[] = [];
        const pageOne: KokuzoCandidate[] = [];
        const snippetStmt = db.prepare(`SELECT substr(replace(text, char(12), ''), 1, 120) AS snippet, text AS fullText FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
        
        // Phase28: まず p!=1 を limit 件まで詰める
        for (let p = minP; p <= maxP; p++) {
          try {
            const pageText = snippetStmt.get(targetDoc, p) as any;
            const fullText = String(pageText?.fullText || "");
            const tags = extractKotodamaTags(fullText);
            const candidate: KokuzoCandidate = {
              doc: targetDoc,
              pdfPage: p,
              snippet: String(pageText?.snippet || "(fallback) page indexed"),
              score: 10,
              tags,
            };
            
            if (p === 1) {
              pageOne.push(candidate); // P1 は保留
            } else {
              if (cand.length < limit) {
                cand.push(candidate); // P1以外は先に追加（limit件まで）
              }
            }
          } catch (e) {
            // 個別ページ取得エラーは無視して続行
            continue;
          }
        }
        
        // 余りがある場合のみ p==1 を最後に追加（常に cand0 が p==1 にならないようにする）
        while (cand.length < limit && pageOne.length > 0) {
          cand.push(pageOne.shift()!);
        }
        
        // Phase25: 候補が1件以上あれば返す
        if (cand.length > 0) {
          return cand;
        }
      }
    } catch (e) {
      // フォールバック取得エラーは無視して最終フォールバックへ
      console.warn("[KOKUZO-SEARCH] fallback range query failed, using safe fallback:", e);
    }
  }

  // Phase25: 最終フォールバック（空・例外でも必ず候補を返す）
  return getSafeFallbackCandidates(docOrNull, limit);
  } catch (e: any) {
    // 関数全体のエラーハンドリング（DB未整備でもプロセスを落とさない）
    const errMsg = String(e?.message || "");
    if (errMsg.includes("no such table: kokuzo_pages") || errMsg.includes("no such module: fts5")) {
      console.warn("[KOKUZO-SEARCH] kokuzo_pages/FTS5 not available, returning safe fallback:", errMsg);
      return getSafeFallbackCandidates(docOrNull, limit);
    }
    // その他の予期しないエラーも安全に処理
    console.error("[KOKUZO-SEARCH] unexpected error, returning safe fallback:", e);
    return getSafeFallbackCandidates(docOrNull, limit);
  }
}

/**
 * 安全なフォールバック候補を返す（DB未整備時でもプロセスを落とさない）
 */
function getSafeFallbackCandidates(docOrNull: string | null, limit: number): KokuzoCandidate[] {
  const doc = docOrNull || "言霊秘書.pdf";
  const candidates: KokuzoCandidate[] = [];
  // P1 を避けて 2-11 を返す（limit が 10 なら 2-11 で 10件）
  try {
    const db = getDb("kokuzo");
    const fullTextStmt = db.prepare(`SELECT text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
    for (let p = 2; p <= Math.min(11, limit + 1); p++) {
      const fullTextRow = fullTextStmt.get(doc, p) as any;
      const fullText = String(fullTextRow?.text || "");
      const tags = extractKotodamaTags(fullText);
      candidates.push({
        doc,
        pdfPage: p,
        snippet: "(fallback) page indexed",
        score: 10,
        tags: tags.length > 0 ? tags : [],
      });
    }
  } catch {
    // DB が利用できない場合は tags を空配列で返す
    for (let p = 2; p <= Math.min(11, limit + 1); p++) {
      candidates.push({
        doc,
        pdfPage: p,
        snippet: "(fallback) page indexed",
        score: 10,
        tags: [],
      });
    }
  }

  // C3-1_CANDIDATES_QUALITY_FILTER_V2: filter garbage snippets BEFORE returning candidates (fallback keeps originals)
  const isGarbageSnippet = (snip: string): boolean => {
    const t = String(snip ?? "");
    if (!t) return true;
    // keep same philosophy as chat.ts: NON_TEXT/OCR fail markers are garbage
    if (/\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(t)) return true;
    const bad = (t.match(/[�\u0000-\u001F]/g) || []).length;
    if (bad >= 3) return true;
    const hasJP = /[ぁ-んァ-ン一-龯]/.test(t);
    if (!hasJP && t.length < 60) return true;
    return false;
  };

  const rawCandidates = Array.isArray(candidates) ? candidates : [];
  const cleaned = rawCandidates.filter((c: any) => !isGarbageSnippet(String((c as any)?.snippet ?? "")));
  const finalCandidates = cleaned.length ? cleaned : rawCandidates;
  return finalCandidates;

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
