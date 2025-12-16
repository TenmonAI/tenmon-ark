import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/health
 * ヘルスチェックエンドポイント
 * JSON のみを返す（HTML を返さない）
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "tenmon-ark-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;

