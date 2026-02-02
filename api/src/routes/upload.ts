// api/src/routes/upload.ts
// Phase42: File upload endpoint (VPS storage)

import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getTenmonDataDir } from "../db/index.js";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

/**
 * Sanitize filename (directory traversal prevention)
 * - path.basename でディレクトリ部分を除去
 * - [a-zA-Z0-9._-] 以外は _ に置換
 */
function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * POST /api/upload
 * Accept file upload and save to TENMON_DATA_DIR/uploads/
 * 
 * Response: { ok: true, fileName, savedPath, size, sha256 }
 */
router.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const file = req.file;
    
    // サイズチェック（multer の limits で既にチェック済みだが、念のため）
    if (file.size > 200 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: "File size exceeds 200MB limit" });
    }

    // ファイル名を安全化
    const safeName = sanitizeFilename(file.originalname || "uploaded_file");
    
    // 保存先ディレクトリを取得・作成
    const dataDir = getTenmonDataDir();
    const uploadsDir = path.join(dataDir, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 保存パス
    const savedPath = path.join(uploadsDir, safeName);
    
    // SHA256 を計算
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    
    // ファイルを保存（同期でOK）
    fs.writeFileSync(savedPath, file.buffer);
    
    // 応答（savedPath は実パスを返さず、uploads/<safeName> で返す）
    return res.json({
      ok: true,
      fileName: safeName,
      savedPath: `uploads/${safeName}`,
      size: file.size,
      sha256,
    });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
});

export default router;
