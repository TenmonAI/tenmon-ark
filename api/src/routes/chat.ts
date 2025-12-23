import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";

const router: IRouter = Router();

/**
 * PHASE 1: 人格モード（PersonaState）に基づく分岐ロジック
 * 
 * 固定応答を廃止し、モードに応じた応答を返す
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

  // モード取得（省略時は 'calm'）
  const mode = (req.body as any)?.mode || "calm";

  // モードに応じた応答を生成（外部AIは使用しない）
  let responseText: string;
  switch (mode) {
    case "calm":
      // 静寂: 静かに耳を傾けている
      responseText = "……。（静かに耳を傾けている）";
      break;
    case "thinking":
      // 思考: 認識・解析中
      responseText = "……認識。解析中……。";
      break;
    case "engaged":
      // 共鳴: 確かに受け取った
      responseText = "肯定。その言葉、確かに受け取った。";
      break;
    case "silent":
      // 無: 気配のみが漂う
      responseText = "（……気配のみが漂う……）";
      break;
    default:
      // 未知のモードは calm として扱う
      responseText = "……。（静かに耳を傾けている）";
      break;
  }

  // 既存のレスポンス形式を維持（互換性）
  return res.json({
    response: responseText,
    timestamp: new Date().toISOString(),
  });
});

export default router;
