import type { Router } from "express";
import { json } from "express";

function founderKey(): string {
  return process.env.FOUNDER_KEY || "CHANGE_ME_FOUNDER_KEY";
}

function cookieOpts() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

export function registerFounderAuth(app: Router) {
  app.use(json());

  app.post("/api/login", (req, res) => {
    // LOGIN_ACCEPT_FOUNDERKEY_CARD2: accept {k} OR {founderKey} (compat with PWA autologin)
    try {
      const b: any = (req as any).body || {};
      if (typeof b.k !== "string" || !b.k.trim()) {
        if (typeof b.founderKey === "string" && b.founderKey.trim()) b.k = b.founderKey;
      }
      (req as any).body = b;
    } catch {}

    const key = String(req.body?.founderKey ?? "");
    if (!key) return res.status(400).json({ ok: false, error: "BAD_REQUEST", detail: "founderKey required" });
    if (key !== founderKey()) return res.status(401).json({ ok: false, error: "UNAUTHORIZED", detail: "invalid founderKey" });
    res.cookie("tenmon_founder", "1", cookieOpts());
    return res.json({ ok: true, founder: true });
  });

  app.post("/api/logout", (_req, res) => {
    res.clearCookie("tenmon_founder", { path: "/" });
    return res.json({ ok: true });
  });

  app.get("/api/me", (req, res) => {
    // ME_NOSTORE_CARD4_FIX_V1: avoid cached auth state for /api/me
    try { res.removeHeader("ETag"); } catch {}
    try {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } catch {}

    const founder = (req as any).cookies?.tenmon_founder === "1";
    return res.json({ ok: true, user: founder ? { id: "founder", role: "FOUNDER" } : null, founder });
  });
}
