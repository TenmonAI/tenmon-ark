import { Router, type IRouter, type Request, type Response } from "express";
import { getHealthReport } from "../ops/health.js";
import { getReadinessReport } from "../ops/readiness.js";
import { TENMON_ARK_VERSION } from "../version.js";

const router: IRouter = Router();

router.get("/health", (_req: Request, res: Response) => res.json(getHealthReport()));

router.get("/readiness", (_req: Request, res: Response) => res.json(getReadinessReport()));

router.get("/version", (_req: Request, res: Response) => res.json({ version: TENMON_ARK_VERSION }));

export default router;
