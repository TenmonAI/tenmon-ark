import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import {
  listKnowledgeFiles,
  insertKnowledgeFile,
  deleteKnowledgeFile,
} from "../db/knowledge.js";

const router: IRouter = Router();

// ストレージディレクトリ
const STORAGE_DIR = path.resolve(process.cwd(), "storage", "knowledge");

// 環境変数から制限値を取得（デフォルト値あり）
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 100;
const MAX_FILES = Number(process.env.MAX_FILES) || 1000;
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024; // バイト単位

// multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ストレージディレクトリを確保
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // UUID + 元の拡張子で保存
    const ext = path.extname(file.originalname);
    const storedName = `${randomUUID()}${ext}`;
    cb(null, storedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    // テキストファイルのみ許可（Phase1）
    const allowedMimes = [
      "text/plain",
      "text/markdown",
      "application/json",
      "text/x-markdown",
    ];
    const allowedExts = [".txt", ".md", ".json"];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`許可されていないファイル形式です: ${file.originalname}`));
    }
  },
});

/**
 * POST /api/knowledge/upload
 * 複数ファイルをアップロード
 */
router.post("/upload", upload.array("files", MAX_FILES), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "NO_FILES",
        message: "ファイルが選択されていません",
      });
    }

    // 既存ファイル数を確認
    const existingFiles = listKnowledgeFiles();
    if (existingFiles.length + files.length > MAX_FILES) {
      // アップロード済みファイルを削除
      files.forEach((file) => {
        const filePath = path.join(STORAGE_DIR, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      return res.status(400).json({
        error: "MAX_FILES_EXCEEDED",
        message: `ファイル数の上限（${MAX_FILES}件）を超えています`,
      });
    }

    // 各ファイルをDBに登録
    const savedFiles = [];
    for (const file of files) {
      const id = randomUUID();
      const meta = {
        id,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mime: file.mimetype || "text/plain",
      };

      insertKnowledgeFile(meta);

      savedFiles.push({
        id: meta.id,
        name: meta.originalName,
        size: meta.size,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      files: savedFiles,
    });
  } catch (err: any) {
    console.error("[KNOWLEDGE-UPLOAD-ERROR]", err);

    // multerエラーの場合
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: `ファイルサイズが上限（${MAX_FILE_MB}MB）を超えています`,
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          error: "TOO_MANY_FILES",
          message: `ファイル数の上限（${MAX_FILES}件）を超えています`,
        });
      }
    }

    res.status(500).json({
      error: "UPLOAD_FAILED",
      message: err.message || "ファイルのアップロードに失敗しました",
    });
  }
});

/**
 * GET /api/knowledge/list
 * ファイル一覧を取得
 */
router.get("/list", (req: Request, res: Response) => {
  try {
    const files = listKnowledgeFiles();

    res.json({
      files: files.map((f) => ({
        id: f.id,
        name: f.originalName,
        size: f.size,
        createdAt: new Date(f.createdAt * 1000).toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("[KNOWLEDGE-LIST-ERROR]", err);
    res.status(500).json({
      error: "LIST_FAILED",
      message: err.message || "ファイル一覧の取得に失敗しました",
    });
  }
});

/**
 * DELETE /api/knowledge/:id
 * ファイルを削除
 */
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        error: "ID_REQUIRED",
        message: "ファイルIDが必要です",
      });
    }

    const deleted = deleteKnowledgeFile(id);

    if (!deleted) {
      return res.status(404).json({
        error: "FILE_NOT_FOUND",
        message: "ファイルが見つかりません",
      });
    }

    res.json({
      success: true,
      message: "ファイルを削除しました",
    });
  } catch (err: any) {
    console.error("[KNOWLEDGE-DELETE-ERROR]", err);
    res.status(500).json({
      error: "DELETE_FAILED",
      message: err.message || "ファイルの削除に失敗しました",
    });
  }
});

export default router;

