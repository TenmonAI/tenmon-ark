import { Router, type IRouter, type Request, type Response } from "express";
import { getSettings, saveSettings } from "../db/knowledge.js";

const router: IRouter = Router();

/**
 * GET /api/settings
 * 設定を取得
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json({
      name: settings.name,
      description: settings.description,
      instructions: settings.instructions,
      updatedAt: new Date(settings.updatedAt * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("[SETTINGS-GET-ERROR]", err);
    res.status(500).json({
      error: "GET_FAILED",
      message: err.message || "設定の取得に失敗しました",
    });
  }
});

/**
 * POST /api/settings
 * 設定を保存
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const { name, description, instructions } = req.body;

    if (typeof name !== "string" || typeof description !== "string" || typeof instructions !== "string") {
      return res.status(400).json({
        error: "INVALID_DATA",
        message: "name, description, instructions は文字列である必要があります",
      });
    }

    saveSettings({
      name: name || "TENMON-ARK",
      description: description || "",
      instructions: instructions || "",
    });

    res.json({
      success: true,
      message: "設定を保存しました",
    });
  } catch (err: any) {
    console.error("[SETTINGS-POST-ERROR]", err);
    res.status(500).json({
      error: "SAVE_FAILED",
      message: err.message || "設定の保存に失敗しました",
    });
  }
});

export default router;

