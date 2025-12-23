import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import { composeObservation } from "../kanagi/engine/observationComposer.js";
import { getSessionId } from "../memory/sessionId.js";
import { kanagiTraceToSemanticUnit, writebackToKokuzo } from "../kanagi/adapters/kokuzoAdapter.js";

const router: IRouter = Router();

/**
 * PHASE 1: 天津金木思考回路をチャットAPIに接続
 * 
 * 固定応答を廃止し、天津金木思考回路を通して観測を返す
 */
router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      observation: {
        description: sanitized.error || "message is required",
        unresolved: ["入力検証エラー"],
      },
      spiral: {
        depth: 0,
        previousObservation: "",
        nextFactSeed: "",
      },
      provisional: true,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // セッションID取得
    const sessionId = getSessionId(req) || `chat_${Date.now()}`;

    // 天津金木思考回路を実行
    const trace = await runKanagiReasoner(sanitized.text, sessionId);

    // 観測円を生成（observationComposer を使用）
    const observation = composeObservation(trace);

    // レスポンス形式（厳守）
    const response: ChatResponseBody = {
      response: observation.description, // 観測文
      observation: {
        description: observation.description,
        unresolved: observation.unresolved,
        focus: observation.focus,
      },
      spiral: trace.spiral,
      provisional: true,
      timestamp: new Date().toISOString(),
    };

    // B-2: KanagiTrace サイズ制御
    // デバッグモード: フル trace、通常モード: 軽量版
    const includeTrace = process.env.KANAGI_DEBUG === "true" || process.env.NODE_ENV === "development";
    if (includeTrace) {
      // フル trace（デバッグ用）
      (response as any).trace = trace;
    } else {
      // 軽量版（form / phase / observationCircle / spiral.depth のみ）
      (response as any).trace = {
        form: trace.form,
        phase: trace.phase,
        observationCircle: trace.observationCircle,
        spiral: {
          depth: trace.spiral?.depth || 0,
        },
      };
    }

    // C-2: 虚空蔵サーバーへの writeback（非同期、失敗時も応答継続）
    const userId = (req as any).user?.id || "anonymous";
    const semanticUnit = kanagiTraceToSemanticUnit(trace, userId, sessionId);
    
    // 非同期で writeback（await しない）
    writebackToKokuzo(semanticUnit).catch((err) => {
      // エラーは既に writebackToKokuzo 内でログ出力済み
      // ここでは何もしない（非ブロッキング）
    });

    return res.json(response);
  } catch (error) {
    console.error("[CHAT-KANAGI] Error:", error);
    // エラー時も観測を返す（停止しない）
    return res.json({
      response: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
      observation: {
        description: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
        unresolved: ["エラーにより思考が中断されましたが、循環状態を維持しています"],
      },
      spiral: {
        depth: 0,
        previousObservation: "",
        nextFactSeed: "",
      },
      provisional: true,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
