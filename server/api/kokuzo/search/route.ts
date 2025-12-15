/**
 * KOKŪZŌ Search API
 * セマンティック検索エンドポイント
 */

import express from "express";
import { z } from "zod";
import { sdk } from "../../../_core/sdk";
import type { SemanticUnit } from "../../../kokuzo/semantic/engine";

const router = express.Router();

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional().default(10),
  type: z.enum(["text", "image", "audio", "video", "mixed"]).optional(),
});

/**
 * POST /api/kokuzo/search
 * セマンティック検索を実行
 */
router.post("/", express.json(), async (req, res) => {
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

    // リクエストボディの検証
    const input = searchSchema.parse(req.body);

    // TODO: 実際のセマンティック検索を実装
    // - SemanticUnit から検索
    // - Embedding ベースの類似度計算
    // - 結果を返す

    const hits: SemanticUnit[] = []; // プレースホルダー

    return res.status(200).json({
      success: true,
      data: {
        hits,
        total: hits.length,
        query: input.query,
      },
    });
  } catch (error) {
    console.error("[KOKUZO Search] Error:", error);
    
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

