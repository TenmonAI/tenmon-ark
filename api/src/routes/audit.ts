import { Router, type Request, type Response } from "express";

const router = Router();

// GET /api/audit (minimal SLO)
router.get("/audit", (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
