import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";
import { getReadiness } from "../health/readiness.js";


/**
 * B1_CONSTITUTION_HASHES_V2
 * audit-only observability: expose constitution sha256 (first token).
 * No routing/chat behavior changes.
 */
function __readSha256FirstToken(p: string): string | null {
  try {
    const txt = String(fs.readFileSync(p, "utf8") || "").trim();
    const tok = txt.split(/\s+/)[0];
    return tok && tok.length >= 32 ? tok : null;
  } catch {
    return null;
  }
}

// FIX_CONSTITUTION_BIND_V1: constitution 3項目を null にしない（読み出し失敗時は暫定固定文字列）
const __constitutionFallback = "pending";

function __constitutionHashes(): Record<string, string> {
  const base = "/opt/tenmon-ark-data/constitution";
  return {
    OMEGA_CONTRACT_v1: __readSha256FirstToken(base + "/OMEGA_CONTRACT_v1.sha256") ?? __constitutionFallback,
    PDCA_BUILD_CONTRACT_v1: __readSha256FirstToken(base + "/TENMON-ARK_PDCA_BUILD_CONTRACT_v1.sha256") ?? __constitutionFallback,
    KHS_RUNTIME_CONTRACT_v1: __readSha256FirstToken(base + "/TENMON-ARK_KHS_RUNTIME_INTEGRATION_CONTRACT_v1.sha256") ?? __constitutionFallback,
  };
}

const BUILD_FEATURES_KOSHIKI = { ...BUILD_FEATURES, koshikiKernel: true } as const;
import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";
import * as fs from "fs"; // B1_CONSTITUTION_HASHES_V2
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
      constitution: { ...__constitutionHashes() },
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
