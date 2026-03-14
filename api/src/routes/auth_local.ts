import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "../db/index.js";

export const authLocalRouter = Router();

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function hashPassword(password: string, saltHex?: string): { saltHex: string; hashHex: string } {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return { saltHex: salt.toString("hex"), hashHex: hash.toString("hex") };
}

function verifyPassword(password: string, saltHex: string, expectedHashHex: string): boolean {
  const got = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
  const exp = Buffer.from(expectedHashHex, "hex");
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

function ensureTables() {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      userId TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS auth_local_accounts (
      email TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_local_accounts_userId
      ON auth_local_accounts(userId);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      sessionId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_userId
      ON auth_sessions(userId);

    CREATE TABLE IF NOT EXISTS auth_approved_emails (
      email TEXT PRIMARY KEY,
      approvedAt TEXT NOT NULL
    );
  `);
  return db;
}

function setSessionCookie(res: any, sessionId: string) {
  const isProd = String(process.env.NODE_ENV || "") === "production";
  res.cookie("auth_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

authLocalRouter.post("/auth/local/register", (req, res) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const password = String((req.body as any)?.password ?? "");
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "BAD_EMAIL" });
    if (password.length < 8) return res.status(400).json({ ok: false, error: "WEAK_PASSWORD" });

    const db = ensureTables();
    const exists = db.prepare(`SELECT email FROM auth_local_accounts WHERE email = ? LIMIT 1`).get(email) as any;
    if (exists) return res.status(409).json({ ok: false, error: "EMAIL_EXISTS" });

    const userId = newId("user");
    const { saltHex, hashHex } = hashPassword(password);
    const now = nowIso();

    db.exec("BEGIN");
    try {
      db.prepare(`INSERT INTO auth_users (userId, email) VALUES (?, ?)`).run(userId, email);
      db.prepare(`
        INSERT INTO auth_local_accounts (email, userId, passwordSalt, passwordHash, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(email, userId, saltHex, hashHex, now, now);
      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch {}
      throw e;
    }

    return res.json({ ok: true, user: { id: userId, email }, needApproval: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "REGISTER_FAILED", detail: String(e?.message || e || "") });
  }
});

authLocalRouter.post("/auth/local/login", (req, res) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const password = String((req.body as any)?.password ?? "");
    if (!email || !password) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const db = ensureTables();
    const row = db.prepare(`
      SELECT email, userId, passwordSalt, passwordHash
      FROM auth_local_accounts
      WHERE email = ?
      LIMIT 1
    `).get(email) as any;

    if (!row) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    if (!verifyPassword(password, String(row.passwordSalt), String(row.passwordHash))) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const approved = db.prepare(`
      SELECT email FROM auth_approved_emails WHERE email = ? LIMIT 1
    `).get(String(row.email)) as any;

    if (!approved) return res.status(403).json({ ok: false, error: "NOT_APPROVED" });

    const sessionId = newId("sess");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    db.exec("BEGIN");
    try {
      db.prepare(`DELETE FROM auth_sessions WHERE userId = ?`).run(String(row.userId));
      db.prepare(`INSERT INTO auth_sessions (sessionId, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`)
        .run(sessionId, String(row.userId), expiresAt, nowIso());
      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch {}
      throw e;
    }

    setSessionCookie(res, sessionId);
    return res.json({
      ok: true,
      authenticated: true,
      founder: false,
      user: { id: String(row.userId), email: String(row.email) },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "LOGIN_FAILED", detail: String(e?.message || e || "") });
  }
});

authLocalRouter.post("/auth/local/logout", (req, res) => {
  const isProd = String(process.env.NODE_ENV || "") === "production";

  try {
    const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
    if (sessionId) {
      const db = ensureTables();
      db.prepare(`DELETE FROM auth_sessions WHERE sessionId = ?`).run(sessionId);
    }
  } catch {
    // ignore DB cleanup errors; logout should still proceed
  }

  res.clearCookie("auth_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
  res.clearCookie("tenmon_founder", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });

  return res.json({ ok: true });
});
