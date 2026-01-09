import { Router, type IRouter, type Request, type Response } from "express";
import { healthCheck } from "../ops/health.js";
import { getReadinessReport } from "../ops/readiness.js";
import { TENMON_ARK_VERSION } from "../version.js";

const router: IRouter = Router();

// 5-A: /api/health を必ず生やす
router.get("/health", async (_req: Request, res: Response) => {
  const out = await healthCheck();
  res.json(out);
});

router.get("/readiness", (_req: Request, res: Response) => res.json(getReadinessReport()));

router.get("/version", (_req: Request, res: Response) => res.json({ version: TENMON_ARK_VERSION }));

export default router;
