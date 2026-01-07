import { Router, type IRouter, type Request, type Response } from "express";
import { tenmonCore } from "../tenmon-core/index.js";

const router: IRouter = Router();

/**
 * GET /api/tenmon/config
 * 設定を取得（読むだけ）
 */
router.get("/config", (req: Request, res: Response) => {
  try {
    const config = tenmonCore.getConfig();
    res.json(config);
  } catch (err: any) {
    console.error("[TENMON-CONFIG-ERROR]", err);
    res.status(500).json({
      error: "CONFIG_FAILED",
      message: err.message || "設定の取得に失敗しました",
    });
  }
});

/**
 * GET /api/tenmon/analyze?text=...
 * 開発用：言霊解析（本番は後で制御）
 */
router.get("/analyze", (req: Request, res: Response) => {
  try {
    const text = req.query.text as string;
    
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "TEXT_REQUIRED",
        message: "text パラメータが必要です",
      });
    }

    const analysis = tenmonCore.analyze(text);
    res.json(analysis);
  } catch (err: any) {
    console.error("[TENMON-ANALYZE-ERROR]", err);
    res.status(500).json({
      error: "ANALYZE_FAILED",
      message: err.message || "解析に失敗しました",
    });
  }
});

export default router;
