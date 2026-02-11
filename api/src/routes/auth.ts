import { Router, type Request, type Response, type NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";

export type TenmonAuth = {
  email: string;
  founder?: boolean;
};

declare global {
  namespace Express {
    interface Request {
      auth?: TenmonAuth;
    }
  }
}

const COOKIE_NAME = "tenmon_token";

function getJwtSecret(): string {
  const s = String(process.env.AUTH_JWT_SECRET ?? "");
  if (!s) throw new Error("AUTH_JWT_SECRET is missing");
  return s;
}

async function issueToken(payload: TenmonAuth): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  // 30 days
  return await new SignJWT({ email: payload.email, founder: Boolean(payload.founder) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

async function verifyToken(token: string): Promise<TenmonAuth | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const out = await jwtVerify(token, secret);
    const p: any = out.payload ?? {};
    const email = typeof p.email === "string" ? p.email : "";
    if (!email) return null;
    return { email, founder: Boolean(p.founder) };
  } catch {
    return null;
  }
}

function getCookie(req: Request, name: string): string | null {
  const header = String(req.headers.cookie ?? "");
  if (!header) return null;
  const parts = header.split(";").map((s) => s.trim());
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

function setAuthCookie(res: Response, token: string) {
  // Secure/Lax/HttpOnly
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
}

function clearAuthCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  const auth = await verifyToken(token);
  if (!auth) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  req.auth = auth;
  return next();
}

export function requireFounder(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.email) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  if (!req.auth?.founder) return res.status(403).json({ ok: false, error: "FORBIDDEN_NOT_FOUNDER" });
  return next();
}

export const authRouter = Router();

/**
 * DEV ONLY: login with email (issues cookie)
 * gated by TENMON_ALLOW_DEV_LOGIN=1
 */
authRouter.post("/auth/dev-login", async (req: Request, res: Response) => {
  const allow = String(process.env.TENMON_ALLOW_DEV_LOGIN ?? "") === "1";
  if (!allow) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const email = String((req.body as any)?.email ?? "").trim();
  if (!email) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

  const token = await issueToken({ email, founder: false });
  setAuthCookie(res, token);
  return res.status(200).json({ ok: true, email, founder: false });
});

/**
 * DEV ONLY: set founder=true for current cookie user
 * gated by TENMON_ALLOW_DEV_LOGIN=1
 */
authRouter.post("/auth/dev-set-founder", requireAuth, async (req: Request, res: Response) => {
  const allow = String(process.env.TENMON_ALLOW_DEV_LOGIN ?? "") === "1";
  if (!allow) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const email = req.auth!.email;
  const token = await issueToken({ email, founder: true });
  setAuthCookie(res, token);
  return res.status(200).json({ ok: true, email, founder: true });
});

authRouter.post("/auth/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
});
