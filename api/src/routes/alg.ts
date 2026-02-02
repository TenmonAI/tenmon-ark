// api/src/routes/alg.ts
// Phase43: Algorithm storage and recall

import { Router, type Request, type Response } from "express";
import { getDb, dbPrepare } from "../db/index.js";
import { getPageText } from "../kokuzo/pages.js";

const router = Router();

interface Step {
  text: string;
  doc?: string;
  pdfPage?: number;
  tags?: string[];
}

/**
 * POST /api/alg/commit
 * アルゴリズム（手順/法則の連鎖）を保存
 * 
 * Body: { threadId: string, title: string, steps: Step[], summary?: string }
 * Step: { text: string, doc?: string, pdfPage?: number, tags?: string[] }
 * レスポンス: { ok: true, id: number } または 4xx
 */
router.post("/alg/commit", (req: Request, res: Response) => {
  try {
    const { threadId, title, steps, summary } = req.body;
    
    // バリデーション
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ ok: false, error: "threadId is required and must be a string" });
    }
    if (!title || typeof title !== "string") {
      return res.status(400).json({ ok: false, error: "title is required and must be a string" });
    }
    if (!Array.isArray(steps) || steps.length < 1) {
      return res.status(400).json({ ok: false, error: "steps is required and must be an array with at least one element" });
    }
    
    // steps の各要素を検証
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== "object") {
        return res.status(400).json({ ok: false, error: `steps[${i}] must be an object` });
      }
      if (!step.text || typeof step.text !== "string" || step.text.trim().length === 0) {
        return res.status(400).json({ ok: false, error: `steps[${i}].text is required and must be a non-empty string` });
      }
      
      // doc/pdfPage がある場合は kokuzo_pages に存在することを検証（捏造ゼロ）
      if (step.doc && step.pdfPage !== undefined) {
        const pageText = getPageText(step.doc, step.pdfPage);
        if (!pageText) {
          return res.status(404).json({ ok: false, error: `Page not found: ${step.doc} P${step.pdfPage} (steps[${i}])` });
        }
      }
    }
    
    // 保存
    const db = getDb("kokuzo");
    const stmt = dbPrepare(
      "kokuzo",
      "INSERT INTO kokuzo_algorithms (threadId, title, steps, summary) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(threadId, title, JSON.stringify(steps), summary || "");
    
    const id = (result as any).lastInsertRowid;
    if (!id) {
      return res.status(500).json({ ok: false, error: "Failed to insert algorithm" });
    }
    
    return res.json({ ok: true, id });
  } catch (error) {
    console.error("[ALG-COMMIT] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/alg/list?threadId=...
 * アルゴリズム一覧を取得
 * 
 * レスポンス: { ok: true, algorithms: Algorithm[] }
 */
router.get("/alg/list", (req: Request, res: Response) => {
  try {
    const threadId = req.query.threadId as string;
    
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ ok: false, error: "threadId is required" });
    }
    
    const db = getDb("kokuzo");
    const stmt = dbPrepare(
      "kokuzo",
      "SELECT id, threadId, title, steps, summary, createdAt FROM kokuzo_algorithms WHERE threadId = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(threadId) as Array<{
      id: number;
      threadId: string;
      title: string;
      steps: string; // JSON string
      summary: string;
      createdAt: string;
    }>;
    
    const algorithms = rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      title: row.title,
      steps: JSON.parse(row.steps) as Step[],
      summary: row.summary,
      createdAt: row.createdAt,
    }));
    
    return res.json({ ok: true, algorithms });
  } catch (error) {
    console.error("[ALG-LIST] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
