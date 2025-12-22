import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { respond } from "../tenmon/respond.js";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";

const router: IRouter = Router();

/**
 * v∞-2: 既存の /api/chat エンドポイント（互換維持）
 * 
 * 内部で respond() を呼び出す薄いラッパー
 */
router.post("/chat", (req: Request, res: Response<ChatResponseBody>) => {
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      timestamp: new Date().toISOString(),
    });
  }

  const sessionId = getSessionId(req);
  
  // v∞-2: コアロジックを respond() に委譲
  const finalReply = respond(sanitized.text, sessionId, "web");

  // 既存のレスポンス形式を維持（互換性）
  return res.json({
    response: finalReply,
    timestamp: new Date().toISOString(),
  });
});

export default router;
