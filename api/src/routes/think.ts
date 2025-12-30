import { Router, type IRouter, type Request, type Response } from "express";
import { callLLM } from "../core/llm.js";

const router: IRouter = Router();

/**
 * POST /api/think
 * 
 * GPT/LLM による自然会話レイヤー
 * - 自然な会話応答を生成
 * - 構造的な判断は行わない
 * - フォーマット固定なし
 */
router.post("/think", async (req: Request, res: Response) => {
  try {
    const message = String(req.body.message ?? "");
    const sessionId = String(req.body.session_id ?? `think_${Date.now()}`);

    if (!message.trim()) {
      return res.status(400).json({
        error: "MESSAGE_REQUIRED",
        message: "メッセージが必要です",
      });
    }

    console.log(`[THINK] Input: ${message.substring(0, 50)}... (Session: ${sessionId})`);

    // LLM による自然会話生成
    const systemPrompt = `あなたは TENMON-ARK です。
自然な会話で応答してください。
構造的な判断や分析は行わず、ユーザーとの対話を続けてください。`;

    const userPrompt = message;

    const fullPrompt = `${systemPrompt}\n\nユーザー: ${userPrompt}\n\nTENMON-ARK:`;

    const response = await callLLM(fullPrompt);

    if (!response) {
      return res.status(503).json({
        error: "LLM_UNAVAILABLE",
        message: "LLMサービスが利用できません",
      });
    }

    res.json({
      response: response.trim(),
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[THINK-ERROR]", err);
    res.status(500).json({
      error: "THINK_FAILED",
      message: "思考処理に失敗しました",
    });
  }
});

export default router;

