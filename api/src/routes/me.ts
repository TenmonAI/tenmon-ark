import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

router.get("/me", (req, res) => {
  try {
    const founder = (req as any).cookies?.tenmon_founder === "1";
    if (founder) {
      return res.json({ ok: true, authenticated: true, founder: true, user: { id: "founder", role: "FOUNDER" } });
    }

    const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
    if (!sessionId) return res.json({ ok: true, authenticated: false, founder: false, user: null });

    const db = getDb("kokuzo");
    const sess = db.prepare(`
      SELECT sessionId, userId, expiresAt
      FROM auth_sessions
      WHERE sessionId = ?
      LIMIT 1
    `).get(sessionId) as any;

    if (!sess || !sess.userId) return res.json({ ok: true, authenticated: false, founder: false, user: null });
    if (sess.expiresAt && String(sess.expiresAt) < new Date().toISOString()) {
      return res.json({ ok: true, authenticated: false, founder: false, user: null });
    }

    const user = db.prepare(`
      SELECT userId, email
      FROM auth_users
      WHERE userId = ?
      LIMIT 1
    `).get(String(sess.userId)) as any;

    if (!user) return res.json({ ok: true, authenticated: false, founder: false, user: null });

    return res.json({
      ok: true,
      authenticated: true,
      founder: false,
      user: {
        id: String(user.userId),
        email: String(user.email ?? ""),
        role: "USER",
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "ME_FAILED", detail: String(e?.message || e || "") });
  }
});

export default router;
