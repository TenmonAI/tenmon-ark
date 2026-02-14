import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { randomUUID } from "crypto";

export const writerCommitRouter = Router();

function s(v: unknown): string { return typeof v === "string" ? v : ""; }

writerCommitRouter.post("/writer/commit", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = s(body.threadId).trim();
    const runIdIn = s(body.runId).trim() || null;

    if (!threadId && !runIdIn) {
      return res.status(400).json({ ok: false, error: "threadId or runId required" });
    }

    const db = getDb("kokuzo");

    // 1) pick runId
    let runId = runIdIn;
    if (!runId) {
      const run = db.prepare(
        `SELECT id FROM writer_runs WHERE threadId=? ORDER BY createdAt DESC LIMIT 1`
      ).get(threadId) as any;
      if (!run?.id) return res.status(404).json({ ok: false, error: "writer run not found" });
      runId = String(run.id);
    }

    // 2) gather artifacts
    const artifacts = db.prepare(
      `SELECT kind, content, proofJson, createdAt FROM writer_artifacts WHERE runId=? ORDER BY createdAt ASC`
    ).all(runId) as any[];

    if (!artifacts.length) return res.status(404).json({ ok: false, error: "no artifacts for run" });

    // 3) build seed content (minimal: concat)
    const content = artifacts.map((a) => `## ${String(a.kind ?? "ART")}\n${String(a.content ?? "")}`).join("\n\n").slice(0, 20000);

    // 4) insert into kokuzo_seeds (compat mode)
    // existing table has NOT NULL essence. We'll set:
    // - essence = short title
    // - ruleset = JSON text (optional)
    const seedId = `WRITER:${threadId || runId}:${Date.now()}`;
    const rowId = randomUUID();
    const title = body.title ? s(body.title).trim() : "WRITER_COMMIT";
    const kind = body.kind ? s(body.kind).trim() : "WRITER_RUN";
    const evidenceIds = "[]";

    const ruleset = JSON.stringify({
      source: "writer_commit",
      threadId: threadId || null,
      runId,
      artifactsCount: artifacts.length,
    });

    // NOTE: keep legacy columns compatible (doc/pdfPage likely exist; we leave them NULL)
    db.prepare(
      `INSERT INTO kokuzo_seeds(
        id, essence, ruleset, seedId, threadId, kind, title, content, evidenceIds, createdAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )`
    ).run(rowId, title, ruleset, seedId, threadId || null, kind, title, content, evidenceIds);

    return res.json({ ok: true, seedId, runId, artifactsCount: artifacts.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
