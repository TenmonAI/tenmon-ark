import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export const selfImproveRouter = Router();

const BASE_DIR = "/var/log/tenmon/fix_candidates";

function ensureDir() {
  try {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  } catch {}
}

function safeJsonParse(s: string): any | null {
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * GET /api/self/improve/list
 * Returns latest N proposals (metadata only)
 */
selfImproveRouter.get("/self/improve/list", (_req: Request, res: Response) => {
  ensureDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(BASE_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => path.join(BASE_DIR, f));
  } catch {
    files = [];
  }

  const items = files
    .map(fp => {
      try {
        const st = fs.statSync(fp);
        return { file: path.basename(fp), mtimeMs: st.mtimeMs, size: st.size };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as any[];

  items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return res.json({ ok: true, count: items.length, items: items.slice(0, 50) });
});

/**
 * GET /api/self/improve/get?file=...
 * Returns one proposal file content (read-only)
 */
selfImproveRouter.get("/self/improve/get", (req: Request, res: Response) => {
  ensureDir();
  const file = String(req.query.file ?? "").trim();
  if (!file || !/^[A-Za-z0-9._-]+\.json$/.test(file)) {
    return res.status(400).json({ ok: false, error: "invalid file" });
  }
  const fp = path.join(BASE_DIR, file);
  if (!fp.startsWith(BASE_DIR)) {
    return res.status(400).json({ ok: false, error: "invalid path" });
  }
  if (!fs.existsSync(fp)) {
    return res.status(404).json({ ok: false, error: "not found" });
  }
  const raw = fs.readFileSync(fp, "utf-8");
  const parsed = safeJsonParse(raw);
  return res.json({ ok: true, file, proposal: parsed ?? raw });
});

/**
 * POST /api/self/improve/propose
 * Body: { source: string, summary: string, candidates?: any[] }
 * Saves a proposal file. DOES NOT APPLY ANYTHING.
 */
selfImproveRouter.post("/self/improve/propose", (req: Request, res: Response) => {
  ensureDir();
  const body = (req.body ?? {}) as any;
  const source = String(body.source ?? "").trim() || "unknown";
  const summary = String(body.summary ?? "").trim();
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];

  if (!summary) {
    return res.status(400).json({ ok: false, error: "summary required" });
  }

  const id = randomBytes(8).toString("hex");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${ts}__${id}.json`;
  const fp = path.join(BASE_DIR, file);

  const proposal = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source,
    summary,
    candidates,
    policy: {
      appliesAutomatically: false,
      requiresHumanCard: true,
      requiresAcceptancePass: true,
    },
  };

  fs.writeFileSync(fp, JSON.stringify(proposal, null, 2), "utf-8");
  return res.json({ ok: true, file, savedPath: fp });
});
