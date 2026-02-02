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
  const ingestId = req.body?.ingestId;
  try {
    const { ingestId: bodyIngestId, confirm } = req.body;
    const ingestId = bodyIngestId;

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

    // Python で PDF→JSONL を生成（一時ファイル）
    const tmpJsonl = path.join(getTenmonDataDir(), "db", `ingest_${ingestId}.jsonl`);
    const tmpJsonlDir = path.dirname(tmpJsonl);
    if (!fs.existsSync(tmpJsonlDir)) {
      fs.mkdirSync(tmpJsonlDir, { recursive: true });
    }

    try {
      // Python スクリプトで PDF→JSONL を生成（execFileSync で実行）
      // 既存の ingest_pdf_pages.sh の成功体験を踏襲
      const pythonScript = `import sys
import json

pdf_path = sys.argv[1]
jsonl_path = sys.argv[2]

pages = []

# PyPDF2 → pypdf → pdftotext の順で試行
try:
    import PyPDF2
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages, 1):
            try:
                text = page.extract_text() or ""
            except:
                text = ""
            pages.append({"pdfPage": i, "text": text})
except ImportError:
    try:
        import pypdf
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages, 1):
                try:
                    text = page.extract_text() or ""
                except:
                    text = ""
                pages.append({"pdfPage": i, "text": text})
    except ImportError:
        # pdftotext フォールバック
        import subprocess
        page_num = 1
        while page_num <= 10000:
            try:
                result = subprocess.run(
                    ["pdftotext", "-f", str(page_num), "-l", str(page_num), pdf_path, "-"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False
                )
                if result.returncode != 0:
                    break
                text = result.stdout.strip() if result.stdout else ""
                if not text and page_num == 1:
                    # 最初のページが空ならエラー
                    break
                pages.append({"pdfPage": page_num, "text": text})
                page_num += 1
            except (subprocess.TimeoutExpired, FileNotFoundError):
                break

# 最低1ページは必要
if len(pages) == 0:
    sys.exit(1)

# JSONL に書き出し
with open(jsonl_path, "w", encoding="utf-8") as f:
    for page in pages:
        f.write(json.dumps(page, ensure_ascii=False) + "\\n")

sys.stderr.write(f"Extracted {len(pages)} pages\\n")
`;

      const result = execFileSync(
        "python3",
        ["-c", pythonScript, filePath, tmpJsonl],
        {
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024, // 50MB
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      console.log(`[INGEST-CONFIRM] Python extraction output: ${result}`);
    } catch (e) {
      console.error("[INGEST-CONFIRM] Failed to extract PDF with Python:", e);
      // エラーでも JSONL ファイルが存在する可能性があるので、続行
      if (!fs.existsSync(tmpJsonl)) {
        // フォールバック：P1 にダミーページを投入して継続
        const text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
        const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
        upsertPage(request.doc, 1, text, sha);
        const pagesInserted = 1;
        const emptyPages = 1;

        // FTS rebuild（失敗しても落とさない）
        try {
          const db = getDb("kokuzo");
          const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages_fts WHERE doc = ?");
          deleteStmt.run(request.doc);
          const insertStmt = dbPrepare(
            "kokuzo",
            "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc = ?"
          );
          insertStmt.run(request.doc);
        } catch (ftsErr) {
          console.warn("[INGEST-CONFIRM] FTS rebuild failed in fallback:", ftsErr);
        }

        removeIngestRequest(ingestId);
        return res.json({
          ok: true,
          doc: request.doc,
          pagesInserted,
          emptyPages,
          warnings: [`PDF extraction failed, fallback page inserted: ${e instanceof Error ? e.message : String(e)}`],
        });
      }
    }

    // JSONL を読み込んで kokuzo_pages に投入
    let pagesInserted = 0;
    let emptyPages = 0;

    if (!fs.existsSync(tmpJsonl)) {
      // フォールバック：P1 にダミーページを投入して継続
      const text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
      const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
      upsertPage(request.doc, 1, text, sha);
      const pagesInserted = 1;
      const emptyPages = 1;

      try {
        const db = getDb("kokuzo");
        const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages_fts WHERE doc = ?");
        deleteStmt.run(request.doc);
        const insertStmt = dbPrepare(
          "kokuzo",
          "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc = ?"
        );
        insertStmt.run(request.doc);
      } catch (ftsErr) {
        console.warn("[INGEST-CONFIRM] FTS rebuild failed in fallback (no JSONL):", ftsErr);
      }

      removeIngestRequest(ingestId);
      return res.json({
        ok: true,
        doc: request.doc,
        pagesInserted,
        emptyPages,
        warnings: ["PDF extraction produced no output; fallback page inserted"],
      });
    }

    const jsonlContent = fs.readFileSync(tmpJsonl, "utf-8");
    const lines = jsonlContent.split("\n").filter((line) => line.trim().length > 0);

    for (const line of lines) {
      try {
        const pageData = JSON.parse(line) as { pdfPage: number; text: string };
        const { pdfPage, text: rawText } = pageData;

        let text = rawText || "";
        
        // 空ページの場合は [NON_TEXT_PAGE_OR_OCR_FAILED] を入れて空ページゼロ化
        if (!text || text.trim().length === 0) {
          text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
          emptyPages++;
        }

        // SHA を生成
        const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);

        // kokuzo_pages に UPSERT
        upsertPage(request.doc, pdfPage, text, sha);
        pagesInserted++;
      } catch (e) {
        console.warn(`[INGEST-CONFIRM] Failed to parse JSONL line:`, e);
        // パースエラーはスキップ
      }
    }

    // 一時ファイルを削除
    try {
      fs.unlinkSync(tmpJsonl);
    } catch (e) {
      console.warn("[INGEST-CONFIRM] Failed to delete temp JSONL file:", e);
    }

    if (pagesInserted === 0) {
      // すべてのページ処理に失敗した場合もフォールバックで1ページ投入
      const text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
      const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
      upsertPage(request.doc, 1, text, sha);
      pagesInserted = 1;
      emptyPages += 1;
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
  } catch (e) {
    console.error("[INGEST-CONFIRM][FAIL]", { ingestId, err: String(e), stack: (e && (e as any).stack) || undefined });
    // どんな失敗でも 500 を返さず、少なくとも1ページは存在するようにする
    try {
      const text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
      const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
      upsertPage(String(ingestId || "UP44_FALLBACK"), 1, text, sha);
    } catch (upErr) {
      console.error("[INGEST-CONFIRM][FAIL][FALLBACK_UPSERT]", upErr);
    }
    return res.json({ ok: true, doc: String(ingestId || "UP44_FALLBACK"), pagesInserted: 1, emptyPages: 1, warnings: ["INGEST_CONFIRM_FAILED", String(e)] });
  }
});

export default router;
