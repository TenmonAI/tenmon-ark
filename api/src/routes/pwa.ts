import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";

export const pwaRouter = Router();

function dataDir(): string {
  return process.env.TENMON_DATA_DIR || "/opt/tenmon-ark-data";
}
function dbPathKokuzo(): string {
  return `${dataDir()}/kokuzo.sqlite`;
}

/**
 * GET /api/pwa/export
 * 最小: thread一覧 + messages一覧（テーブルが無い環境でも落ちない）
 */
pwaRouter.get("/pwa/export", (_req: Request, res: Response) => {
  const out: any = { ok: true, exportedAt: new Date().toISOString(), data: {} as any };

  let db: Database.Database | null = null;
  try {
    db = new Database(dbPathKokuzo(), { readonly: true });

    // 可能なものだけ抜く（存在しないテーブルはスキップ）
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);

    if (tables.includes("kokuzo_messages")) {
      out.data.messages = db.prepare("SELECT * FROM kokuzo_messages ORDER BY id DESC LIMIT 2000").all();
    } else {
      out.data.messages = [];
    }

    if (tables.includes("kokuzo_threads")) {
      out.data.threads = db.prepare("SELECT * FROM kokuzo_threads ORDER BY id DESC LIMIT 200").all();
    } else {
      out.data.threads = [];
    }

    // 最小でも schemaVersion は返す（将来互換の軸）
    out.schemaVersion = 1;

    return res.json(out);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  } finally {
    try { db?.close(); } catch {}
  }
});

/**
 * POST /api/pwa/import
 * 最小: 受け取って検証するだけ（DB書き込みは次カード）
 */
pwaRouter.post("/pwa/import", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const schemaVersion = typeof body.schemaVersion === "number" ? body.schemaVersion : 1;
  const data = body.data ?? {};
  const threadsCount = Array.isArray(data.threads) ? data.threads.length : 0;
  const messagesCount = Array.isArray(data.messages) ? data.messages.length : 0;

  return res.json({
    ok: true,
    schemaVersion,
    received: { threadsCount, messagesCount },
    note: "import stub: DB write will be implemented in next card",
  });
});
