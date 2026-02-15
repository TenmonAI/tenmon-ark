import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export const councilRouter = Router();

/**
 * COUNCIL_RUN_DET_V1
 * POST /api/council/run
 * body: { threadId: string, question: string }
 * Deterministic skeleton only (NO external calls).
 */
councilRouter.post("/council/run", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!question) return res.status(400).json({ ok: false, error: "question required" });

    // DET skeleton: Thesis/Antithesis/Synthesis/Judgement
    const out = {
      ok: true,
      schemaVersion: 1,
      kind: "COUNCIL_RUN_DET_V1",
      threadId,
      question,
      createdAt: new Date().toISOString(),
      thesis: "主張（仮）: 目的/範囲/定義を固定し、検証可能な形にする。",
      antithesis: "反論（仮）: 前提が未確定なら、結論を急ぐと誤差が増える。",
      synthesis: "統合（仮）: 前提→観測→最小仮説→検証の順で収束させる。",
      judgement: {
        status: "PROPOSED",
        confidence: 0.5,
        evidenceIds: [],
        rule: "DET-only; no external evidence; stored as proposed.",
      },
      warnings: ["DET_ONLY", "NO_EXTERNAL_CALLS", "NO_EVIDENCE"],
      next: [
        "資料(doc/pdfPage)を指定してGROUNDEDで検証する",
        "必要なら Council を外部API接続する（鍵ありのみ）",
      ],
    };

    return res.json(out);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

/**
 * COUNCIL_COMMIT_PROPOSED_V1
 * POST /api/council/commit
 * body: { threadId: string, payload: object }
 * Store proposal only (never auto-apply).
 */
councilRouter.post("/council/commit", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    const payload = typeof body.payload === "object" && body.payload ? body.payload : null;
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!payload) return res.status(400).json({ ok: false, error: "payload required" });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const id = randomBytes(8).toString("hex");
    const dir = "/var/log/tenmon/council";
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const savedPath = path.join(dir, `council_${ts}_${id}.json`);

    const stored = {
      schemaVersion: 1,
      kind: "COUNCIL_COMMIT_PROPOSED_V1",
      id,
      threadId,
      createdAt: new Date().toISOString(),
      applied: false,
      payload,
    };
    fs.writeFileSync(savedPath, JSON.stringify(stored, null, 2), { encoding: "utf-8" });
    return res.json({ ok: true, schemaVersion: 1, id, savedPath, createdAt: stored.createdAt });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

/**
 * GET /api/council/list
 */
councilRouter.get("/council/list", (_req: Request, res: Response) => {
  try {
    const dir = "/var/log/tenmon/council";
    let items: any[] = [];
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).slice(-50);
        items = files.map((f) => ({ file: f, path: path.join(dir, f) }));
      }
    } catch {}
    return res.json({ ok: true, schemaVersion: 1, itemsCount: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
