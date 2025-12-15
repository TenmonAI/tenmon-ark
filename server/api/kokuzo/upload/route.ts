/**
 * KOKŪZŌ Upload API
 * ファイルアップロードエンドポイント
 */

import express from "express";
import multer from "multer";
import { z } from "zod";
import { sdk } from "../../../_core/sdk";
import { savePhysicalFile } from "../../../kokuzo/storage/osCore";
import type { KZFile } from "../../../kokuzo/storage/osCore";

const router = express.Router();

// Multer設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const uploadSchema = z.object({
  folderId: z.string().optional(),
  deviceId: z.string().optional(),
});

/**
 * POST /api/kokuzo/upload
 * ファイルをアップロード
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // Founder/Devプランのみアクセス可能
    if (user.plan !== "founder" && user.plan !== "dev") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "This feature is only available for Founder/Dev plans",
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "File is required",
        },
      });
    }

    // リクエストボディの検証
    const body = uploadSchema.parse(req.body || {});
    
    // 物理ファイルを保存
    const fileId = crypto.randomUUID();
    const relPath = `${user.id}/${fileId}/${req.file.originalname}`;
    const physicalPath = await savePhysicalFile(req.file.buffer, relPath);

    // KZFile レコード作成（TODO: データベースに保存）
    const kzFile: KZFile = {
      id: fileId,
      ownerId: user.id,
      deviceId: body.deviceId || "default",
      mime: req.file.mimetype,
      sizeBytes: req.file.size,
      originalName: req.file.originalname,
      physicalPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: body.folderId,
    };

    return res.status(200).json({
      success: true,
      data: {
        fileId: kzFile.id,
        fileName: kzFile.originalName,
        sizeBytes: kzFile.sizeBytes,
        mime: kzFile.mime,
      },
    });
  } catch (error) {
    console.error("[KOKUZO Upload] Error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "SERVICE_ERROR",
        message: "Internal server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
    });
  }
});

export default router;

