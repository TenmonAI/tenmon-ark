import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";
import { getReadiness } from "../health/readiness.js";


const BUILD_FEATURES_KOSHIKI = { ...BUILD_FEATURES, koshikiKernel: true } as const;
import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";
const router = Router();
router.get("/audit", (_req: Request, res: Response) => {
  const handlerTime = Date.now();
  const pid = process.pid;
  const uptime = process.uptime();
  const r = getReadiness();
  console.log(`[AUDIT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);
  
  try {
    const gitSha = getGitSha();
    if (!r.ready) {
      // Not ready: 503 Service Unavailable
      return res.status(503).json({
        ok: false,
        timestamp: new Date().toISOString(),
        gitSha,
        pid,
        uptime: Math.floor(uptime),
        readiness: r,
      build: { mark: BUILD_MARK, features: BUILD_FEATURES_KOSHIKI },
        });
    }
    // Ready: 200 OK
    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      gitSha,
      pid,
      uptime: Math.floor(uptime),
      readiness: r,
    build: { mark: BUILD_MARK, features: BUILD_FEATURES_KOSHIKI },
        });
  } catch (error) {
    // gitSha と readiness は取得を試みる（失敗時は空文字/null）
    let gitSha = "";
    let readiness = null;
    try {
      gitSha = getGitSha();
    } catch {
      // gitSha 取得失敗時は空文字のまま
    }
    try {
      readiness = getReadiness();
    } catch {
      // readiness 取得失敗時は null のまま
    }
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      gitSha,
      error: error instanceof Error ? error.message : String(error),
      pid,
      uptime: Math.floor(uptime),
      readiness,
    });
  }
});
export default router;
