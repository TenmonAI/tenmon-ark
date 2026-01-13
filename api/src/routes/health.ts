import { Router, type IRouter, type Request, type Response } from "express";
import { healthCheck } from "../ops/health.js";
import { getReadinessReport } from "../ops/readiness.js";
import { TENMON_ARK_VERSION, TENMON_ARK_BUILT_AT, TENMON_ARK_GIT_SHA } from "../version.js";

const router: IRouter = Router();

// 5-A: /api/health を必ず生やす
router.get("/health", async (_req: Request, res: Response) => {
  const out = await healthCheck();
  res.json(out);
});

router.get("/readiness", (_req: Request, res: Response) => res.json(getReadinessReport()));

// Phase 1-A: /api/version にビルド情報を追加
router.get("/version", (_req: Request, res: Response) => {
  res.json({
    version: TENMON_ARK_VERSION,
    builtAt: TENMON_ARK_BUILT_AT,
    gitSha: TENMON_ARK_GIT_SHA,
  });
});

export default router;
