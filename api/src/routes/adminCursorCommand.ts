import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { guardRemoteCursorPayload } from "../founder/remoteCursorGuardV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminCursorCommandRouter = Router();

const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");
const QUEUE_PATH = process.env.TENMON_REMOTE_CURSOR_QUEUE_PATH || path.join(AUTOMATION_DIR, "remote_cursor_queue.json");

function founderKey(): string {
  return process.env.FOUNDER_KEY || "CHANGE_ME_FOUNDER_KEY";
}

function requireFounder(req: Request, res: Response, next: () => void) {
  const cookieOk = (req as any).cookies?.tenmon_founder === "1";
  const headerKey = String(req.headers["x-founder-key"] ?? "").trim();
  if (cookieOk || (headerKey && headerKey === founderKey())) return next();
  return res.status(403).json({ ok: false, error: "FOUNDER_REQUIRED", detail: "login founder or X-Founder-Key" });
}

type QueueItem = {
  id: string;
  card_name: string;
  card_body_md: string;
  source: string;
  submitted_at: string;
  /** delivered = Mac/エージェントが next で取得済み（リース中）。executed = 結果回収完了 */
  state: "approval_required" | "ready" | "rejected" | "delivered" | "executed";
  risk_tier: string;
  dry_run_only: boolean;
  reject_reasons: string[];
  matched_rules: string[];
  approved_at: string | null;
  leased_until: string | null;
  completed_at: string | null;
};

function normalizeQueueState(raw: string): QueueItem["state"] {
  if (raw === "in_progress") return "delivered";
  if (raw === "done") return "executed";
  const ok = new Set([
    "approval_required",
    "ready",
    "rejected",
    "delivered",
    "executed",
  ]);
  return ok.has(raw as QueueItem["state"]) ? (raw as QueueItem["state"]) : "ready";
}

type QueueFile = {
  version: number;
  card: string;
  updatedAt: string;
  items: QueueItem[];
};

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readQueue(): QueueFile {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      return {
        version: 1,
        card: "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1",
        updatedAt: utcIso(),
        items: [],
      };
    }
    const raw = fs.readFileSync(QUEUE_PATH, "utf-8");
    const j = JSON.parse(raw) as QueueFile;
    if (!Array.isArray(j.items)) j.items = [];
    for (const it of j.items) {
      it.state = normalizeQueueState(String(it.state ?? "ready"));
    }
    return j;
  } catch {
    return {
      version: 1,
      card: "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1",
      updatedAt: utcIso(),
      items: [],
    };
  }
}

function writeQueue(q: QueueFile) {
  q.updatedAt = utcIso();
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n", "utf-8");
}

/** GET queue summary（管理者） */
adminCursorCommandRouter.get("/admin/cursor/queue", requireFounder, (_req: Request, res: Response) => {
  const q = readQueue();
  const summary = {
    approval_required: q.items.filter((i) => i.state === "approval_required").length,
    ready: q.items.filter((i) => i.state === "ready").length,
    rejected: q.items.filter((i) => i.state === "rejected").length,
    delivered: q.items.filter((i) => i.state === "delivered").length,
    executed: q.items.filter((i) => i.state === "executed").length,
  };
  return res.json({ ok: true, summary, items: q.items.slice(-80), path: QUEUE_PATH });
});

/** POST カード投入 — 承認ゲート必須（既定 approval_required） */
adminCursorCommandRouter.post("/admin/cursor/submit", requireFounder, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const card_name = String(body.card_name ?? "").trim();
  const card_body_md = String(body.card_body_md ?? body.body ?? "").trim();
  const source = String(body.source ?? "dashboard").trim() || "dashboard";

  if (!card_name) {
    return res.status(400).json({ ok: false, error: "card_name required" });
  }

  const g = guardRemoteCursorPayload(card_name, card_body_md);
  if (g.rejected) {
    const q = readQueue();
    const id = randomBytes(8).toString("hex");
    const item: QueueItem = {
      id,
      card_name,
      card_body_md,
      source,
      submitted_at: utcIso(),
      state: "rejected",
      risk_tier: g.risk_tier,
      dry_run_only: true,
      reject_reasons: g.reject_reasons,
      matched_rules: g.matched_rules,
      approved_at: null,
      leased_until: null,
      completed_at: null,
    };
    q.items.push(item);
    writeQueue(q);
    return res.status(409).json({
      ok: false,
      error: "GUARD_REJECTED",
      item,
    });
  }

  const forceApprove = Boolean(body.force_approve) && g.risk_tier !== "high";
  const state: QueueItem["state"] = forceApprove ? "ready" : "approval_required";

  const q = readQueue();
  const id = randomBytes(8).toString("hex");
  const item: QueueItem = {
    id,
    card_name,
    card_body_md,
    source,
    submitted_at: utcIso(),
    state,
    risk_tier: g.risk_tier,
    dry_run_only: g.dry_run_only,
    reject_reasons: [],
    matched_rules: g.matched_rules,
    approved_at: forceApprove ? utcIso() : null,
    leased_until: null,
    completed_at: null,
  };
  q.items.push(item);
  writeQueue(q);

  return res.json({
    ok: true,
    item,
    note: state === "approval_required" ? "承認後に Mac エージェントが取得可能" : "ready（即取得可）",
  });
});

/** POST 承認 → ready */
adminCursorCommandRouter.post("/admin/cursor/approve", requireFounder, (req: Request, res: Response) => {
  const id = String((req.body ?? {}).id ?? "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "id required" });
  const q = readQueue();
  const it = q.items.find((x) => x.id === id);
  if (!it) return res.status(404).json({ ok: false, error: "not found" });
  if (it.state === "rejected") return res.status(409).json({ ok: false, error: "already rejected" });
  const g = guardRemoteCursorPayload(it.card_name, it.card_body_md);
  if (g.rejected) {
    it.state = "rejected";
    it.reject_reasons = g.reject_reasons;
    writeQueue(q);
    return res.status(409).json({ ok: false, error: "GUARD_REJECTED_ON_APPROVE", item: it });
  }
  it.state = "ready";
  it.approved_at = utcIso();
  writeQueue(q);
  return res.json({ ok: true, item: it });
});

/** POST 却下 */
adminCursorCommandRouter.post("/admin/cursor/reject", requireFounder, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const id = String(body.id ?? "").trim();
  const reason = String(body.reason ?? "").trim() || "manual_reject";
  if (!id) return res.status(400).json({ ok: false, error: "id required" });
  const q = readQueue();
  const it = q.items.find((x) => x.id === id);
  if (!it) return res.status(404).json({ ok: false, error: "not found" });
  it.state = "rejected";
  it.reject_reasons = [...it.reject_reasons, `manual:${reason}`];
  writeQueue(q);
  return res.json({ ok: true, item: it });
});

/** GET エージェント pull: 次の ready をリース */
adminCursorCommandRouter.get("/admin/cursor/next", requireFounder, (req: Request, res: Response) => {
  const dryOnly = String(req.query.dry_run_only ?? "") === "1";
  const q = readQueue();
  const now = Date.now();
  for (const it of q.items) {
    if (it.state !== "ready") continue;
    if (dryOnly && !it.dry_run_only) continue;
    if (!dryOnly && it.dry_run_only) continue;
    const lease = it.leased_until ? Date.parse(it.leased_until) : 0;
    if (lease > now) continue;
    it.state = "delivered";
    it.leased_until = new Date(now + 15 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    writeQueue(q);
    return res.json({
      ok: true,
      item: {
        id: it.id,
        card_name: it.card_name,
        card_body_md: it.card_body_md,
        dry_run_only: it.dry_run_only,
        risk_tier: it.risk_tier,
        leased_until: it.leased_until,
      },
    });
  }
  return res.json({ ok: true, item: null, message: "no ready items" });
});

/** POST リース解放（失敗時に ready に戻す） */
adminCursorCommandRouter.post("/admin/cursor/release", requireFounder, (req: Request, res: Response) => {
  const id = String((req.body ?? {}).id ?? "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "id required" });
  const q = readQueue();
  const it = q.items.find((x) => x.id === id);
  if (!it) return res.status(404).json({ ok: false, error: "not found" });
  if (it.state === "delivered") {
    it.state = "ready";
    it.leased_until = null;
    writeQueue(q);
  }
  return res.json({ ok: true, item: it });
});

/** 簡易ダッシュボード HTML（管理者 cookie または手動で founderKey を入力） */
adminCursorCommandRouter.get("/admin/cursor/dashboard", requireFounder, (_req: Request, res: Response) => {
  res.type("html").send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Remote Cursor Command Center</title>
<style>
body{font-family:system-ui,sans-serif;background:#0b0f14;color:#e8eef7;margin:0;padding:16px;max-width:900px}
h1{font-size:18px} label{display:block;margin:8px 0 4px;color:#9fb0c7;font-size:13px}
input,textarea{width:100%;box-sizing:border-box;background:#111824;border:1px solid #223044;color:#e8eef7;border-radius:8px;padding:10px}
textarea{min-height:180px;font-family:ui-monospace,monospace;font-size:12px}
button{margin-top:12px;padding:10px 14px;border-radius:8px;border:1px solid #223044;background:#1c2a3c;color:#e8eef7;cursor:pointer}
pre{background:#111824;border:1px solid #223044;padding:12px;border-radius:8px;overflow:auto;font-size:11px}
.muted{color:#9fb0c7;font-size:12px}
</style></head><body>
<h1>TENMON Remote Cursor Command Center</h1>
<p class="muted">管理者専用。投入は承認後に ready。高リスクは dry-run のみエージェント取得可（?dry_run_only=1）。</p>
<form id="f">
<label>CARD_NAME</label><input name="card_name" placeholder="TENMON_..._CURSOR_AUTO_V1" required/>
<label>本文 (Markdown)</label><textarea name="card_body_md" placeholder="OBJECTIVE / EDIT_SCOPE ..."></textarea>
<label><input type="checkbox" name="force"/> force_approve（high 以外で即 ready）</label>
<button type="submit">投入</button>
</form>
<pre id="out"></pre>
<script>
document.getElementById("f").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    card_name: fd.get("card_name"),
    card_body_md: fd.get("card_body_md"),
    source: "dashboard",
    force_approve: fd.get("force") === "on"
  };
  const r = await fetch("/api/admin/cursor/submit", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body: JSON.stringify(body)});
  document.getElementById("out").textContent = await r.text();
};
fetch("/api/admin/cursor/queue",{credentials:"include"}).then(r=>r.json()).then(j=>{
  document.getElementById("out").textContent = JSON.stringify(j,null,2);
});
</script>
</body></html>`);
});
