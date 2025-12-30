import { Router, type IRouter, type Request, type Response } from "express";
import { callLLM } from "../core/llm.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";

const router: IRouter = Router();

/**
 * POST /api/chat
 * 
 * 二層構造のチャットエンドポイント
 * - think → 条件付きで judge
 * - judge() は常に呼ばない
 * - 会話出力のフォーマット固定なし
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const message = String(req.body.message ?? "");
    const sessionId = String(req.body.session_id ?? `chat_${Date.now()}`);

    if (!message.trim()) {
      return res.status(400).json({
        error: "MESSAGE_REQUIRED",
        message: "メッセージが必要です",
      });
    }

    console.log(`[CHAT] Input: ${message.substring(0, 50)}... (Session: ${sessionId})`);

    // ========================================
    // 1. think レイヤー（常に実行）
    // ========================================
    const systemPrompt = `あなたは TENMON-ARK です。
自然な会話で応答してください。
構造的な判断や分析は行わず、ユーザーとの対話を続けてください。`;

    const userPrompt = message;
    const fullPrompt = `${systemPrompt}\n\nユーザー: ${userPrompt}\n\nTENMON-ARK:`;

    const thinkResponse = await callLLM(fullPrompt);

    if (!thinkResponse) {
      return res.status(503).json({
        error: "LLM_UNAVAILABLE",
        message: "LLMサービスが利用できません",
      });
    }

    // ========================================
    // 2. judge レイヤー（条件付きで実行）
    // ========================================
    // 判断が必要な場合のみ judge() を呼ぶ
    // 例：ユーザーが明示的に判断を求めた場合
    const shouldJudge = 
      message.includes("判断") ||
      message.includes("結論") ||
      message.includes("どう思う") ||
      message.includes("分析") ||
      message.includes("構造");

    let judgeResult = null;

    if (shouldJudge) {
      try {
        const trace = await runKanagiReasoner(message, sessionId);
        judgeResult = {
          observation: trace.observationCircle,
          spiral: trace.spiral,
          provisional: true,
        };
        console.log(`[CHAT] Judge executed (Session: ${sessionId})`);
      } catch (judgeError) {
        console.error("[CHAT] Judge failed, continuing with think only", judgeError);
        // judge が失敗しても think の結果は返す
      }
    }

    // ========================================
    // 3. レスポンス構築
    // ========================================
    const response: any = {
      response: thinkResponse.trim(),
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    };

    // judge が実行された場合のみ追加
    if (judgeResult) {
      response.judgement = judgeResult;
    }

    res.json(response);

  } catch (err) {
    console.error("[CHAT-ERROR]", err);
    res.status(500).json({
      error: "CHAT_FAILED",
      message: "チャット処理に失敗しました",
    });
  }
});

export default router;
