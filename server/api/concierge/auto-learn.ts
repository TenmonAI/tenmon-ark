/**
 * 🔱 AutoSite Learner API
 * サイト自動学習エンドポイント
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import { errorHandler } from "../../_core/errorHandler";
import { autoLearnSite } from "../../concierge/autoSiteLearner";

const router = express.Router();

/**
 * Auto-Learn リクエストスキーマ
 */
const autoLearnSchema = z.object({
  url: z.string().url(),
  siteId: z.string().min(1),
  maxPages: z.number().optional().default(50),
  depth: z.number().optional().default(2),
});

/**
 * POST /api/concierge/auto-learn
 * サイトを自動学習
 */
router.post("/auto-learn", async (req: Request, res: Response) => {
  try {
    const input = autoLearnSchema.parse(req.body);
    const { url, siteId, maxPages, depth } = input;

    const result = await autoLearnSite(url, siteId, { maxPages, depth });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
});

export default router;

