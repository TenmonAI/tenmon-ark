import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "../db/index.js";

export const allowlistRouter = Router();

const SECRET = () => String(process.env.ALLOWLIST_PUSH_SECRET || "").trim();

const CANCEL_WORDS = ["キャンセル", "cancel", "解約", "退会", "returned"];

function nowIso(): string {
  return new Date().toISOString();
}

function verifySignature(ts: string, body: string, sig: string): boolean {
  const secret = SECRET();
  if (!secret) return false;
  const msg = `${ts}\n${body}`;
  const expectedHex = crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
  const sigTrim = String(sig).trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(sigTrim) || sigTrim.length !== expectedHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigTrim, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

function ensureAllowlistTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      userId TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS auth_approved_emails (
      email TEXT PRIMARY KEY,
      approvedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS member_status (
      email TEXT PRIMARY KEY,
      name TEXT,
      tier TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      paidAt TEXT,
      cancelledAt TEXT,
      syncedAt TEXT NOT NULL DEFAULT (datetime('now')),
      source TEXT DEFAULT 'spreadsheet'
    );
  `);
  try {
    const cols = db.prepare("PRAGMA table_info(member_status)").all() as { name: string }[];
    const names = cols.map((c) => String(c.name));
    if (cols.length && !names.includes("tier")) {
      db.prepare("ALTER TABLE member_status ADD COLUMN tier TEXT NOT NULL DEFAULT 'member'").run();
    }
  } catch {
    // ignore
  }
}

allowlistRouter.post("/allowlist/push", (req: Request, res: Response) => {
  try {
    if (!SECRET()) {
      return res.status(503).json({ ok: false, error: "ALLOWLIST_PUSH_SECRET_NOT_CONFIGURED" });
    }

    const ts = String(req.headers["x-tenmon-ts"] ?? "");
    const sig = String(req.headers["x-tenmon-sig"] ?? "");
    const bodyRaw = req.body;
    const body = typeof bodyRaw === "string" ? bodyRaw : String(bodyRaw ?? "");

    const tsNum = Number.parseInt(ts, 10);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 300) {
      return res.status(401).json({ ok: false, error: "TIMESTAMP_EXPIRED" });
    }

    if (!verifySignature(ts, body, sig)) {
      return res.status(401).json({ ok: false, error: "INVALID_SIGNATURE" });
    }

    const lines = body.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ ok: false, error: "NO_DATA" });
    }

    const db = getDb("kokuzo");
    ensureAllowlistTables(db);

    const syncedAt = nowIso();
    let approved = 0;
    let cancelled = 0;
    let skipped = 0;

    const insApproved = db.prepare(
      `INSERT OR IGNORE INTO auth_approved_emails (email, approvedAt) VALUES (?, ?)`
    );
    const delApproved = db.prepare(`DELETE FROM auth_approved_emails WHERE email = ?`);
    const selUser = db.prepare(`SELECT userId FROM auth_users WHERE email = ? LIMIT 1`);
    const upsertActive = db.prepare(`
      INSERT INTO member_status (email, name, tier, status, paidAt, cancelledAt, syncedAt, source)
      VALUES (?, NULL, ?, 'active', NULL, NULL, ?, 'allowlist')
      ON CONFLICT(email) DO UPDATE SET
        tier = excluded.tier,
        status = 'active',
        cancelledAt = NULL,
        syncedAt = excluded.syncedAt,
        source = excluded.source
    `);
    const upsertCancelled = db.prepare(`
      INSERT INTO member_status (email, name, tier, status, paidAt, cancelledAt, syncedAt, source)
      VALUES (?, NULL, ?, 'cancelled', NULL, ?, ?, 'allowlist')
      ON CONFLICT(email) DO UPDATE SET
        tier = excluded.tier,
        status = 'cancelled',
        cancelledAt = excluded.cancelledAt,
        syncedAt = excluded.syncedAt,
        source = excluded.source
    `);

    db.exec("BEGIN");
    try {
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        const email = String(parts[0] || "").trim().toLowerCase();
        const tier = String(parts[1] || "member").trim() || "member";
        if (!email || !email.includes("@")) {
          skipped += 1;
          continue;
        }

        const isCancelled = CANCEL_WORDS.some((w) => tier.toLowerCase().includes(w.toLowerCase()));

        if (isCancelled) {
          const existingUser = selUser.get(email) as { userId?: string } | undefined;
          if (!existingUser) {
            delApproved.run(email);
          } else {
            skipped += 1;
          }
          upsertCancelled.run(email, tier, syncedAt, syncedAt);
          cancelled += 1;
        } else {
          const ins = insApproved.run(email, syncedAt) as { changes?: number };
          if (Number(ins?.changes ?? 0) > 0) approved += 1;
          else skipped += 1;
          upsertActive.run(email, tier, syncedAt);
        }
      }
      db.exec("COMMIT");
    } catch (e) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // ignore
      }
      throw e;
    }

    console.log(`[ALLOWLIST] push: approved=${approved} cancelled=${cancelled} skipped=${skipped}`);
    return res.json({ ok: true, approved, cancelled, skipped });
  } catch (e: any) {
    console.error("[ALLOWLIST] error:", e?.message);
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});
