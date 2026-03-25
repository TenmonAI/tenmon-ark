/**
 * TENMON_FOUNDER_EXECUTOR_TOKEN — Mac executor 用短命 JWT（HMAC / HS256）
 * auth_session の値はログ・レスポンスに出さない。
 */
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getDb } from "../db/index.js";

export const FOUNDER_EXECUTOR_ISSUER = "tenmon-ark";
export const FOUNDER_EXECUTOR_ROLE = "founder_executor";
/** Mac executor 専用長寿命 refresh JWT（Bearer ミドルウェアでは受理しない） */
export const FOUNDER_EXECUTOR_REFRESH_ROLE = "founder_executor_refresh";

const DEFAULT_ALLOWED_EMAIL = "kouyoo4444@gmail.com";

function normalizeEmail(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase();
}

export function allowedFounderExecutorEmail(): string {
  return normalizeEmail(process.env.TENMON_FOUNDER_EXECUTOR_EMAIL || DEFAULT_ALLOWED_EMAIL);
}

function founderKey(): string {
  return process.env.FOUNDER_KEY || "CHANGE_ME_FOUNDER_KEY";
}

function getExecutorSecret(): Uint8Array {
  const raw = String(process.env.TENMON_FOUNDER_EXECUTOR_JWT_SECRET ?? "").trim();
  if (raw) return new TextEncoder().encode(raw);
  const fk = founderKey();
  if (fk && fk !== "CHANGE_ME_FOUNDER_KEY") {
    return new TextEncoder().encode(`tenmon:founder_executor_jwt_v1:${fk}`);
  }
  return new TextEncoder().encode("DEV_ONLY_TENMON_EXECUTOR_JWT_CHANGE_ME");
}

const REVOKE_PATH =
  process.env.TENMON_FOUNDER_EXECUTOR_REVOKE_PATH ||
  path.join(process.cwd(), "data", "founder_executor_revoked_jti.json");

const revokedJtis = new Set<string>();
const revokedRefreshJtis = new Set<string>();

function loadRevoked(): void {
  try {
    if (!fs.existsSync(REVOKE_PATH)) return;
    const j = JSON.parse(fs.readFileSync(REVOKE_PATH, "utf-8")) as { jtis?: string[]; refresh_jtis?: string[] };
    for (const x of j.jtis || []) {
      if (x) revokedJtis.add(String(x));
    }
    for (const x of j.refresh_jtis || []) {
      if (x) revokedRefreshJtis.add(String(x));
    }
  } catch {
    /* ignore */
  }
}

function persistRevoked(): void {
  try {
    fs.mkdirSync(path.dirname(REVOKE_PATH), { recursive: true });
    const body = {
      jtis: [...revokedJtis],
      refresh_jtis: [...revokedRefreshJtis],
      updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
    fs.writeFileSync(REVOKE_PATH, JSON.stringify(body, null, 2) + "\n", "utf-8");
  } catch (e) {
    console.error("[executor_token] persist_revoke_failed", String((e as Error)?.message ?? e));
  }
}

loadRevoked();

export function auditFounderExecutor(
  event: string,
  meta: { iss?: string; sub?: string; exp?: number | string; jti?: string }
): void {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      audit: "founder_executor",
      event,
      issuer: meta.iss,
      subject: meta.sub,
      exp: meta.exp,
      jti_prefix: meta.jti ? String(meta.jti).slice(0, 12) : undefined,
    })
  );
}

/** auth_session（サーバ内のみ）→ 許可メールのユーザーか。cookie 値はログしない。 */
export function getSessionUserForExecutorIssue(req: Request): { userId: string; email: string } | null {
  const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
  if (!sessionId) return null;
  try {
    const db = getDb("kokuzo");
    const sess = db
      .prepare(`SELECT userId, expiresAt FROM auth_sessions WHERE sessionId = ? LIMIT 1`)
      .get(sessionId) as { userId?: string; expiresAt?: string } | undefined;
    if (!sess?.userId) return null;
    if (sess.expiresAt && String(sess.expiresAt) < new Date().toISOString()) return null;
    const user = db
      .prepare(`SELECT userId, email FROM auth_users WHERE userId = ? LIMIT 1`)
      .get(String(sess.userId)) as { userId?: string; email?: string } | undefined;
    if (!user?.userId) return null;
    const email = String(user.email ?? "").trim();
    if (!email) return null;
    return { userId: String(user.userId), email };
  } catch {
    return null;
  }
}

export function sessionAllowedForExecutorIssue(req: Request): boolean {
  const u = getSessionUserForExecutorIssue(req);
  if (!u) return false;
  return normalizeEmail(u.email) === allowedFounderExecutorEmail();
}

export type FounderExecutorClaims = {
  sub: string;
  email: string;
  role: string;
  iss: string;
  iat?: number;
  exp?: number;
  jti?: string;
};

function ttlSeconds(): number {
  const m = Number(process.env.TENMON_FOUNDER_EXECUTOR_TTL_MIN ?? 15);
  const min = Number.isFinite(m) && m > 0 ? Math.min(Math.max(m, 5), 120) : 15;
  return min * 60;
}

function refreshTtlSeconds(): number {
  const d = Number(process.env.TENMON_FOUNDER_EXECUTOR_REFRESH_TTL_DAYS ?? 30);
  const days = Number.isFinite(d) && d > 0 ? Math.min(Math.max(d, 1), 365) : 30;
  return days * 24 * 60 * 60;
}

export async function issueFounderExecutorToken(
  userId: string,
  email: string
): Promise<{ token: string; expiresAt: string; exp: number }> {
  const secret = getExecutorSecret();
  const now = Math.floor(Date.now() / 1000);
  const expSec = ttlSeconds();
  const exp = now + expSec;
  const expDate = new Date(exp * 1000);
  const expiresAt = expDate.toISOString().replace(/\.\d{3}Z$/, "Z");
  const jti = randomUUID();
  const token = await new SignJWT({
    email: normalizeEmail(email),
    role: FOUNDER_EXECUTOR_ROLE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuer(FOUNDER_EXECUTOR_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secret);
  return { token, expiresAt, exp };
}

export async function issueFounderExecutorRefreshToken(
  userId: string,
  email: string
): Promise<{ refresh_token: string; refresh_expires_at: string; exp: number }> {
  const secret = getExecutorSecret();
  const now = Math.floor(Date.now() / 1000);
  const expSec = refreshTtlSeconds();
  const exp = now + expSec;
  const expDate = new Date(exp * 1000);
  const refresh_expires_at = expDate.toISOString().replace(/\.\d{3}Z$/, "Z");
  const jti = randomUUID();
  const refresh_token = await new SignJWT({
    email: normalizeEmail(email),
    role: FOUNDER_EXECUTOR_REFRESH_ROLE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuer(FOUNDER_EXECUTOR_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secret);
  return { refresh_token, refresh_expires_at, exp };
}

export async function verifyFounderExecutorRefreshToken(token: string): Promise<FounderExecutorClaims | null> {
  if (!token || !String(token).trim()) return null;
  try {
    const secret = getExecutorSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: FOUNDER_EXECUTOR_ISSUER,
    });
    const p = payload as JWTPayload;
    const jti = typeof p.jti === "string" ? p.jti : "";
    if (jti && revokedRefreshJtis.has(jti)) return null;
    const role = String((p as any).role ?? "");
    if (role !== FOUNDER_EXECUTOR_REFRESH_ROLE) return null;
    const sub = String(p.sub ?? "");
    const email = String((p as any).email ?? "");
    if (!sub || !email) return null;
    const iss = String(p.iss ?? "");
    return {
      sub,
      email,
      role,
      iss,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
      jti,
    };
  } catch {
    return null;
  }
}

/** refresh を検証し短命 access を発行。TENMON_FOUNDER_EXECUTOR_REFRESH_ROTATE=1 で refresh もローテーション */
export async function refreshFounderExecutorAccess(refreshToken: string): Promise<{
  token: string;
  expiresAt: string;
  exp: number;
  refresh_token?: string;
  refresh_expires_at?: string;
} | null> {
  const claims = await verifyFounderExecutorRefreshToken(refreshToken);
  if (!claims?.jti) return null;
  const rotate = String(process.env.TENMON_FOUNDER_EXECUTOR_REFRESH_ROTATE ?? "0").trim() === "1";
  if (rotate) {
    revokedRefreshJtis.add(claims.jti);
  }
  const access = await issueFounderExecutorToken(claims.sub, claims.email);
  if (rotate) {
    const nr = await issueFounderExecutorRefreshToken(claims.sub, claims.email);
    persistRevoked();
    auditFounderExecutor("refresh_rotated", {
      iss: claims.iss,
      sub: claims.sub,
      exp: claims.exp,
      jti: claims.jti,
    });
    return {
      token: access.token,
      expiresAt: access.expiresAt,
      exp: access.exp,
      refresh_token: nr.refresh_token,
      refresh_expires_at: nr.refresh_expires_at,
    };
  }
  auditFounderExecutor("access_refreshed", { iss: claims.iss, sub: claims.sub, exp: access.exp });
  return { token: access.token, expiresAt: access.expiresAt, exp: access.exp };
}

export async function verifyFounderExecutorToken(token: string): Promise<FounderExecutorClaims | null> {
  if (!token || !String(token).trim()) return null;
  try {
    const secret = getExecutorSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: FOUNDER_EXECUTOR_ISSUER,
    });
    const p = payload as JWTPayload;
    const jti = typeof p.jti === "string" ? p.jti : "";
    if (jti && revokedJtis.has(jti)) return null;
    const role = String((p as any).role ?? "");
    if (role !== FOUNDER_EXECUTOR_ROLE) return null;
    const sub = String(p.sub ?? "");
    const email = String((p as any).email ?? "");
    if (!sub || !email) return null;
    const iss = String(p.iss ?? "");
    return {
      sub,
      email,
      role,
      iss,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
      jti,
    };
  } catch {
    return null;
  }
}

export async function revokeFounderExecutorToken(token: string): Promise<boolean> {
  const claims = await verifyFounderExecutorToken(token);
  if (!claims?.jti) return false;
  revokedJtis.add(claims.jti);
  persistRevoked();
  auditFounderExecutor("token_revoked", { iss: claims.iss, sub: claims.sub, exp: claims.exp, jti: claims.jti });
  return true;
}

/** access または refresh のいずれかを失効（署名・期限・ロールが有効なトークンのみ） */
export async function revokeFounderExecutorCredential(token: string): Promise<"access" | "refresh" | null> {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return null;
  const accessClaims = await verifyFounderExecutorToken(trimmed);
  if (accessClaims?.jti) {
    revokedJtis.add(accessClaims.jti);
    persistRevoked();
    auditFounderExecutor("token_revoked", {
      iss: accessClaims.iss,
      sub: accessClaims.sub,
      exp: accessClaims.exp,
      jti: accessClaims.jti,
    });
    return "access";
  }
  const refreshClaims = await verifyFounderExecutorRefreshToken(trimmed);
  if (refreshClaims?.jti) {
    revokedRefreshJtis.add(refreshClaims.jti);
    persistRevoked();
    auditFounderExecutor("refresh_token_revoked", {
      iss: refreshClaims.iss,
      sub: refreshClaims.sub,
      exp: refreshClaims.exp,
      jti: refreshClaims.jti,
    });
    return "refresh";
  }
  return null;
}

/** admin cursor / remote-build: cookie founder | X-Founder-Key | Bearer executor JWT | 補助 X-Admin-Token */
export function requireFounderOrExecutorBearer(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    try {
      const cookieOk = (req as any).cookies?.tenmon_founder === "1";
      const headerKey = String(req.headers["x-founder-key"] ?? "").trim();
      const fk = founderKey();
      if (cookieOk || (headerKey && headerKey === fk)) {
        return next();
      }
      const aux = String(process.env.TENMON_ADMIN_AUX_TOKEN ?? "").trim();
      const auxHdr = String(req.headers["x-admin-token"] ?? "").trim();
      if (aux && auxHdr && auxHdr === aux) {
        return next();
      }
      const authz = String(req.headers.authorization ?? "").trim();
      if (authz.toLowerCase().startsWith("bearer ")) {
        const tok = authz.slice(7).trim();
        const claims = await verifyFounderExecutorToken(tok);
        if (claims) {
          if (String(process.env.TENMON_FOUNDER_EXECUTOR_AUDIT_BEARER ?? "1").trim() !== "0") {
            auditFounderExecutor("bearer_accepted", {
              iss: claims.iss,
              sub: claims.sub,
              exp: claims.exp,
              jti: claims.jti,
            });
          }
          return next();
        }
      }
      return res.status(403).json({
        ok: false,
        error: "FOUNDER_REQUIRED",
        detail: "login founder, X-Founder-Key, Authorization: Bearer executor JWT, or X-Admin-Token",
      });
    } catch (e) {
      return next(e as Error);
    }
  })();
}
