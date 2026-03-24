import { Router, type IRouter, type Request, type Response } from "express";
import { getReadiness } from "../health/readiness.js";
import { getReadinessReport } from "../ops/readiness.js";
import { TENMON_ARK_VERSION, getGitSha } from "../version.js";

const router: IRouter = Router();

/**
 * TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1:
 * GET /api/health は /api/audit の最小投影（ok / timestamp / gitSha / readiness）。
 * readiness は health/readiness.getReadiness()（audit と同一オブジェクト）。
 */
router.get("/health", (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let gitSha = "";
  try {
    gitSha = getGitSha();
  } catch {
    gitSha = "";
  }
  const readiness = getReadiness();
  const ok = readiness.ready;
  const body = { ok, timestamp, gitSha, readiness };
  if (!ok) {
    return res.status(503).json(body);
  }
  return res.json(body);
});

router.get("/readiness", (_req: Request, res: Response) => res.json(getReadinessReport()));

router.get("/version", (_req: Request, res: Response) => res.json({ version: TENMON_ARK_VERSION }));

export default router;
