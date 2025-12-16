import { Router, Request, Response } from "express";

const router = Router();

/**
 * POST /api/chat
 * チャットエンドポイント（ダミー実装）
 * 後で拡張可能
 */
router.post("/chat", (req: Request, res: Response) => {
  const { message } = req.body;

  // バリデーション
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Bad Request",
      message: "message is required and must be a string",
    });
  }

  // ダミー応答（後で拡張）
  res.status(200).json({
    response: `Received: ${message}`,
    timestamp: new Date().toISOString(),
  });
});

export default router;

