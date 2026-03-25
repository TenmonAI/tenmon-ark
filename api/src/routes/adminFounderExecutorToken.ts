/**
 * POST /api/admin/founder/executor-token — auth_session + 許可メールのみ発行（オプション refresh）
 * POST /api/admin/founder/executor-token/refresh — refresh_token のみ（セッション不要）
 * POST /api/admin/founder/executor-token/revoke — auth_session + access または refresh を失効
 */
import { Router, type Request, type Response } from "express";
import {
  auditFounderExecutor,
  issueFounderExecutorToken,
  issueFounderExecutorRefreshToken,
  refreshFounderExecutorAccess,
  revokeFounderExecutorCredential,
  sessionAllowedForExecutorIssue,
  getSessionUserForExecutorIssue,
  FOUNDER_EXECUTOR_ISSUER,
} from "../founder/executorTokenV1.js";

export const adminFounderExecutorTokenRouter = Router();

function wantIncludeRefresh(req: Request): boolean {
  const q = String(req.query.include_refresh ?? "").trim();
  if (q === "1" || q.toLowerCase() === "true") return true;
  const body = (req.body ?? {}) as { include_refresh?: unknown };
  return body.include_refresh === true || String(body.include_refresh ?? "").trim() === "1";
}

adminFounderExecutorTokenRouter.post("/admin/founder/executor-token", async (req: Request, res: Response) => {
  try {
    if (!sessionAllowedForExecutorIssue(req)) {
      return res.status(403).json({
        ok: false,
        error: "FOUNDER_SESSION_REQUIRED",
        detail: "auth_session required for allowed founder email only",
      });
    }
    const u = getSessionUserForExecutorIssue(req);
    if (!u) {
      return res.status(403).json({ ok: false, error: "FOUNDER_SESSION_REQUIRED" });
    }
    const { token, expiresAt, exp } = await issueFounderExecutorToken(u.userId, u.email);
    auditFounderExecutor("token_issued", { iss: FOUNDER_EXECUTOR_ISSUER, sub: u.userId, exp });
    const payload: Record<string, unknown> = { ok: true, token, expiresAt, exp };
    if (wantIncludeRefresh(req)) {
      const r = await issueFounderExecutorRefreshToken(u.userId, u.email);
      payload.refresh_token = r.refresh_token;
      payload.refresh_expires_at = r.refresh_expires_at;
      auditFounderExecutor("refresh_token_issued", { iss: FOUNDER_EXECUTOR_ISSUER, sub: u.userId, exp: r.exp });
    }
    return res.json(payload);
  } catch (e: any) {
    console.error("[executor_token] issue_failed", String(e?.message ?? e));
    return res.status(500).json({ ok: false, error: "token_issue_failed" });
  }
});

adminFounderExecutorTokenRouter.post("/admin/founder/executor-token/refresh", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as { refresh_token?: unknown };
    const refresh_token = String(body.refresh_token ?? "").trim();
    if (!refresh_token) {
      return res.status(400).json({ ok: false, error: "refresh_token_required" });
    }
    const out = await refreshFounderExecutorAccess(refresh_token);
    if (!out) {
      return res.status(401).json({ ok: false, error: "refresh_invalid_or_revoked" });
    }
    const payload: Record<string, unknown> = {
      ok: true,
      token: out.token,
      expiresAt: out.expiresAt,
      exp: out.exp,
    };
    if (out.refresh_token) {
      payload.refresh_token = out.refresh_token;
      payload.refresh_expires_at = out.refresh_expires_at;
    }
    return res.json(payload);
  } catch (e: any) {
    console.error("[executor_token] refresh_failed", String(e?.message ?? e));
    return res.status(500).json({ ok: false, error: "token_refresh_failed" });
  }
});

adminFounderExecutorTokenRouter.post("/admin/founder/executor-token/revoke", async (req: Request, res: Response) => {
  try {
    if (!sessionAllowedForExecutorIssue(req)) {
      return res.status(403).json({
        ok: false,
        error: "FOUNDER_SESSION_REQUIRED",
        detail: "auth_session required for allowed founder email only",
      });
    }
    const body = (req.body ?? {}) as { token?: unknown };
    const token = String(body.token ?? "").trim();
    if (!token) {
      return res.status(400).json({ ok: false, error: "token_required" });
    }
    const kind = await revokeFounderExecutorCredential(token);
    if (!kind) {
      return res.status(400).json({ ok: false, error: "revoke_failed_invalid_or_expired" });
    }
    return res.json({ ok: true, revoked: true, kind });
  } catch (e: any) {
    console.error("[executor_token] revoke_failed", String(e?.message ?? e));
    return res.status(500).json({ ok: false, error: "token_revoke_failed" });
  }
});
