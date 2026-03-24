import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { guardTouchedFiles } from "../founder/remoteCursorGuardV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminCursorResultRouter = Router();

const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");
const QUEUE_PATH = process.env.TENMON_REMOTE_CURSOR_QUEUE_PATH || path.join(AUTOMATION_DIR, "remote_cursor_queue.json");
const BUNDLE_PATH =
  process.env.TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH || path.join(AUTOMATION_DIR, "remote_cursor_result_bundle.json");

function founderKey(): string {
  return process.env.FOUNDER_KEY || "CHANGE_ME_FOUNDER_KEY";
}

function requireFounder(req: Request, res: Response, next: () => void) {
  const cookieOk = (req as any).cookies?.tenmon_founder === "1";
  const headerKey = String(req.headers["x-founder-key"] ?? "").trim();
  if (cookieOk || (headerKey && headerKey === founderKey())) return next();
  return res.status(403).json({ ok: false, error: "FOUNDER_REQUIRED" });
}

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

type BundleFile = { version: number; card: string; updatedAt: string; entries: any[] };

function readBundle(): BundleFile {
  try {
    if (!fs.existsSync(BUNDLE_PATH)) {
      return {
        version: 1,
        card: "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1",
        updatedAt: utcIso(),
        entries: [],
      };
    }
    const j = JSON.parse(fs.readFileSync(BUNDLE_PATH, "utf-8")) as BundleFile;
    if (!Array.isArray(j.entries)) j.entries = [];
    return j;
  } catch {
    return { version: 1, card: "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1", updatedAt: utcIso(), entries: [] };
  }
}

function writeBundle(b: BundleFile) {
  b.updatedAt = utcIso();
  fs.mkdirSync(path.dirname(BUNDLE_PATH), { recursive: true });
  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(b, null, 2) + "\n", "utf-8");
}

function normalizeItemState(raw: string): string {
  if (raw === "in_progress") return "delivered";
  if (raw === "done") return "executed";
  return raw;
}

function readQueue(): any {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return { items: [] };
    const q = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
    for (const it of q.items || []) {
      it.state = normalizeItemState(String(it.state ?? "ready"));
    }
    return q;
  } catch {
    return { items: [] };
  }
}

function writeQueue(q: any) {
  q.updatedAt = utcIso();
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n", "utf-8");
}

/** POST 結果回収 */
adminCursorResultRouter.post("/admin/cursor/result", requireFounder, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const queue_id = String(body.queue_id ?? body.id ?? "").trim();
  if (!queue_id) return res.status(400).json({ ok: false, error: "queue_id required" });

  const touched_files = Array.isArray(body.touched_files) ? body.touched_files.map((x: any) => String(x)) : [];
  const fileGuard = guardTouchedFiles(touched_files);

  const entry = {
    schema_version: 1,
    queue_id,
    ingested_at: utcIso(),
    touched_files,
    file_guard_ok: fileGuard.ok,
    file_guard_blocked: fileGuard.blocked,
    build_result: { rc: body.build_rc != null ? Number(body.build_rc) : null },
    build_rc: body.build_rc != null ? Number(body.build_rc) : null,
    acceptance_result: { ok: body.acceptance_ok != null ? Boolean(body.acceptance_ok) : null },
    acceptance_ok: body.acceptance_ok != null ? Boolean(body.acceptance_ok) : null,
    next_card: body.next_card != null ? String(body.next_card) : null,
    log_snippet: body.log_snippet != null ? String(body.log_snippet).slice(0, 8000) : "",
    dry_run: Boolean(body.dry_run),
  };

  const bundle = readBundle();
  bundle.entries.push(entry);
  if (bundle.entries.length > 200) bundle.entries = bundle.entries.slice(-200);
  writeBundle(bundle);

  const q = readQueue();
  const it = (q.items || []).find((x: any) => x.id === queue_id);
  if (it && (it.state === "delivered" || it.state === "in_progress")) {
    const buildOk = entry.build_rc == null || Number(entry.build_rc) === 0;
    const acceptOk = entry.acceptance_ok !== false;
    if (fileGuard.ok && buildOk && acceptOk) {
      it.state = "executed";
      it.completed_at = utcIso();
      it.leased_until = null;
    } else {
      it.state = "ready";
      it.leased_until = null;
    }
    writeQueue(q);
  }

  const status = fileGuard.ok ? "accepted" : "blocked_paths";
  return res.json({
    ok: fileGuard.ok,
    status,
    entry,
    queue_item: it ?? null,
  });
});

/** GET バンドル参照 */
adminCursorResultRouter.get("/admin/cursor/result/bundle", requireFounder, (_req: Request, res: Response) => {
  const b = readBundle();
  return res.json({ ok: true, bundle: b, path: BUNDLE_PATH });
});
