/**
 * TENMON_ADMIN_REMOTE_BUILD_DASHBOARD — 管理者専用 Cursor カード投入・ジョブ可視化（一般 chat と分離）
 * POST /api/admin/remote-build/jobs
 * GET  /api/admin/remote-build/jobs
 * GET  /api/admin/remote-build/jobs/:id
 * POST /api/admin/remote-build/jobs/:id/rollback
 * GET  /api/admin/remote-build/dashboard — HTML
 * GET  /api/admin/remote-build/vps-snapshot — manifest + 成果物 JSON 更新
 * POST /api/admin/remote-build/result-ingest — Mac からの結果束（remote_build_result_collector_v1.py）
 * GET  /api/admin/remote-build/final-verdict — seal 裁定 JSON
 * POST /api/admin/remote-build/seal-run — remote_build_seal_governor_v1.py 実行
 */
import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { guardRemoteCursorPayload } from "../founder/remoteCursorGuardV1.js";
import {
  buildRemoteBuildJobManifest,
  REMOTE_BUILD_CARD,
  type RemoteBuildJobRecord,
  type RemoteBuildPriority,
} from "../founder/remoteBuildJobManifestV1.js";
import { requireFounderOrExecutorBearer } from "../founder/executorTokenV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminRemoteBuildRouter = Router();

const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");
const DATA_DIR = process.env.TENMON_REMOTE_BUILD_DATA_DIR || path.join(process.cwd(), "data");
const JOBS_PATH =
  process.env.TENMON_REMOTE_BUILD_JOBS_PATH || path.join(DATA_DIR, "remote_build_jobs.json");
const MANIFEST_PATH =
  process.env.TENMON_REMOTE_BUILD_MANIFEST_PATH || path.join(AUTOMATION_DIR, "remote_build_dashboard_manifest.json");
const OUT_DIR = path.join(AUTOMATION_DIR, "out");
const SUBMIT_RESULT_PATH = path.join(OUT_DIR, "remote_build_job_submit_result.json");
const GUARD_CHECK_EXPORT_PATH = path.join(OUT_DIR, "admin_guard_check.json");
const RESULT_COLLECTOR_PY = path.join(AUTOMATION_DIR, "remote_build_result_collector_v1.py");
const RESULT_COLLECTOR_MARKER = path.join(AUTOMATION_DIR, "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_VPS_V1");
const SEAL_GOVERNOR_PY = path.join(AUTOMATION_DIR, "remote_build_seal_governor_v1.py");
const FINAL_VERDICT_PATH = path.join(OUT_DIR, "remote_build_final_verdict.json");

const VPS_MARKER = "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_VPS_V1";
const VPS_MARKER_PATH = path.join(AUTOMATION_DIR, VPS_MARKER);

const LOG_HINT_DEFAULT =
  process.env.TENMON_REMOTE_BUILD_LOG_HINT ||
  "automation/out/ · seal 実行時は /var/log/tenmon/card_* の run.log を参照";

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

type JobsFile = {
  version: number;
  card: string;
  updatedAt: string;
  items: RemoteBuildJobRecord[];
};

function readJobs(): JobsFile {
  try {
    if (!fs.existsSync(JOBS_PATH)) {
      return {
        version: 1,
        card: REMOTE_BUILD_CARD,
        updatedAt: utcIso(),
        items: [],
      };
    }
    const raw = fs.readFileSync(JOBS_PATH, "utf-8");
    const j = JSON.parse(raw) as JobsFile;
    if (!Array.isArray(j.items)) j.items = [];
    return j;
  } catch {
    return {
      version: 1,
      card: REMOTE_BUILD_CARD,
      updatedAt: utcIso(),
      items: [],
    };
  }
}

function writeJobs(j: JobsFile) {
  j.updatedAt = utcIso();
  fs.mkdirSync(path.dirname(JOBS_PATH), { recursive: true });
  fs.writeFileSync(JOBS_PATH, JSON.stringify(j, null, 2) + "\n", "utf-8");
}

function touchVpsMarker() {
  try {
    fs.writeFileSync(VPS_MARKER_PATH, `${VPS_MARKER}\n${utcIso()}\n`, "utf-8");
  } catch {
    /* ignore */
  }
}

function writeManifestAndArtifacts(j: JobsFile, lastSubmit?: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = {
    version: 1,
    card: REMOTE_BUILD_CARD,
    generatedAt: utcIso(),
    jobsPath: JOBS_PATH,
    summary: {
      total: j.items.length,
      queued: j.items.filter((x) => x.status === "queued").length,
      rejected: j.items.filter((x) => x.status === "rejected").length,
      rollback_requested: j.items.filter((x) => x.status === "rollback_requested").length,
    },
    items: j.items.slice(-200),
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  if (lastSubmit) {
    fs.writeFileSync(SUBMIT_RESULT_PATH, JSON.stringify(lastSubmit, null, 2) + "\n", "utf-8");
  }
}

function parsePriority(x: unknown): RemoteBuildPriority {
  const s = String(x ?? "normal").trim().toLowerCase();
  if (s === "low" || s === "high" || s === "normal") return s;
  return "normal";
}

/** POST ジョブ登録（実行はしない） */
adminRemoteBuildRouter.post("/admin/remote-build/jobs", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  touchVpsMarker();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const cardName = String(body.cardName ?? body.card_name ?? "").trim();
  const cardBodyMd = String(body.cardBodyMd ?? body.card_body_md ?? body.body ?? "").trim();
  const targetScope = String(body.targetScope ?? body.target_scope ?? "").trim().slice(0, 2000);
  const notes = String(body.notes ?? "").trim().slice(0, 4000);
  const priority = parsePriority(body.priority);

  if (!cardName) {
    return res.status(400).json({ ok: false, error: "cardName_required" });
  }
  if (!cardBodyMd) {
    return res.status(400).json({ ok: false, error: "cardBodyMd_required" });
  }

  const guard = guardRemoteCursorPayload(cardName, cardBodyMd);
  const jobId = `rbj_${Date.now()}_${randomBytes(5).toString("hex")}`;
  const createdAt = utcIso();
  const status = guard.rejected ? "rejected" : "queued";

  const record = buildRemoteBuildJobManifest({
    jobId,
    createdAt,
    priority,
    targetScope,
    notes,
    cardName,
    cardBodyMd,
    guard,
    jobsStore: JOBS_PATH,
    manifestPath: MANIFEST_PATH,
    logHint: LOG_HINT_DEFAULT,
    status,
  });

  const q = readJobs();
  q.items.push(record);
  writeJobs(q);

  const submitResult = {
    version: 1,
    card: REMOTE_BUILD_CARD,
    generatedAt: utcIso(),
    ok: !guard.rejected,
    jobId,
    status,
    paths: {
      jobs: JOBS_PATH,
      manifest: MANIFEST_PATH,
      submitResult: SUBMIT_RESULT_PATH,
    },
    job: record,
  };
  writeManifestAndArtifacts(q, submitResult);

  if (guard.rejected) {
    return res.status(409).json(submitResult);
  }
  return res.json(submitResult);
});

/** GET 一覧 */
adminRemoteBuildRouter.get("/admin/remote-build/jobs", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  touchVpsMarker();
  const q = readJobs();
  writeManifestAndArtifacts(q);
  return res.json({
    ok: true,
    paths: { jobs: JOBS_PATH, manifest: MANIFEST_PATH },
    summary: {
      total: q.items.length,
      queued: q.items.filter((x) => x.status === "queued").length,
      rejected: q.items.filter((x) => x.status === "rejected").length,
      rollback_requested: q.items.filter((x) => x.status === "rollback_requested").length,
    },
    items: q.items.slice(-200).reverse(),
  });
});

/** GET 1 件 */
adminRemoteBuildRouter.get("/admin/remote-build/jobs/:id", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const id = String(req.params.id ?? "").trim();
  const q = readJobs();
  const it = q.items.find((x) => x.jobId === id);
  if (!it) return res.status(404).json({ ok: false, error: "not_found" });
  return res.json({ ok: true, job: it });
});

/** POST rollback 指示（状態のみ更新、実行は別工程） */
adminRemoteBuildRouter.post("/admin/remote-build/jobs/:id/rollback", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  touchVpsMarker();
  const id = String(req.params.id ?? "").trim();
  const note = String((req.body as any)?.notes ?? "").trim().slice(0, 2000);
  const q = readJobs();
  const it = q.items.find((x) => x.jobId === id);
  if (!it) return res.status(404).json({ ok: false, error: "not_found" });
  it.status = "rollback_requested";
  it.updatedAt = utcIso();
  it.rollback = { requestedAt: utcIso(), notes: note || "(no notes)" };
  writeJobs(q);
  writeManifestAndArtifacts(q);
  return res.json({ ok: true, job: it });
});

/** VPS 用: manifest + 成果物を再出力（応答に manifest 本文を含む） */
adminRemoteBuildRouter.get("/admin/remote-build/vps-snapshot", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  touchVpsMarker();
  const q = readJobs();
  writeManifestAndArtifacts(q);
  let manifestBody: Record<string, unknown> | null = null;
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      manifestBody = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as Record<string, unknown>;
    }
  } catch {
    manifestBody = null;
  }
  return res.json({
    ok: true,
    card: REMOTE_BUILD_CARD,
    generatedAt: utcIso(),
    manifest: manifestBody,
    paths: {
      manifest: MANIFEST_PATH,
      jobs: JOBS_PATH,
      submitResult: SUBMIT_RESULT_PATH,
      vpsMarker: VPS_MARKER_PATH,
    },
  });
});

/** POST Mac からの結果束取り込み（remote_build_result_collector_v1.py） */
adminRemoteBuildRouter.post("/admin/remote-build/result-ingest", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  touchVpsMarker();
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "body_required" });
  }
  const tmp = path.join(OUT_DIR, `incoming_result_${Date.now()}.json`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(body, null, 2) + "\n", "utf-8");
  const repoRoot = path.join(__dirname, "..", "..");
  try {
    const out = execFileSync(process.env.TENMON_PYTHON || "python3", [RESULT_COLLECTOR_PY, "--ingest-file", tmp], {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: 120_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const parsed = JSON.parse(out.trim()) as Record<string, unknown>;
    try {
      fs.writeFileSync(RESULT_COLLECTOR_MARKER, `TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1\n${utcIso()}\n`, "utf-8");
    } catch {
      /* ignore */
    }
    writeManifestAndArtifacts(readJobs());
    return res.json({ ok: true, collector: parsed });
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; message?: string };
    const detail = (err.stderr?.toString() || err.message || String(e)).slice(0, 4000);
    return res.status(500).json({ ok: false, error: "collector_failed", detail });
  }
});

/** GET seal 裁定（remote_build_final_verdict.json） */
adminRemoteBuildRouter.get("/admin/remote-build/final-verdict", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  touchVpsMarker();
  if (!fs.existsSync(FINAL_VERDICT_PATH)) {
    return res.status(404).json({ ok: false, error: "final_verdict_not_found", path: FINAL_VERDICT_PATH });
  }
  try {
    const j = JSON.parse(fs.readFileSync(FINAL_VERDICT_PATH, "utf-8")) as Record<string, unknown>;
    return res.json({ ok: true, verdict: j, path: FINAL_VERDICT_PATH });
  } catch {
    return res.status(500).json({ ok: false, error: "read_failed", path: FINAL_VERDICT_PATH });
  }
});

/** POST seal governor 再実行 */
adminRemoteBuildRouter.post("/admin/remote-build/seal-run", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  touchVpsMarker();
  const repoRoot = path.join(__dirname, "..", "..");
  try {
    execFileSync(process.env.TENMON_PYTHON || "python3", [SEAL_GOVERNOR_PY], {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: 120_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!fs.existsSync(FINAL_VERDICT_PATH)) {
      return res.status(500).json({ ok: false, error: "verdict_not_written" });
    }
    const j = JSON.parse(fs.readFileSync(FINAL_VERDICT_PATH, "utf-8")) as Record<string, unknown>;
    return res.json({ ok: true, verdict: j, path: FINAL_VERDICT_PATH });
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; message?: string };
    const detail = (err.stderr?.toString() || err.message || String(e)).slice(0, 4000);
    return res.status(500).json({ ok: false, error: "seal_governor_failed", detail });
  }
});

/** ガード検査のみ（カード投入前の dry-check） */
adminRemoteBuildRouter.post("/admin/remote-build/guard-check", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const cardName = String(body.cardName ?? "").trim();
  const cardBodyMd = String(body.cardBodyMd ?? body.body ?? "").trim();
  if (!cardName) return res.status(400).json({ ok: false, error: "cardName_required" });
  const guard = guardRemoteCursorPayload(cardName, cardBodyMd);
  const payload = {
    version: 1,
    card: REMOTE_BUILD_CARD,
    generatedAt: utcIso(),
    ok: !guard.rejected,
    cardName,
    guard,
  };
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(GUARD_CHECK_EXPORT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  } catch {
    /* ignore */
  }
  return res.json(payload);
});

/** 最小ダッシュボード（管理者 cookie / X-Founder-Key） */
adminRemoteBuildRouter.get("/admin/remote-build/dashboard", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  touchVpsMarker();
  res.type("html").send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Remote Build Dashboard</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0e12;color:#e6edf3;margin:0;padding:14px;max-width:960px}
h1{font-size:18px} h2{font-size:15px;margin-top:20px;color:#9fb0c7}
label{display:block;margin:8px 0 4px;color:#9fb0c7;font-size:13px}
input,textarea,select{width:100%;box-sizing:border-box;background:#111722;border:1px solid #223044;color:#e6edf3;border-radius:8px;padding:10px;font-size:14px}
textarea{min-height:180px;font-family:ui-monospace,monospace;font-size:12px}
button{padding:10px 14px;border-radius:8px;border:1px solid #2a3f5c;background:#1a2f4a;color:#e6edf3;cursor:pointer;margin-top:10px}
pre{background:#111722;border:1px solid #223044;padding:10px;border-radius:8px;overflow:auto;font-size:11px;max-height:320px}
.muted{color:#9fb0c7;font-size:12px}
.job{border-bottom:1px solid #223044;padding:10px 0;font-size:13px}
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;margin-right:6px}
.st-queued{background:#1a3d2a;color:#8fd9a8}
.st-rejected{background:#3d1a1a;color:#f0a8a8}
.st-rb{background:#3d351a;color:#f0e0a8}
a{color:#7ab8ff}
</style></head><body>
<h1>TENMON — Remote Build Dashboard</h1>
<p class="muted">管理者専用。一般チャットとは別経路。ジョブはキューに登録のみ（自動実行なし）。</p>

<h2>カード投入</h2>
<form id="form">
<label>cardName</label>
<input name="cardName" required placeholder="TENMON_..._CURSOR_AUTO_V1"/>
<label>cardBodyMd（Cursor カード本文）</label>
<textarea name="cardBodyMd" required placeholder="Markdown"></textarea>
<label>priority</label>
<select name="priority"><option value="low">low</option><option value="normal" selected>normal</option><option value="high">high</option></select>
<label>target scope（編集対象の範囲・パス目安）</label>
<input name="targetScope" placeholder="例: api/src/routes/foo.ts, api/docs/..."/>
<label>notes</label>
<input name="notes" placeholder="任意メモ"/>
<button type="submit">キューに投入</button>
</form>
<pre id="submitOut" class="muted">—</pre>

<h2>Seal / Final verdict</h2>
<p class="muted">remote_build_seal_governor_v1 — sealed / rollback_needed / retry_possible / blocked</p>
<button type="button" id="loadVerdict">verdict を読込</button>
<button type="button" id="runSeal">Seal 裁定を再実行</button>
<pre id="verdictOut" class="muted">—</pre>

<h2>投入履歴（最新）</h2>
<button type="button" id="reload">再読込</button>
<div id="list"></div>
<pre id="raw" class="muted" style="display:none"></pre>

<script>
async function loadList() {
  const r = await fetch("/api/admin/remote-build/jobs", { credentials: "include" });
  const j = await r.json();
  const el = document.getElementById("list");
  el.innerHTML = "";
  (j.items || []).slice(0, 40).forEach((it) => {
    const d = document.createElement("div");
    d.className = "job";
    const st = it.status;
    const cls = st === "queued" ? "st-queued" : st === "rejected" ? "st-rejected" : "st-rb";
    d.innerHTML = '<span class="badge ' + cls + '">' + st + '</span> <strong>' + (it.cardName || "") + "</strong><br/>" +
      "<span class=muted>" + (it.jobId || "") + " · " + (it.createdAt || "") + "</span><br/>" +
      "scope: " + (it.targetScope || "—") + " · priority: " + (it.priority || "") + "<br/>" +
      '<a href="#" data-rb="' + it.jobId + '">rollback 指示</a> · log: ' + (it.paths && it.paths.logHint ? it.paths.logHint : "—");
    el.appendChild(d);
  });
  document.getElementById("list").onclick = async (e) => {
    const a = e.target.closest("a[data-rb]");
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute("data-rb");
    if (!confirm("rollback_requested を付与しますか？")) return;
    const r2 = await fetch("/api/admin/remote-build/jobs/" + encodeURIComponent(id) + "/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ notes: "dashboard" })
    });
    document.getElementById("submitOut").textContent = await r2.text();
    loadList();
  };
}
document.getElementById("form").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    cardName: fd.get("cardName"),
    cardBodyMd: fd.get("cardBodyMd"),
    priority: fd.get("priority"),
    targetScope: fd.get("targetScope") || "",
    notes: fd.get("notes") || ""
  };
  const r = await fetch("/api/admin/remote-build/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  const t = await r.text();
  document.getElementById("submitOut").textContent = t;
  loadList();
};
document.getElementById("reload").onclick = () => loadList();
document.getElementById("loadVerdict").onclick = async () => {
  const r = await fetch("/api/admin/remote-build/final-verdict", { credentials: "include" });
  document.getElementById("verdictOut").textContent = await r.text();
};
document.getElementById("runSeal").onclick = async () => {
  const r = await fetch("/api/admin/remote-build/seal-run", { method: "POST", credentials: "include" });
  document.getElementById("verdictOut").textContent = await r.text();
};
loadList();
</script>
</body></html>`);
});
