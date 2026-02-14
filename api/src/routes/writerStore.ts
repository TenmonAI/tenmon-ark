import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { randomUUID } from "crypto";

export const writerStoreRouter = Router();

function s(v: unknown): string { return typeof v === "string" ? v : ""; }
function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : (typeof v === "string" && v.trim() ? Number(v) : NaN);
  return Number.isFinite(x) ? x : null;
}

// POST /api/writer/run/upsert
writerStoreRouter.post("/writer/run/upsert", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = s(body.threadId).trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    const mode = s(body.mode).trim() || null;
    const title = s(body.title).trim() || null;
    const targetChars = n(body.targetChars);
    const tolerancePct = n(body.tolerancePct);

    const db = getDb("kokuzo");

    const found = db.prepare(
      `SELECT id FROM writer_runs WHERE threadId=? ORDER BY createdAt DESC LIMIT 1`
    ).get(threadId) as any;

    if (found?.id) {
      return res.json({ ok: true, runId: String(found.id) });
    }

    const runId = randomUUID();
    db.prepare(
      `INSERT INTO writer_runs(id, threadId, mode, title, targetChars, tolerancePct)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(runId, threadId, mode, title, targetChars, tolerancePct);

    return res.json({ ok: true, runId });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/writer/artifact/append
writerStoreRouter.post("/writer/artifact/append", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const runId = s(body.runId).trim();
    const kind = s(body.kind).trim();
    const content = s(body.content);
    const proof = body.proof ?? {};

    if (!runId) return res.status(400).json({ ok: false, error: "runId required" });
    if (!kind) return res.status(400).json({ ok: false, error: "kind required" });
    if (!content) return res.status(400).json({ ok: false, error: "content required" });

    const db = getDb("kokuzo");
    const exists = db.prepare(`SELECT id FROM writer_runs WHERE id=? LIMIT 1`).get(runId) as any;
    if (!exists?.id) return res.status(404).json({ ok: false, error: "runId not found" });

    const artifactId = randomUUID();
    db.prepare(
      `INSERT INTO writer_artifacts(id, runId, kind, content, proofJson)
       VALUES (?, ?, ?, ?, ?)`
    ).run(artifactId, runId, kind, content, JSON.stringify(proof));

    return res.json({ ok: true, artifactId });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// GET /api/writer/run/latest?threadId=...
writerStoreRouter.get("/writer/run/latest", (req: Request, res: Response) => {
  try {
    const threadId = s(req.query.threadId).trim();
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });

    const db = getDb("kokuzo");
    const run = db.prepare(
      `SELECT * FROM writer_runs WHERE threadId=? ORDER BY createdAt DESC LIMIT 1`
    ).get(threadId) as any;

    if (!run?.id) return res.json({ ok: true, run: null, artifacts: [] });

    const artifacts = db.prepare(
      `SELECT * FROM writer_artifacts WHERE runId=? ORDER BY createdAt ASC`
    ).all(String(run.id)) as any[];

    return res.json({ ok: true, run, artifacts });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
