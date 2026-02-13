import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const pwaRouter = Router();

type PwaThread = { threadId: string; title?: string; updatedAt?: string };
type PwaMessage = { threadId: string; role: string; content: string; createdAt?: string };

function s(v: unknown): string { return typeof v === "string" ? v : ""; }

pwaRouter.get("/pwa/export", (_req: Request, res: Response) => {
  const db = getDb("kokuzo");

  const threads = db.prepare(
    `SELECT threadId, title, updatedAt
     FROM pwa_threads
     ORDER BY COALESCE(updatedAt,'') DESC`
  ).all();

  const messages = db.prepare(
    `SELECT threadId, role, content, createdAt
     FROM pwa_messages
     ORDER BY id ASC`
  ).all();

  return res.json({
    ok: true,
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { threads, messages },
  });
});

pwaRouter.post("/pwa/import", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const data = body.data ?? {};
  const threads: PwaThread[] = Array.isArray(data.threads) ? data.threads : [];
  const messages: PwaMessage[] = Array.isArray(data.messages) ? data.messages : [];

  const db = getDb("kokuzo");

  // upsert threads
  const upsertThread = db.prepare(`
    INSERT INTO pwa_threads(threadId, title, updatedAt)
    VALUES (?1, ?2, ?3)
    ON CONFLICT(threadId) DO UPDATE SET
      title=excluded.title,
      updatedAt=excluded.updatedAt
  `);

  // insert messages（P1は追記のみ）
  const insertMsg = db.prepare(`
    INSERT INTO pwa_messages(threadId, role, content, createdAt)
    VALUES (?1, ?2, ?3, ?4)
  `);

  // transaction
  db.exec("BEGIN");
  try {
    for (const t of threads) {
      const threadId = s(t?.threadId).trim();
      if (!threadId) continue;
      const title = t?.title != null ? s(t.title) : null;
      const updatedAt = t?.updatedAt ? s(t.updatedAt) : new Date().toISOString();
      upsertThread.run(threadId, title, updatedAt);
    }

    for (const m of messages) {
      const threadId = s(m?.threadId).trim();
      const role = s(m?.role).trim();
      const content = s(m?.content);
      if (!threadId || !role || !content) continue;
      const createdAt = m?.createdAt ? s(m.createdAt) : new Date().toISOString();
      insertMsg.run(threadId, role, content, createdAt);
    }

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return res.json({
    ok: true,
    schemaVersion: typeof body.schemaVersion === "number" ? body.schemaVersion : 1,
    received: {
      threadsCount: threads.length,
      messagesCount: messages.length,
    },
  });
});
