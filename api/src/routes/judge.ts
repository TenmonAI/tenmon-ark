import { Router, type IRouter, type Request, type Response } from "express";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { verifyRuntimeIntegrity } from "../core/taiFreeze.js";

const router: IRouter = Router();

/**
 * POST /api/judge
 * 
 * TENMON-ARK judge() による最終判断専用
 * - 構造的な観測と判断を返す
 * - 会話レスポンスには使わない
 * - 毎回【構造】を出力する
 */
router.post("/judge", async (req: Request, res: Response) => {
  try {
    const input = String(req.body.input ?? req.body.message ?? "");
    const sessionId = String(req.body.session_id ?? `judge_${Date.now()}`);

    if (!input.trim()) {
      return res.status(400).json({
        error: "INPUT_REQUIRED",
        message: "入力が必要です",
      });
    }

    console.log(`[JUDGE] Input: ${input.substring(0, 50)}... (Session: ${sessionId})`);

    // Tai-Freeze 整合性チェック
    if (verifyRuntimeIntegrity && !verifyRuntimeIntegrity()) {
      console.error("[TAI-ALERT] Integrity violation");
      return res.status(503).json({
        error: "SYSTEM_SAFE_MODE",
        provisional: true,
        message: "システムが安全モードです",
      });
    }

    // TENMON-ARK judge() 実行
    const trace = await runKanagiReasoner(input, sessionId);

    res.json({
      session_id: sessionId,
      observation: trace.observationCircle,
      spiral: trace.spiral,
      trace: trace,
      provisional: true,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[JUDGE-ERROR]", err);
    res.status(500).json({
      error: "JUDGE_FAILED",
      provisional: true,
      message: "判断処理に失敗しました",
    });
  }
});

export default router;

