import type { NextFunction, Request, Response } from "express";
import { getSessionId } from "../memory/sessionId.js";

type Bucket = { windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  // health/readiness/version は常に許可
  bypassPaths?: string[];
};

function keyFor(req: Request): string {
  try {
    const sessionId = getSessionId(req);
    if (sessionId) return `session:${sessionId}`;
  } catch {
    // ignore
  }
  return `ip:${req.ip || "unknown"}`;
}

/** Express: app.use("/api", mw) のとき req.path は /health のみ。bypass は /api/health と整合させる。 */
function pathForRateLimitBypass(req: Request): string {
  const base = (req.baseUrl || "").replace(/\/$/, "");
  const p = req.path || "";
  if (base && p) {
    const joined = `${base}${p === "/" ? "" : p}`;
    return joined;
  }
  if (p) return p;
  try {
    return (req.originalUrl || "").split("?")[0] || "";
  } catch {
    return "";
  }
}

export function rateLimit(opts: RateLimitOptions) {
  const bypass = new Set(opts.bypassPaths ?? ["/api/health", "/api/readiness", "/api/version"]);

  return (req: Request, res: Response, next: NextFunction) => {
    if (bypass.has(pathForRateLimitBypass(req))) return next();

    const now = Date.now();
    const k = keyFor(req);
    const b = buckets.get(k) ?? { windowStart: now, count: 0 };

    if (now - b.windowStart >= opts.windowMs) {
      b.windowStart = now;
      b.count = 0;
    }

    b.count += 1;
    buckets.set(k, b);

    if (b.count > opts.maxRequests) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    return next();
  };
}


