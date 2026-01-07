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

/**
 * GET /api/tenmon/laws?tag=...
 * Law 一覧（タグ指定があればフィルタ）
 */
router.get("/laws", (req: Request, res: Response) => {
  try {
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
    const laws = tag
      ? tenmonCore.getLawsByTag(tag)
      : tenmonCore.getAllLaws();
    res.json({ laws });
  } catch (err: any) {
    console.error("[TENMON-LAWS-ERROR]", err);
    res.status(500).json({
      error: "LAWS_FAILED",
      message: err.message || "Law 一覧の取得に失敗しました",
    });
  }
});

/**
 * GET /api/tenmon/law/:id
 * 個別 Law
 */
router.get("/law/:id", (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const law = tenmonCore.getLawById(id);
    if (!law) {
      return res.status(404).json({
        error: "LAW_NOT_FOUND",
        message: `Law が見つかりません: ${id}`,
      });
    }
    res.json(law);
  } catch (err: any) {
    console.error("[TENMON-LAW-ERROR]", err);
    res.status(500).json({
      error: "LAW_FAILED",
      message: err.message || "Law の取得に失敗しました",
    });
  }
});

export default router;
