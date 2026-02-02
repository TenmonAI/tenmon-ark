// api/src/routes/ingest.ts
// Phase44: PDF ingest with confirmation

import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { getTenmonDataDir, getDb, dbPrepare } from "../db/index.js";
import { upsertPage } from "../kokuzo/pages.js";

const router = Router();

// Ingest request storage (JSON file, minimal diff)
const INGEST_REQUESTS_FILE = path.join(getTenmonDataDir(), "db", "ingest_requests.json");

interface IngestRequest {
  ingestId: string;
  threadId: string;
  savedPath: string;
  doc: string;
  createdAt: string;
}

function loadIngestRequests(): IngestRequest[] {
  const dbDir = path.dirname(INGEST_REQUESTS_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(INGEST_REQUESTS_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(INGEST_REQUESTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function saveIngestRequest(req: IngestRequest): void {
  const requests = loadIngestRequests();
  requests.push(req);
  fs.writeFileSync(INGEST_REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

function findIngestRequest(ingestId: string): IngestRequest | null {
  const requests = loadIngestRequests();
  return requests.find((r) => r.ingestId === ingestId) || null;
}

function removeIngestRequest(ingestId: string): void {
  const requests = loadIngestRequests();
  const filtered = requests.filter((r) => r.ingestId !== ingestId);
  fs.writeFileSync(INGEST_REQUESTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
}

/**
 * Sanitize doc name (only [A-Z0-9._-] allowed)
 */
function sanitizeDocName(doc: string): string {
  return doc.replace(/[^A-Z0-9._-]/gi, "_").toUpperCase();
}

/**
 * POST /api/ingest/request
 * Request PDF ingestion (with confirmation)
 * 
 * Body: { threadId: string, savedPath: string, doc: string }
 * Response: { ok: true, ingestId: string, confirmText: string }
 */
router.post("/ingest/request", (req: Request, res: Response) => {
  try {
    const { threadId, savedPath, doc } = req.body;

    // バリデーション
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ ok: false, error: "threadId is required and must be a string" });
    }
    if (!savedPath || typeof savedPath !== "string") {
      return res.status(400).json({ ok: false, error: "savedPath is required and must be a string" });
    }
    if (!doc || typeof doc !== "string" || doc.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "doc is required and must be a non-empty string" });
    }

    // savedPath は uploads/配下のみ許可（ディレクトリトラバーサル禁止）
    if (!savedPath.startsWith("uploads/")) {
      return res.status(400).json({ ok: false, error: "savedPath must start with 'uploads/'" });
    }

    // doc 名を正規化
    const sanitizedDoc = sanitizeDocName(doc);

    // 実ファイルの存在を確認
    const dataDir = getTenmonDataDir();
    const filePath = path.join(dataDir, savedPath);
    
    // パストラバーサル防止（savedPath をそのまま join しない）
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(path.join(dataDir, "uploads")))) {
      return res.status(400).json({ ok: false, error: "Invalid savedPath (directory traversal detected)" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: `File not found: ${savedPath}` });
    }

    // ingestId を生成
    const ingestId = randomBytes(16).toString("hex");

    // リクエストを保存
    const request: IngestRequest = {
      ingestId,
      threadId,
      savedPath,
      doc: sanitizedDoc,
      createdAt: new Date().toISOString(),
    };
    saveIngestRequest(request);

    // confirmText を生成
    const confirmText = `以下のPDFを取り込みますか？\n- ファイル: ${savedPath}\n- ドキュメント名: ${sanitizedDoc}\n- スレッドID: ${threadId}`;

    return res.json({
      ok: true,
      ingestId,
      confirmText,
    });
  } catch (error) {
    console.error("[INGEST-REQUEST] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ingest/confirm
 * Confirm and execute PDF ingestion
 * 
 * Body: { ingestId: string, confirm: boolean }
 * Response: { ok: true, doc: string, pagesInserted: number, emptyPages: number }
 */
router.post("/ingest/confirm", (req: Request, res: Response) => {
  try {
    const { ingestId, confirm } = req.body;

    // バリデーション
    if (!ingestId || typeof ingestId !== "string") {
      return res.status(400).json({ ok: false, error: "ingestId is required and must be a string" });
    }
    if (confirm !== true) {
      return res.status(400).json({ ok: false, error: "confirm must be true" });
    }

    // リクエストを取得
    const request = findIngestRequest(ingestId);
    if (!request) {
      return res.status(404).json({ ok: false, error: "Ingest request not found" });
    }

    // ファイルパスを取得
    const dataDir = getTenmonDataDir();
    const filePath = path.join(dataDir, request.savedPath);
    
    // パストラバーサル防止（再確認）
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(path.join(dataDir, "uploads")))) {
      return res.status(400).json({ ok: false, error: "Invalid savedPath (directory traversal detected)" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: `File not found: ${request.savedPath}` });
    }

    // PDF のページ数を取得（pdftotext で確認）
    let totalPages = 0;
    try {
      const pageCountOutput = execSync(`pdftotext "${filePath}" - 2>/dev/null | head -1 || echo ""`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      // pdftk や pdfinfo が使える場合はそれを使うが、ここでは簡易的に全ページを試行
      // 実際には、pdftotext で各ページを試行して存在するページをカウント
      // 簡易実装: 最大1000ページまで試行（実用上は十分）
      for (let p = 1; p <= 1000; p++) {
        try {
          const testOutput = execSync(
            `timeout 5s pdftotext -f ${p} -l ${p} "${filePath}" - 2>/dev/null || echo ""`,
            { encoding: "utf-8", maxBuffer: 1024 * 1024 }
          );
          if (testOutput.trim().length > 0) {
            totalPages = p;
          } else {
            break; // 空ページが続いたら終了
          }
        } catch {
          break; // エラーが発生したら終了
        }
      }
    } catch (e) {
      console.warn("[INGEST-CONFIRM] Failed to detect page count, assuming 1 page:", e);
      totalPages = 1;
    }

    if (totalPages === 0) {
      return res.status(400).json({ ok: false, error: "PDF has no extractable pages" });
    }

    // 各ページを抽出して kokuzo_pages に投入
    let pagesInserted = 0;
    let emptyPages = 0;

    for (let pdfPage = 1; pdfPage <= totalPages; pdfPage++) {
      try {
        // pdftotext でページを抽出
        const textOutput = execSync(
          `timeout 30s pdftotext -f ${pdfPage} -l ${pdfPage} "${filePath}" - 2>/dev/null || echo ""`,
          { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
        );

        let text = textOutput.trim();
        
        // 空ページの場合は [NON_TEXT_PAGE_OR_OCR_FAILED] を入れて空ページゼロ化
        if (!text || text.length === 0) {
          text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
          emptyPages++;
        }

        // SHA を生成
        const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);

        // kokuzo_pages に UPSERT
        upsertPage(request.doc, pdfPage, text, sha);
        pagesInserted++;
      } catch (e) {
        console.warn(`[INGEST-CONFIRM] Failed to extract page ${pdfPage}:`, e);
        // エラーが発生したページも [NON_TEXT_PAGE_OR_OCR_FAILED] として投入
        const sha = createHash("sha256").update("[NON_TEXT_PAGE_OR_OCR_FAILED]").digest("hex").substring(0, 16);
        upsertPage(request.doc, pdfPage, "[NON_TEXT_PAGE_OR_OCR_FAILED]", sha);
        pagesInserted++;
        emptyPages++;
      }
    }

    // FTS rebuild（最後に1回だけ）
    try {
      const db = getDb("kokuzo");
      // FTS5 を再構築（doc 単位で削除して再挿入）
      const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages_fts WHERE doc = ?");
      deleteStmt.run(request.doc);
      
      const insertStmt = dbPrepare(
        "kokuzo",
        "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc = ?"
      );
      insertStmt.run(request.doc);
    } catch (e) {
      console.warn("[INGEST-CONFIRM] Failed to rebuild FTS index:", e);
    }

    // リクエストを削除
    removeIngestRequest(ingestId);

    return res.json({
      ok: true,
      doc: request.doc,
      pagesInserted,
      emptyPages,
    });
  } catch (error) {
    console.error("[INGEST-CONFIRM] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
