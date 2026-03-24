/**
 * PARENT_06: 管理者専用遠隔投入（一般 chat と混ぜない）
 * POST /api/admin/remote-intake/submit — approval gate 必須・high risk は自動実行しない
 */
import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import {
  guardRemoteAdminIntakePayload,
  type RemoteAdminIntakeKind,
} from "../founder/remoteAdminGuardV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminRemoteIntakeRouter = Router();

const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");
const QUEUE_PATH =
  process.env.TENMON_REMOTE_ADMIN_QUEUE_PATH || path.join(AUTOMATION_DIR, "remote_admin_queue.json");
const GATE_PATH =
  process.env.TENMON_APPROVAL_GATE_RESULT_PATH || path.join(AUTOMATION_DIR, "approval_gate_result.json");
const PLAN_PATH = path.join(AUTOMATION_DIR, "feature_autobuild_plan.json");
const VPS_MARKER = "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_VPS_V1";
const VPS_MARKER_PATH = path.join(AUTOMATION_DIR, VPS_MARKER);

function founderKey(): string {
  return process.env.FOUNDER_KEY || "CHANGE_ME_FOUNDER_KEY";
}

function requireFounder(req: Request, res: Response, next: () => void) {
  const cookieOk = (req as any).cookies?.tenmon_founder === "1";
  const headerKey = String(req.headers["x-founder-key"] ?? "").trim();
  if (cookieOk || (headerKey && headerKey === founderKey())) return next();
  return res.status(403).json({ ok: false, error: "FOUNDER_REQUIRED", detail: "login founder or X-Founder-Key" });
}

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

type QueueItem = {
  id: string;
  kind: RemoteAdminIntakeKind;
  title: string | null;
  payload: Record<string, unknown>;
  submitted_at: string;
  source: string;
  state: "approval_required" | "ready" | "rejected";
  risk_tier: "low" | "medium" | "high";
  dry_run_only: boolean;
  reject_reasons: string[];
  matched_rules: string[];
  approved_at: string | null;
  /** high risk は false 固定（自動実行しない） */
  auto_execution_allowed: boolean;
};

type QueueFile = {
  version: number;
  card: string;
  updatedAt: string;
  items: QueueItem[];
};

function readQueue(): QueueFile {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      return {
        version: 1,
        card: "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_CURSOR_AUTO_V1",
        updatedAt: utcIso(),
        items: [],
      };
    }
    const raw = fs.readFileSync(QUEUE_PATH, "utf-8");
    const j = JSON.parse(raw) as QueueFile;
    if (!Array.isArray(j.items)) j.items = [];
    return j;
  } catch {
    return {
      version: 1,
      card: "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_CURSOR_AUTO_V1",
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

function writeGateResult(body: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(GATE_PATH), { recursive: true });
  fs.writeFileSync(GATE_PATH, JSON.stringify(body, null, 2) + "\n", "utf-8");
}

function touchVpsMarker() {
  try {
    fs.writeFileSync(VPS_MARKER_PATH, `${VPS_MARKER}\n${utcIso()}\n`, "utf-8");
  } catch {
    /* ignore */
  }
}

function maxRiskTier(slices: { guard: { risk_tier: string } }[]): "low" | "medium" | "high" {
  if (slices.some((s) => s.guard.risk_tier === "high")) return "high";
  if (slices.some((s) => s.guard.risk_tier === "medium")) return "medium";
  return "low";
}

function mergeMatched(slices: { guard: { matched_rules: string[] } }[]): string[] {
  const s = new Set<string>();
  for (const x of slices) for (const m of x.guard.matched_rules) s.add(m);
  return [...s];
}

/** POST 遠隔投入 */
adminRemoteIntakeRouter.post("/admin/remote-intake/submit", requireFounder, (req: Request, res: Response) => {
  touchVpsMarker();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const gate = guardRemoteAdminIntakePayload(body);
  const intakeId = randomBytes(8).toString("hex");
  const source = String(body.source ?? "remote_dashboard").trim() || "remote_dashboard";
  const title = body.title != null ? String(body.title).trim() : null;
  const kind = String(body.kind ?? "").trim() as RemoteAdminIntakeKind;

  const gateRecord = {
    version: 1,
    card: "TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_CURSOR_AUTO_V1",
    generatedAt: utcIso(),
    intake_id: intakeId,
    kind,
    ok: gate.ok && !gate.rejected,
    rejected: gate.rejected,
    any_high_risk: gate.any_high_risk,
    slices: gate.slices.map((s) => ({
      index: s.index,
      card_name: s.card_name,
      risk_tier: s.guard.risk_tier,
      dry_run_only: s.guard.dry_run_only,
      rejected: s.guard.rejected,
      reject_reasons: s.guard.reject_reasons,
      matched_rules: s.guard.matched_rules,
    })),
    policy: {
      approval_gate_required: true,
      high_risk_never_auto_execute: true,
    },
  };
  writeGateResult(gateRecord);

  if (!gate.ok || gate.rejected) {
    const q = readQueue();
    const item: QueueItem = {
      id: intakeId,
      kind,
      title,
      payload: body,
      submitted_at: utcIso(),
      source,
      state: "rejected",
      risk_tier: maxRiskTier(gate.slices),
      dry_run_only: true,
      reject_reasons: [...gate.reject_reasons, ...gate.slices.flatMap((s) => s.guard.reject_reasons)],
      matched_rules: mergeMatched(gate.slices),
      approved_at: null,
      auto_execution_allowed: false,
    };
    q.items.push(item);
    writeQueue(q);
    return res.status(409).json({ ok: false, error: "GATE_REJECTED", intake_id: intakeId, gate: gateRecord });
  }

  const forceApprove = Boolean(body.force_approve) && !gate.any_high_risk;
  const tier = maxRiskTier(gate.slices);
  const dry_run_only = tier === "high" || gate.slices.some((s) => s.guard.dry_run_only);
  const state: QueueItem["state"] = forceApprove ? "ready" : "approval_required";

  const item: QueueItem = {
    id: intakeId,
    kind,
    title,
    payload: body,
    submitted_at: utcIso(),
    source,
    state,
    risk_tier: tier,
    dry_run_only,
    reject_reasons: [],
    matched_rules: mergeMatched(gate.slices),
    approved_at: forceApprove ? utcIso() : null,
    auto_execution_allowed: tier !== "high",
  };

  const q = readQueue();
  q.items.push(item);
  writeQueue(q);

  if (kind === "feature_spec_card") {
    try {
      const py = path.join(AUTOMATION_DIR, "feature_autobuild_orchestrator_v1.py");
      if (fs.existsSync(py)) {
        execFileSync(
          process.env.TENMON_PYTHON || "python3",
          [py, "--intake-id", intakeId],
          { cwd: AUTOMATION_DIR, timeout: 25_000, encoding: "utf-8" },
        );
      }
    } catch (e) {
      console.error("[remote-intake] feature_autobuild_orchestrator failed:", e);
    }
  }

  return res.json({
    ok: true,
    intake_id: intakeId,
    item,
    paths: { queue: QUEUE_PATH, gate: GATE_PATH, plan: PLAN_PATH },
    note:
      state === "approval_required"
        ? "承認後に ready。high risk は dry_run のみ・自動ビルド実行不可"
        : "ready（即取得可・ただし high risk は実行系から除外）",
  });
});

/** GET キュー */
adminRemoteIntakeRouter.get("/admin/remote-intake/queue", requireFounder, (_req: Request, res: Response) => {
  touchVpsMarker();
  const q = readQueue();
  const summary = {
    approval_required: q.items.filter((i) => i.state === "approval_required").length,
    ready: q.items.filter((i) => i.state === "ready").length,
    rejected: q.items.filter((i) => i.state === "rejected").length,
  };
  return res.json({ ok: true, summary, items: q.items.slice(-100), paths: { queue: QUEUE_PATH, gate: GATE_PATH } });
});

/** POST 承認 */
adminRemoteIntakeRouter.post("/admin/remote-intake/approve", requireFounder, (req: Request, res: Response) => {
  const id = String((req.body ?? {}).id ?? "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "id required" });
  const q = readQueue();
  const it = q.items.find((x) => x.id === id);
  if (!it) return res.status(404).json({ ok: false, error: "not found" });
  if (it.state === "rejected") return res.status(409).json({ ok: false, error: "already rejected" });
  const g = guardRemoteAdminIntakePayload(it.payload);
  if (!g.ok || g.rejected) {
    it.state = "rejected";
    it.reject_reasons = g.reject_reasons;
    writeQueue(q);
    return res.status(409).json({ ok: false, error: "GATE_REJECTED_ON_APPROVE", item: it });
  }
  it.state = "ready";
  it.approved_at = utcIso();
  it.auto_execution_allowed = it.risk_tier !== "high";
  writeQueue(q);
  touchVpsMarker();
  return res.json({ ok: true, item: it });
});

/** 最小ダッシュボード */
adminRemoteIntakeRouter.get("/admin/remote-intake/dashboard", requireFounder, (_req: Request, res: Response) => {
  res.type("html").send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Remote Admin Intake (PARENT_06)</title>
<style>
body{font-family:system-ui,sans-serif;background:#0b0f14;color:#e8eef7;margin:0;padding:16px;max-width:920px}
h1{font-size:18px} label{display:block;margin:8px 0 4px;color:#9fb0c7;font-size:13px}
input,textarea,select{width:100%;box-sizing:border-box;background:#111824;border:1px solid #223044;color:#e8eef7;border-radius:8px;padding:10px}
textarea{min-height:200px;font-family:ui-monospace,monospace;font-size:12px}
button{margin-top:12px;padding:10px 14px;border-radius:8px;border:1px solid #223044;background:#1c2a3c;color:#e8eef7;cursor:pointer}
pre{background:#111824;border:1px solid #223044;padding:12px;border-radius:8px;overflow:auto;font-size:11px}
.muted{color:#9fb0c7;font-size:12px}
</style></head><body>
<h1>PARENT_06 — Remote Admin Intake</h1>
<p class="muted">管理者専用。承認ゲート必須。高リスクは自動実行しません。</p>
<form id="f">
<label>kind</label>
<select name="kind" id="kind">
<option value="cursor_autobuild_card">cursor_autobuild_card</option>
<option value="retry_card">retry_card</option>
<option value="maintenance_card">maintenance_card</option>
<option value="feature_spec_card" selected>feature_spec_card</option>
<option value="multi_card_campaign">multi_card_campaign</option>
</select>
<label>title（任意）</label><input name="title" placeholder="キャンペーン名など"/>
<div id="single">
<label>card_name（単一カード系）</label><input name="card_name" placeholder="TENMON_..._CURSOR_AUTO_V1"/>
<label>card_body_md または intent_text</label><textarea name="body" placeholder="Markdown または feature 意図"></textarea>
</div>
<div id="multi" style="display:none">
<label>cards JSON（multi_card_campaign）</label><textarea name="cards_json" placeholder='[{"card_name":"...","card_body_md":"..."}]'></textarea>
</div>
<label><input type="checkbox" name="force"/> force_approve（high リスク以外で即 ready）</label>
<button type="submit">投入</button>
</form>
<pre id="out"></pre>
<script>
const kind = document.getElementById("kind");
const single = document.getElementById("single");
const multi = document.getElementById("multi");
kind.onchange = () => {
  const m = kind.value === "multi_card_campaign";
  single.style.display = m ? "none" : "block";
  multi.style.display = m ? "block" : "none";
};
kind.onchange();
document.getElementById("f").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const k = fd.get("kind");
  let body;
  if (k === "multi_card_campaign") {
    let cards;
    try { cards = JSON.parse(fd.get("cards_json") || "[]"); } catch (err) {
      document.getElementById("out").textContent = "cards JSON parse error";
      return;
    }
    body = { kind: k, title: fd.get("title") || null, cards, source: "dashboard", force_approve: fd.get("force") === "on" };
  } else if (k === "feature_spec_card") {
    body = {
      kind: k,
      title: fd.get("title") || null,
      intent_text: fd.get("body"),
      source: "dashboard",
      force_approve: fd.get("force") === "on"
    };
  } else {
    body = {
      kind: k,
      title: fd.get("title") || null,
      card: { card_name: fd.get("card_name"), card_body_md: fd.get("body") },
      source: "dashboard",
      force_approve: fd.get("force") === "on"
    };
  }
  const r = await fetch("/api/admin/remote-intake/submit", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body: JSON.stringify(body)});
  document.getElementById("out").textContent = await r.text();
};
fetch("/api/admin/remote-intake/queue",{credentials:"include"}).then(r=>r.json()).then(j=>{
  document.getElementById("out").textContent = JSON.stringify(j,null,2);
});
</script>
</body></html>`);
});
