import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";
import { isReady, getReadinessStatus } from "../health/readiness.js";

const router = Router();
router.get("/audit", (_req: Request, res: Response) => {
  const handlerTime = Date.now();
  const pid = process.pid;
  const uptime = process.uptime();
  console.log(`[AUDIT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()}`);
  
  const ready = isReady();
  const status = getReadinessStatus();
  
  try {
    const gitSha = getGitSha();
    if (ready) {
      // Ready: 200 OK
      res.json({ 
        ok: true, 
        timestamp: new Date().toISOString(), 
        gitSha,
        pid,
        uptime: Math.floor(uptime),
      });
    } else {
      // Not ready: 503 Service Unavailable
      res.status(503).json({
        ok: false,
        timestamp: new Date().toISOString(),
        gitSha,
        pid,
        uptime: Math.floor(uptime),
        stage: status.stages,
        message: "Service not ready",
      });
    }
  } catch (error) {
    // gitSha が取得できない場合は 500 を返す（空文字で返さない）
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      pid,
      uptime: Math.floor(uptime),
    });
  }
});
export default router;
