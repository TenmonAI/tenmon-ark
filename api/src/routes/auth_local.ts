import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { getDb } from "../db/index.js";
import { sendMail } from "../lib/mailer.js";

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

/** SHA-256 hash of token (for DB storage — never store raw token) */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
      expiresAt TEXT NOT NULL,
      createdAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_userId
      ON auth_sessions(userId);
  `);
  try {
    db.exec("ALTER TABLE auth_sessions ADD COLUMN createdAt TEXT");
  } catch {
    // column may already exist
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_approved_emails (
      email TEXT PRIMARY KEY,
      approvedAt TEXT NOT NULL
    );
  `);

  /* ── パスワードリセットトークン ── */
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      tokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      usedAt TEXT,
      createdAt TEXT NOT NULL,
      requesterIp TEXT,
      userAgent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_prt_userId ON password_reset_tokens(userId);
    CREATE INDEX IF NOT EXISTS idx_prt_tokenHash ON password_reset_tokens(tokenHash);
  `);

  /* ── パスワード変更監査ログ ── */
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_change_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      actionType TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      ip TEXT,
      userAgent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pca_userId ON password_change_audit(userId);
  `);

  return db;
}


function isLocalLikeRequest(req: any): boolean {
  const host = String(req?.headers?.host ?? "").toLowerCase();
  const xfproto = String(req?.headers?.["x-forwarded-proto"] ?? "").toLowerCase();
  return (
    host.includes("127.0.0.1") ||
    host.includes("localhost") ||
    xfproto == "http"
  );
}

function setSessionCookie(req: any, res: any, sessionId: string) {
  const isProd = String(process.env.NODE_ENV || "") === "production";
  const secure = isProd && !isLocalLikeRequest(req);
  res.cookie("auth_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

/** Rate limit map: email -> last request timestamp */
const forgotRateLimit = new Map<string, number>();
const FORGOT_COOLDOWN_MS = 60_000; // 1分

/* ── 既存: register ── */
authLocalRouter.post("/auth/local/register", (req, res) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const password = String((req.body as any)?.password ?? "");
    const passwordConfirm = String((req.body as any)?.password_confirm ?? "");
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "BAD_EMAIL" });
    if (password.length < 8) return res.status(400).json({ ok: false, error: "WEAK_PASSWORD" });
    if (!passwordConfirm) return res.status(400).json({ ok: false, error: "PASSWORD_CONFIRM_REQUIRED" });
    if (password !== passwordConfirm) return res.status(400).json({ ok: false, error: "PASSWORD_MISMATCH" });

    const db = ensureTables();
    const exists = db.prepare(`SELECT email FROM auth_local_accounts WHERE email = ? LIMIT 1`).get(email) as any;
    if (exists) return res.status(409).json({ ok: false, error: "EMAIL_EXISTS" });

    const userId = newId("user");
    const { saltHex, hashHex } = hashPassword(password);
    const now = nowIso();
    const sessionId = newId("sess");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    db.exec("BEGIN");
    try {
      db.prepare(`INSERT INTO auth_users (userId, email) VALUES (?, ?)`).run(userId, email);
      db.prepare(`
        INSERT INTO auth_local_accounts (email, userId, passwordSalt, passwordHash, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(email, userId, saltHex, hashHex, now, now);
      db.prepare(`INSERT OR IGNORE INTO auth_approved_emails (email, approvedAt) VALUES (?, ?)`).run(email, now);
      db.prepare(`INSERT INTO auth_sessions (sessionId, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`).run(sessionId, userId, expiresAt, now);
      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch {}
      throw e;
    }

    setSessionCookie(req, res, sessionId);
    let nextPath = String((req.body as any)?.next ?? "/pwa/").trim();
    if (!nextPath.startsWith("/")) nextPath = "/pwa/";
    return res.json({ ok: true, user: { id: userId, email }, next: nextPath || "/pwa/" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "REGISTER_FAILED", detail: String(e?.message || e || "") });
  }
});

/* ── 既存: login ── */
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

    setSessionCookie(req, res, sessionId);
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

/* ── 既存: logout ── */
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

/* ================================================================
 * 新規API: POST /auth/forgot-password
 * パスワード再設定リクエスト
 * ================================================================ */
authLocalRouter.post("/auth/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    if (!email || !email.includes("@")) {
      // セキュリティ: 同型レスポンスを返す
      return res.json({ ok: true, message: "ご案内を送信しました" });
    }

    // Rate limit
    const lastReq = forgotRateLimit.get(email) || 0;
    if (Date.now() - lastReq < FORGOT_COOLDOWN_MS) {
      return res.json({ ok: true, message: "ご案内を送信しました" });
    }
    forgotRateLimit.set(email, Date.now());

    const db = ensureTables();
    const account = db.prepare(`
      SELECT email, userId FROM auth_local_accounts WHERE email = ? LIMIT 1
    `).get(email) as any;

    // ユーザーが存在しなくても同型レスポンス
    if (!account) {
      console.log(`[AUTH] forgot-password: email not found (silent) email=${email}`);
      return res.json({ ok: true, message: "ご案内を送信しました" });
    }

    // トークン生成（48バイト = 96文字hex）
    const rawToken = randomBytes(48).toString("hex");
    const tokenH = hashToken(rawToken);
    const tokenId = newId("prt");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60分
    const now = nowIso();
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
    const ua = String(req.headers["user-agent"] || "");

    // 既存の未使用トークンを無効化
    db.prepare(`UPDATE password_reset_tokens SET usedAt = ? WHERE userId = ? AND usedAt IS NULL`)
      .run(now, String(account.userId));

    // 新トークン保存
    db.prepare(`
      INSERT INTO password_reset_tokens (id, userId, tokenHash, expiresAt, usedAt, createdAt, requesterIp, userAgent)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
    `).run(tokenId, String(account.userId), tokenH, expiresAt, now, ip, ua);

    // リセットURL構築
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const resetUrl = `${proto}://${host}/pwa/reset-password?token=${rawToken}`;

    // メール送信（nodemailer SMTP / Resend / console fallback）
    const emailText = [
      "TENMON-ARK をご利用いただきありがとうございます。",
      "",
      "パスワード再設定をご希望の場合は、以下のリンクからお手続きください。",
      "",
      resetUrl,
      "",
      "このリンクの有効期限は60分です。",
      "心当たりがない場合は、このメールを破棄してください。",
      "",
      "— TENMON-ARK",
    ].join("\n");

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f1f1f;">TENMON-ARK パスワード再設定</h2>
        <p>TENMON-ARK をご利用いただきありがとうございます。</p>
        <p>パスワード再設定をご希望の場合は、以下のボタンからお手続きください。</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #b8860b; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">パスワードを再設定する</a>
        </p>
        <p style="font-size: 13px; color: #666;">このリンクの有効期限は60分です。</p>
        <p style="font-size: 13px; color: #666;">心当たりがない場合は、このメールを破棄してください。</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">— TENMON-ARK</p>
      </div>
    `;

    const mailResult = await sendMail({
      to: String(account.email),
      subject: "TENMON-ARK パスワード再設定のご案内",
      text: emailText,
      html: emailHtml,
    });

    // メール送信キューにも保存（バックアップ兼監査用）
    const fs = await import("fs");
    const path = await import("path");
    const queueDir = path.join(process.cwd(), "data", "email_queue");
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(queueDir, `${tokenId}.json`),
      JSON.stringify({
        to: String(account.email),
        subject: "TENMON-ARK パスワード再設定のご案内",
        body: emailText,
        createdAt: now,
        tokenId,
        mailSent: mailResult.ok,
        mailTransport: mailResult.transport,
        mailMessageId: mailResult.messageId,
        mailError: mailResult.error,
      }, null, 2),
      "utf-8"
    );

    // 監査ログ
    db.prepare(`
      INSERT INTO password_change_audit (userId, actionType, createdAt, ip, userAgent)
      VALUES (?, 'RESET_REQUESTED', ?, ?, ?)
    `).run(String(account.userId), now, ip, ua);

    console.log(`[AUTH] forgot-password: token created userId=${account.userId} tokenId=${tokenId} mailSent=${mailResult.ok} transport=${mailResult.transport}`);

    return res.json({ ok: true, message: "ご案内を送信しました" });
  } catch (e: any) {
    console.error(`[AUTH] forgot-password error:`, e?.message);
    return res.json({ ok: true, message: "ご案内を送信しました" });
  }
});

/* ================================================================
 * 新規API: POST /auth/reset-password
 * トークンで新パスワードを設定
 * ================================================================ */
authLocalRouter.post("/auth/reset-password", (req, res) => {
  try {
    const token = String((req.body as any)?.token ?? "").trim();
    const password = String((req.body as any)?.password ?? "");
    const passwordConfirm = String((req.body as any)?.password_confirm ?? password);

    if (!token) return res.status(400).json({ ok: false, error: "TOKEN_REQUIRED" });
    if (password.length < 8) return res.status(400).json({ ok: false, error: "WEAK_PASSWORD", message: "パスワードは8文字以上で入力してください" });
    if (password !== passwordConfirm) return res.status(400).json({ ok: false, error: "PASSWORD_MISMATCH", message: "パスワードが一致しません" });

    const db = ensureTables();
    const tokenH = hashToken(token);
    const now = nowIso();

    const row = db.prepare(`
      SELECT id, userId, expiresAt, usedAt
      FROM password_reset_tokens
      WHERE tokenHash = ?
      LIMIT 1
    `).get(tokenH) as any;

    if (!row) {
      return res.status(400).json({ ok: false, error: "INVALID_TOKEN", message: "無効なリンクです。再度パスワード再設定をお申し込みください。" });
    }
    if (row.usedAt) {
      return res.status(400).json({ ok: false, error: "TOKEN_USED", message: "このリンクは既に使用されています。再度パスワード再設定をお申し込みください。" });
    }
    if (String(row.expiresAt) < now) {
      return res.status(400).json({ ok: false, error: "TOKEN_EXPIRED", message: "リンクの有効期限が切れています。再度パスワード再設定をお申し込みください。" });
    }

    const { saltHex, hashHex } = hashPassword(password);
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
    const ua = String(req.headers["user-agent"] || "");

    db.exec("BEGIN");
    try {
      // パスワード更新
      db.prepare(`
        UPDATE auth_local_accounts SET passwordSalt = ?, passwordHash = ?, updatedAt = ?
        WHERE userId = ?
      `).run(saltHex, hashHex, now, String(row.userId));

      // トークン無効化
      db.prepare(`UPDATE password_reset_tokens SET usedAt = ? WHERE id = ?`)
        .run(now, String(row.id));

      // 既存セッション失効
      db.prepare(`DELETE FROM auth_sessions WHERE userId = ?`).run(String(row.userId));

      // 監査ログ
      db.prepare(`
        INSERT INTO password_change_audit (userId, actionType, createdAt, ip, userAgent)
        VALUES (?, 'RESET_COMPLETED', ?, ?, ?)
      `).run(String(row.userId), now, ip, ua);

      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch {}
      throw e;
    }

    console.log(`[AUTH] reset-password: success userId=${row.userId}`);
    return res.json({ ok: true, message: "パスワードを更新しました。ログイン画面からログインしてください。" });
  } catch (e: any) {
    console.error(`[AUTH] reset-password error:`, e?.message);
    return res.status(500).json({ ok: false, error: "RESET_FAILED", message: "パスワードの更新に失敗しました。もう一度お試しください。" });
  }
});

/* ================================================================
 * 新規API: POST /auth/change-password
 * ログイン後のパスワード変更
 * ================================================================ */
authLocalRouter.post("/auth/change-password", (req, res) => {
  try {
    const currentPassword = String((req.body as any)?.currentPassword ?? "");
    const newPassword = String((req.body as any)?.newPassword ?? "");
    const newPasswordConfirm = String((req.body as any)?.newPasswordConfirm ?? newPassword);

    if (!currentPassword) return res.status(400).json({ ok: false, error: "CURRENT_PASSWORD_REQUIRED", message: "現在のパスワードを入力してください" });
    if (newPassword.length < 8) return res.status(400).json({ ok: false, error: "WEAK_PASSWORD", message: "新しいパスワードは8文字以上で入力してください" });
    if (newPassword !== newPasswordConfirm) return res.status(400).json({ ok: false, error: "PASSWORD_MISMATCH", message: "新しいパスワードが一致しません" });

    const db = ensureTables();

    // セッションからユーザー特定
    const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
    if (!sessionId) return res.status(401).json({ ok: false, error: "NOT_AUTHENTICATED", message: "ログインが必要です" });

    const sess = db.prepare(`
      SELECT sessionId, userId, expiresAt FROM auth_sessions WHERE sessionId = ? LIMIT 1
    `).get(sessionId) as any;

    if (!sess || !sess.userId) return res.status(401).json({ ok: false, error: "NOT_AUTHENTICATED", message: "ログインが必要です" });
    if (sess.expiresAt && String(sess.expiresAt) < new Date().toISOString()) {
      return res.status(401).json({ ok: false, error: "SESSION_EXPIRED", message: "セッションが期限切れです。再度ログインしてください。" });
    }

    // 現在のパスワード照合
    const account = db.prepare(`
      SELECT email, userId, passwordSalt, passwordHash
      FROM auth_local_accounts
      WHERE userId = ?
      LIMIT 1
    `).get(String(sess.userId)) as any;

    if (!account) return res.status(404).json({ ok: false, error: "ACCOUNT_NOT_FOUND", message: "アカウントが見つかりません" });

    if (!verifyPassword(currentPassword, String(account.passwordSalt), String(account.passwordHash))) {
      return res.status(400).json({ ok: false, error: "WRONG_CURRENT_PASSWORD", message: "現在のパスワードが正しくありません" });
    }

    const { saltHex, hashHex } = hashPassword(newPassword);
    const now = nowIso();
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
    const ua = String(req.headers["user-agent"] || "");

    db.exec("BEGIN");
    try {
      // パスワード更新
      db.prepare(`
        UPDATE auth_local_accounts SET passwordSalt = ?, passwordHash = ?, updatedAt = ?
        WHERE userId = ?
      `).run(saltHex, hashHex, now, String(account.userId));

      // セッション更新（現在のセッションは維持、他は削除）
      db.prepare(`DELETE FROM auth_sessions WHERE userId = ? AND sessionId != ?`)
        .run(String(account.userId), sessionId);

      // 監査ログ
      db.prepare(`
        INSERT INTO password_change_audit (userId, actionType, createdAt, ip, userAgent)
        VALUES (?, 'PASSWORD_CHANGED', ?, ?, ?)
      `).run(String(account.userId), now, ip, ua);

      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch {}
      throw e;
    }

    console.log(`[AUTH] change-password: success userId=${account.userId}`);
    return res.json({ ok: true, message: "パスワードを変更しました" });
  } catch (e: any) {
    console.error(`[AUTH] change-password error:`, e?.message);
    return res.status(500).json({ ok: false, error: "CHANGE_FAILED", message: "パスワードの変更に失敗しました。もう一度お試しください。" });
  }
});

/* ================================================================
 * 内部API: GET /auth/pending-emails
 * 送信待ちメールキューを取得（Manus等の外部送信用）
 * ================================================================ */
authLocalRouter.get("/auth/pending-emails", (_req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const queueDir = path.join(process.cwd(), "data", "email_queue");
    if (!fs.existsSync(queueDir)) {
      return res.json({ ok: true, emails: [], count: 0 });
    }
    const files = fs.readdirSync(queueDir)
      .filter((f: string) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 20);

    const emails = files.map((f: string) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(queueDir, f), "utf-8"));
      } catch {
        return null;
      }
    }).filter(Boolean);

    return res.json({ ok: true, emails, count: emails.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
