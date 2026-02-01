import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";

const router = Router();
router.get("/audit", (_req: Request, res: Response) => {
  try {
    const gitSha = getGitSha();
    res.json({ ok: true, timestamp: new Date().toISOString(), gitSha });
  } catch (error) {
    // gitSha が取得できない場合は 500 を返す（空文字で返さない）
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
export default router;
