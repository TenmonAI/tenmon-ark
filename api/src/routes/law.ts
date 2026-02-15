// api/src/routes/law.ts
// Phase40/41: LawEntry storage and recall

import { Router, type Request, type Response } from "express";
import { getDb, dbPrepare } from "../db/index.js";
import { getPageText } from "../kokuzo/pages.js";
import { extractKotodamaTags } from "../kotodama/tagger.js";

const router = Router();

/**
 * POST /api/law/commit
 * 会話で確定した学習（LawEntry）を保存
 * 
 * Body: { doc: string, pdfPage: number, threadId: string }
 * レスポンス: { ok: true, id: number } または 4xx
 */
router.post("/law/commit", (req: Request, res: Response) => {
  try {
    const { doc, pdfPage, threadId, name, definition, evidenceIds } = req.body;
    // LAW_COMMIT_EXT_V1
    
    // バリデーション
    if (!doc || typeof doc !== "string") {
      return res.status(400).json({ ok: false, error: "doc is required and must be a string" });
    }
    if (typeof pdfPage !== "number" || pdfPage < 1) {
      return res.status(400).json({ ok: false, error: "pdfPage is required and must be a positive integer" });
    }
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ ok: false, error: "threadId is required and must be a string" });
    }
    
    
    // LAW_COMMIT_EXT_V1: optional fields validation
    if (name != null && typeof name !== "string") {
      return res.status(400).json({ ok: false, error: "name must be a string" });
    }
    if (definition != null && typeof definition !== "string") {
      return res.status(400).json({ ok: false, error: "definition must be a string" });
    }
    if (evidenceIds != null && !Array.isArray(evidenceIds)) {
      return res.status(400).json({ ok: false, error: "evidenceIds must be an array of strings" });
    }

    // kokuzo_pages から直取得（捏造ゼロ）
    const pageText = getPageText(doc, pdfPage);
    if (!pageText) {
      return res.status(404).json({ ok: false, error: `Page not found: ${doc} P${pdfPage}` });
    }
    
    // extractKotodamaTags で tags を確定
    const tags = extractKotodamaTags(pageText);
    
    // quote/snippet を生成（text 先頭120文字、\f 除去）
    const quote = pageText.replace(/\f/g, '').slice(0, 120);
    
    // 保存
    const db = getDb("kokuzo");
    const stmt = dbPrepare(
      "kokuzo",
      "INSERT INTO kokuzo_laws (threadId, doc, pdfPage, quote, tags, name, definition, evidenceIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      threadId,
      doc,
      pdfPage,
      quote,
      JSON.stringify(tags),
      (name ?? null),
      (definition ?? null),
      (evidenceIds ? JSON.stringify(evidenceIds) : null)
    );
    
    const id = (result as any).lastInsertRowid;
    if (!id) {
      return res.status(500).json({ ok: false, error: "Failed to insert law entry" });
    }
    
    return res.json({ ok: true, id });
  } catch (error) {
    console.error("[LAW-COMMIT] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/law/list?threadId=...
 * 会話スレッドの学習（LawEntry）一覧を取得
 * 
 * レスポンス: { laws: LawEntry[] }
 */
router.get("/law/list", (req: Request, res: Response) => {
  try {
    const threadId = req.query.threadId as string;
    
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ ok: false, error: "threadId is required" });
    }
    
    const db = getDb("kokuzo");
    const stmt = dbPrepare(
      "kokuzo",
      "SELECT id, threadId, doc, pdfPage, quote, tags, name, definition, evidenceIds, createdAt FROM kokuzo_laws WHERE threadId = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(threadId) as Array<{
      id: number;
      threadId: string;
      doc: string;
      pdfPage: number;
      quote: string;
      tags: string; // JSON string
      createdAt: string;
    }>;
    
    const laws = rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      doc: row.doc,
      pdfPage: row.pdfPage,
      quote: row.quote,
      tags: JSON.parse(row.tags) as string[],
      name: (row as any).name ?? null,
      definition: (row as any).definition ?? null,
      evidenceIds: (row as any).evidenceIds ? JSON.parse((row as any).evidenceIds) : [],
      createdAt: row.createdAt,
    }));
    
    return res.json({ ok: true, laws });
  } catch (error) {
    console.error("[LAW-LIST] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
