/**
 * 🔱 Multi-Site Learner API
 * 複数サイト一括学習エンドポイント
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import { errorHandler } from "../../_core/errorHandler";
import { learnMultipleSites } from "../../concierge/multiSiteLearner";

const router = express.Router();

/**
 * Multi-Learn リクエストスキーマ
 */
const multiLearnSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10), // 最大10サイトまで
  maxPages: z.number().optional().default(50),
  depth: z.number().optional().default(2),
});

/**
 * POST /api/concierge/multi-learn
 * 複数サイトを一括学習
 */
router.post("/multi-learn", async (req: Request, res: Response) => {
  try {
    const input = multiLearnSchema.parse(req.body);
    const { urls, maxPages, depth } = input;

    const results = await learnMultipleSites(urls, { maxPages, depth });

    return res.json({
      success: true,
      results,
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
});

export default router;

