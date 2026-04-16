import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { getDb } from "../db/index.js";

export const inviteRouter = Router();

const OWNER_EMAIL = "kouyoo4444@gmail.com";

function getOwnerUserId(): string | null {
  try {
    const db = getDb("kokuzo");
    const row = db.prepare("SELECT userId FROM auth_users WHERE email = ? LIMIT 1")
      .get(OWNER_EMAIL) as any;
    return row?.userId ?? null;
  } catch { return null; }
}

function requireOwner(req: Request, res: Response): string | null {
  try {
    const db = getDb("kokuzo");
    const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
    if (!sessionId) {
      res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      return null;
    }
    const sess = db.prepare(
      "SELECT userId, expiresAt FROM auth_sessions WHERE sessionId = ? LIMIT 1"
    ).get(sessionId) as any;
    if (!sess?.userId) {
      res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
      return null;
    }
    if (sess.expiresAt && sess.expiresAt < new Date().toISOString()) {
      res.status(401).json({ ok: false, error: "SESSION_EXPIRED" });
      return null;
    }
    const user = db.prepare("SELECT email FROM auth_users WHERE userId = ? LIMIT 1")
      .get(sess.userId) as any;
    if (user?.email !== OWNER_EMAIL) {
      res.status(403).json({ ok: false, error: "FORBIDDEN" });
      return null;
    }
    return sess.userId;
  } catch {
    res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
    return null;
  }
}

// POST /api/auth/invite/generate
inviteRouter.post("/auth/invite/generate", (req: Request, res: Response) => {
  const userId = requireOwner(req, res);
  if (!userId) return;

  try {
    const db = getDb("kokuzo");
    db.exec(`
      CREATE TABLE IF NOT EXISTS invite_tokens (
        token TEXT PRIMARY KEY,
        createdBy TEXT NOT NULL,
        note TEXT,
        usedBy TEXT,
        usedAt TEXT,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const token = crypto.randomBytes(32).toString("hex");
    const note = String((req.body as any)?.note ?? "").slice(0, 100);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(
      "INSERT INTO invite_tokens (token, createdBy, note, expiresAt) VALUES (?, ?, ?, ?)"
    ).run(token, userId, note, expiresAt);

    const url = `https://tenmon-ark.com/pwa/register-local?invite=${token}`;
    console.log(`[INVITE] generated token for owner, expires=${expiresAt}`);

    return res.json({ ok: true, token, url, expiresAt });
  } catch (e: any) {
    console.error("[INVITE] generate error:", e?.message);
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

// GET /api/auth/invite/list
inviteRouter.get("/auth/invite/list", (req: Request, res: Response) => {
  const userId = requireOwner(req, res);
  if (!userId) return;

  try {
    const db = getDb("kokuzo");
    const tokens = db.prepare(
      "SELECT token, note, usedBy, usedAt, expiresAt, createdAt FROM invite_tokens ORDER BY createdAt DESC LIMIT 50"
    ).all() as any[];

    return res.json({ ok: true, tokens });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

// POST /api/auth/invite/revoke
inviteRouter.post("/auth/invite/revoke", (req: Request, res: Response) => {
  const userId = requireOwner(req, res);
  if (!userId) return;

  try {
    const db = getDb("kokuzo");
    const token = String((req.body as any)?.token ?? "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "TOKEN_REQUIRED" });

    db.prepare("DELETE FROM invite_tokens WHERE token = ? AND usedBy IS NULL").run(token);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

// POST /api/auth/invite/validate（登録フローから呼ばれる）
inviteRouter.post("/auth/invite/validate", (req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const token = String((req.body as any)?.token ?? "").trim();
    if (!token) return res.json({ ok: false, valid: false });

    const row = db.prepare(
      "SELECT token, usedBy, expiresAt FROM invite_tokens WHERE token = ? LIMIT 1"
    ).get(token) as any;

    if (!row) return res.json({ ok: true, valid: false, reason: "NOT_FOUND" });
    if (row.usedBy) return res.json({ ok: true, valid: false, reason: "ALREADY_USED" });
    if (row.expiresAt < new Date().toISOString()) {
      return res.json({ ok: true, valid: false, reason: "EXPIRED" });
    }

    return res.json({ ok: true, valid: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});
