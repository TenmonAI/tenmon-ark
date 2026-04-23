// api/src/core/mc/authGuards.ts
// MC V2 FINAL — §11.2 Auth Guards (thin wrapper over existing auth)

import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireFounder, tryAuthFromRequest } from '../../routes/auth.js';

/**
 * maybeAuth: Attempt to authenticate but don't block.
 * Sets req.auth if valid token exists, otherwise continues (never sends 401).
 */
export async function maybeAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await tryAuthFromRequest(req);
    req.auth = auth ?? undefined;
  } catch {
    req.auth = undefined;
  }
  next();
}

/**
 * mcRequireAuth: Require authentication for MC routes.
 * Delegates to existing requireAuth.
 */
export async function mcRequireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, next);
  return;
}

/**
 * mcRequireAdmin: Require founder-level access for MC admin routes.
 * Chains requireAuth → requireFounder.
 */
export async function mcRequireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, (err?: any) => {
    if (err) return next(err);
    requireFounder(req, res, next);
  });
  return;
}

/**
 * Loopback check: request must have arrived on 127.0.0.1 / ::1.
 * API listens on 0.0.0.0 but production traffic always transits nginx on
 * the same host, so any remote socket address that isn't loopback indicates
 * a direct backend hit that must not be trusted.
 */
function isFromLoopback(req: Request): boolean {
  const ip = (req.socket && req.socket.remoteAddress) || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * hasMcBasicTrust: true only if the request was forwarded from the nginx
 * owner-only `/api/mc/vnext/` proxy, which injects a shared secret that
 * callers outside that proxy cannot know (the generic `/api/` proxy strips
 * the header before forwarding). Must also arrive over loopback so a direct
 * hit on port 3000 can't forge the header.
 */
export function hasMcBasicTrust(req: Request): boolean {
  const expected = (process.env.TENMON_MC_BASIC_TRUST_SECRET ?? "").trim();
  if (expected.length < 16) return false;
  const received = String(req.headers["x-tenmon-mc-basic-trust"] ?? "").trim();
  if (!received || received !== expected) return false;
  return isFromLoopback(req);
}

function bearerTokenFromRequest(req: Request): string {
  const raw = String(req.headers.authorization ?? "").trim();
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1].trim() : "";
}

/**
 * CARD-MC-16: AI 用 read-only レーン。人間用 Basic / founder JWT とは別の長い共有秘密。
 * nginx の専用 location で Authorization を通したうえで Bearer のみ送る想定。
 */
export function hasMcClaudeReadBearer(req: Request): boolean {
  const expected = (process.env.TENMON_MC_CLAUDE_READ_TOKEN ?? "").trim();
  if (expected.length < 24) return false;
  const received = bearerTokenFromRequest(req);
  if (!received || received.length < 24) return false;
  try {
    const a = Buffer.from(received, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * mcRequireAdminOrMcBasic: Admin gate used by `/api/mc/vnext/*`.
 *
 * Accepts EITHER of:
 *   1. A valid founder JWT (normal path / direct curl with tenmon_token).
 *   2. The nginx-injected MC basic-auth trust header (only present for
 *      requests that already passed `auth_basic` on `/mc/*` / `/api/mc/vnext/*`).
 *
 * Scope is intentionally narrow: only MC vNext routes mount this guard.
 * `/api/chat` and other endpoints keep their existing auth unchanged.
 */
export async function mcRequireAdminOrMcBasic(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasMcBasicTrust(req)) {
    req.auth = {
      email: req.auth?.email ?? "mc-basic-trust@tenmon-ark.local",
      founder: true,
    };
    next();
    return;
  }
  mcRequireAdmin(req, res, next);
  return;
}

/**
 * MC vNext read API: founder JWT OR nginx MC basic trust OR Claude read Bearer.
 * write 系ルートには掛けないこと（`mcRequireAdminOrMcBasic` のみにする）。
 */
export async function mcRequireAdminOrMcBasicOrClaudeRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasMcBasicTrust(req)) {
    req.tenmonMcClaudeReadLane = false;
    req.auth = {
      email: req.auth?.email ?? "mc-basic-trust@tenmon-ark.local",
      founder: true,
    };
    next();
    return;
  }
  if (hasMcClaudeReadBearer(req)) {
    req.tenmonMcClaudeReadLane = true;
    req.auth = {
      email: "claude-read-lane@tenmon-ark.local",
      founder: false,
    };
    next();
    return;
  }
  req.tenmonMcClaudeReadLane = false;
  mcRequireAdmin(req, res, next);
}

/** write / operator 用: Claude Bearer は通さない */
export async function mcRequireAdminOrMcBasicNoClaude(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (hasMcClaudeReadBearer(req)) {
    res.status(403).json({ ok: false, error: "MC_CLAUDE_READ_TOKEN_NOT_ALLOWED_FOR_THIS_ROUTE" });
    return;
  }
  await mcRequireAdminOrMcBasic(req, res, next);
}

/**
 * CARD-MC-16 verify: Claude read token は GET / HEAD のみ（POST/PUT/PATCH/DELETE は 403）。
 * founder / MC Basic trust レーンでは制限しない。
 */
export function mcVnextClaudeReadGetOnly(req: Request, res: Response, next: NextFunction): void {
  if (req.tenmonMcClaudeReadLane) {
    const m = String(req.method || "GET").toUpperCase();
    if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
      res.status(403).json({ ok: false, error: "MC_CLAUDE_READ_LANE_GET_ONLY" });
      return;
    }
  }
  next();
}
