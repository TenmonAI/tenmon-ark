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

// ============================================================
// OWNER_ADMIN_USERS_V1: オーナー専用ユーザー一覧
// ============================================================

/** GET /api/auth/admin/users — オーナーのみ全ユーザー情報を取得 */
inviteRouter.get("/auth/admin/users", (req: Request, res: Response) => {
  const userId = requireOwner(req, res);
  if (!userId) return;

  try {
    const db = getDb("kokuzo");
    // sync テーブルも kokuzo に存在する（syncPhaseA.ts と同じ）
    const pwaDb = db;

    // 全ユーザー取得
    const users = db.prepare(`
      SELECT u.userId, u.email, la.createdAt, la.updatedAt
      FROM auth_users u
      LEFT JOIN auth_local_accounts la ON u.email = la.email
      ORDER BY la.createdAt DESC
    `).all() as Array<{
      userId: string;
      email: string;
      createdAt: string | null;
      updatedAt: string | null;
    }>;

    // 各ユーザーのデバイス数・最終アクセス・同期データ数を取得
    const result = users.map((u) => {
      // デバイス数
      let deviceCount = 0;
      let lastSeenAt: string | null = null;
      try {
        const devices = pwaDb.prepare(
          `SELECT deviceId, lastSeenAt FROM sync_devices WHERE userId = ? ORDER BY lastSeenAt DESC`
        ).all(u.userId) as Array<{ deviceId: string; lastSeenAt: string }>;
        deviceCount = devices.length;
        lastSeenAt = devices.length > 0 ? devices[0].lastSeenAt : null;
      } catch { /* table may not exist yet */ }

      // 同期済みスレッド数
      let threadCount = 0;
      try {
        const tc = pwaDb.prepare(
          `SELECT COUNT(*) as cnt FROM synced_chat_threads WHERE userId = ? AND isDeleted = 0`
        ).get(u.userId) as any;
        threadCount = tc?.cnt ?? 0;
      } catch { /* table may not exist yet */ }

      // 同期済み宿曜鑑定数
      let sukuyouCount = 0;
      try {
        const sc = pwaDb.prepare(
          `SELECT COUNT(*) as cnt FROM synced_sukuyou_rooms WHERE userId = ? AND isDeleted = 0`
        ).get(u.userId) as any;
        sukuyouCount = sc?.cnt ?? 0;
      } catch { /* table may not exist yet */ }

      // 同期済みフォルダ数
      let folderCount = 0;
      try {
        const fc = pwaDb.prepare(
          `SELECT COUNT(*) as cnt FROM synced_chat_folders WHERE userId = ? AND isDeleted = 0`
        ).get(u.userId) as any;
        folderCount = fc?.cnt ?? 0;
      } catch { /* table may not exist yet */ }

      // セッション数（アクティブ）
      let activeSessionCount = 0;
      try {
        const now = new Date().toISOString();
        const sc2 = db.prepare(
          `SELECT COUNT(*) as cnt FROM auth_sessions WHERE userId = ? AND expiresAt > ?`
        ).get(u.userId, now) as any;
        activeSessionCount = sc2?.cnt ?? 0;
      } catch { /* */ }

      return {
        userId: u.userId,
        email: u.email,
        registeredAt: u.createdAt,
        lastPasswordChange: u.updatedAt,
        deviceCount,
        lastSeenAt,
        activeSessionCount,
        threadCount,
        sukuyouCount,
        folderCount,
      };
    });

    return res.json({ ok: true, users: result, total: result.length });
  } catch (e: any) {
    console.error("[ADMIN] users list error:", e);
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});
