import type { Router } from "express";
import { json } from "express";
import { getDb } from "../db/index.js";

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

    const key = String(req.body?.k ?? req.body?.founderKey ?? "");
    if (!key) return res.status(400).json({ ok: false, error: "BAD_REQUEST", detail: "k or founderKey required" });
    if (key !== founderKey()) return res.status(401).json({ ok: false, error: "UNAUTHORIZED", detail: "invalid founderKey" });
    res.cookie("tenmon_founder", "1", cookieOpts());
    return res.json({ ok: true, founder: true });
  });

  app.post("/api/logout", (_req, res) => {
    res.clearCookie("tenmon_founder", { path: "/" });
    return res.json({ ok: true });
  });

  app.get("/api/me", (req, res) => {
    try { res.removeHeader("ETag"); } catch {}
    try {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } catch {}

    const founder = (req as any).cookies?.tenmon_founder === "1";
    if (founder) {
      return res.json({ ok: true, user: { id: "founder", role: "FOUNDER" }, founder: true });
    }

    try {
      const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
      if (!sessionId) {
        return res.json({ ok: true, user: null, founder: false });
      }

      const db = getDb("kokuzo");

      const sess = db.prepare(`
        SELECT sessionId, userId, expiresAt
        FROM auth_sessions
        WHERE sessionId = ?
        LIMIT 1
      `).get(sessionId) as any;

      if (!sess || !sess.userId) {
        return res.json({ ok: true, user: null, founder: false });
      }

      if (sess.expiresAt && String(sess.expiresAt) < new Date().toISOString()) {
        return res.json({ ok: true, user: null, founder: false });
      }

      const user = db.prepare(`
        SELECT userId, email
        FROM auth_users
        WHERE userId = ?
        LIMIT 1
      `).get(String(sess.userId)) as any;

      if (!user) {
        return res.json({ ok: true, user: null, founder: false });
      }

      return res.json({
        ok: true,
        user: {
          id: String(user.userId),
          email: String(user.email ?? ""),
          role: "USER"
        },
        founder: false
      });
    } catch (e: any) {
      return res.json({
        ok: true,
        user: null,
        founder: false,
        error: String(e?.message ?? e ?? "")
      });
    }
  });
}
