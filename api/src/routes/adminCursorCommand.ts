import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { guardRemoteCursorPayload } from "../founder/remoteCursorGuardV1.js";
import { requireFounderOrExecutorBearer } from "../founder/executorTokenV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminCursorCommandRouter = Router();

const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");
const QUEUE_PATH = process.env.TENMON_REMOTE_CURSOR_QUEUE_PATH || path.join(AUTOMATION_DIR, "remote_cursor_queue.json");

/** TENMON_CURSOR_EXECUTION_CONTRACT_V1 — next manifest / result で追跡可能にする最小契約 */
export type CursorExecutionContractV1 = {
  schema: "TENMON_CURSOR_EXECUTION_CONTRACT_V1";
  command_id: string;
  card_id: string;
  risk_level: string;
  apply_mode: "dry_run" | "patch_apply" | "observe_only";
  expected_files: string[];
  expected_acceptance: {
    npm_run_check?: boolean;
    probe_ok?: boolean;
    notes?: string;
  };
};

/** 役割分離（orchestration 憲法・machine-readable） */
export const CURSOR_ORCHESTRATION_ROLES_V1 = {
  gpt_ai: "next_card_reasoning_patch_plan_generation",
  browser: "external_ui_observe_and_submit_execution_result_only",
  cursor: "code_apply_file_edits_single_card",
  vps: "build_check_audit_probe",
  pdca_parent: "flow_control_next_card_only_after_result_ingested",
} as const;

export type QueueItem = {
  id: string;
  card_name: string;
  /** キュー投入ブリッジ等が `cursor_card` のみ載せる場合あり（manifest の cursor_card に透過） */
  cursor_card?: string;
  card_body_md: string;
  source: string;
  submitted_at: string;
  /** delivered = Mac/エージェントが next で取得済み（リース中）。executed = 結果回収完了 */
  state: "approval_required" | "ready" | "rejected" | "delivered" | "executed";
  risk_tier: string;
  dry_run_only: boolean;
  /** キュー JSON の明示 fixture（dry_run_only と併用可） */
  fixture?: boolean;
  /** manifest 用（任意） */
  objective?: string;
  job_file?: string;
  /** キュー JSON の明示 job_id（API 正規化の最優先） */
  job_id?: string;
  reject_reasons: string[];
  matched_rules: string[];
  approved_at: string | null;
  leased_until: string | null;
  completed_at: string | null;
  /** Mac real guard: 明示 true のときのみ real 候補（next manifest に透過） */
  current_run?: boolean;
  /** escrow 経路で人間承認済みのとき true（next manifest に透過） */
  escrow_approved?: boolean;
  /** 高リスク明示（next manifest に透過。無ければ risk_tier から推定） */
  high_risk?: boolean;
  enqueue_reason?: string;
  escrow_package?: string;
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

export type QueueFile = {
  version: number;
  card: string;
  updatedAt: string;
  items: QueueItem[];
};

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizeDryRunOnly(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/** 空・空白 id を queue_id 列挙または新規 hex で埋め、永続化可能な変更があれば true */
function repairQueueItemSurfaceId(it: QueueItem): boolean {
  const trimmed = String(it.id ?? "").trim();
  if (trimmed) {
    const changed = it.id !== trimmed;
    it.id = trimmed;
    return changed;
  }
  const qidField = String((it as Record<string, unknown>).queue_id ?? "").trim();
  if (qidField) {
    it.id = qidField;
    return true;
  }
  it.id = randomBytes(8).toString("hex");
  return true;
}

export function readQueue(): QueueFile {
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
    let idsRepaired = false;
    for (const it of j.items) {
      it.state = normalizeQueueState(String(it.state ?? "ready"));
      it.dry_run_only = normalizeDryRunOnly(it.dry_run_only);
      if (repairQueueItemSurfaceId(it)) idsRepaired = true;
    }
    if (idsRepaired) writeQueue(j);
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

export function writeQueue(q: QueueFile) {
  q.updatedAt = utcIso();
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n", "utf-8");
}

function leaseExpired(it: QueueItem, nowMs: number): boolean {
  const lease = it.leased_until ? Date.parse(it.leased_until) : 0;
  return lease <= nowMs;
}

/** delivered かつリース有効中（またはリース欠落）→ 別 command を出さない（single-flight・fail-closed） */
function hasActiveDeliveredSingleFlight(q: QueueFile, nowMs: number): { active: boolean; command_id: string | null } {
  for (const it of q.items) {
    if (it.state !== "delivered") continue;
    const lu = String(it.leased_until ?? "").trim();
    if (!lu) {
      return { active: true, command_id: String(it.id ?? "").trim() || null };
    }
    if (leaseExpired(it, nowMs)) continue;
    return { active: true, command_id: String(it.id ?? "").trim() || null };
  }
  return { active: false, command_id: null };
}

function extractExpectedFilesFromCardMd(md: string): string[] {
  const out: string[] = [];
  for (const line of String(md || "").split(/\r?\n/)) {
    const m = line.match(/^\s*EXPECTED_FILES\s*[=:]\s*(.+)\s*$/i);
    if (!m) continue;
    for (const part of m[1].split(/[,;]/)) {
      const s = part.trim();
      if (s) out.push(s.slice(0, 512));
    }
  }
  return out.slice(0, 64);
}

function buildExecutionContractV1(it: QueueItem, qid: string, cardNameResolved: string, riskTier: string): CursorExecutionContractV1 {
  const fixture = isFixtureItem(it);
  const apply_mode: CursorExecutionContractV1["apply_mode"] = it.dry_run_only || fixture ? "dry_run" : "patch_apply";
  return {
    schema: "TENMON_CURSOR_EXECUTION_CONTRACT_V1",
    command_id: qid,
    card_id: cardNameResolved || String(it.card_name ?? "").trim(),
    risk_level: riskTier || "unknown",
    apply_mode,
    expected_files: extractExpectedFilesFromCardMd(it.card_body_md),
    expected_acceptance: {
      npm_run_check: true,
      notes: "Result must be POSTed to /api/admin/cursor/result before next GET /api/admin/cursor/next (single-flight).",
    },
  };
}

/** delivered かつリース期限切れ → ready（leased_until あり・期限切れのみ） */
function reconcileExpiredDeliveredLeases(q: QueueFile, nowMs: number): number {
  let n = 0;
  for (const it of q.items) {
    const lease = it.leased_until ? Date.parse(it.leased_until) : 0;
    if (it.state === "delivered" && lease > 0 && lease <= nowMs) {
      it.state = "ready";
      it.leased_until = null;
      n += 1;
    }
  }
  return n;
}

export function isFixtureItem(it: QueueItem): boolean {
  if (it.dry_run_only === true) return true;
  const f = it.fixture;
  if (f === true) return true;
  return normalizeDryRunOnly(f);
}

/** ?dry_run_only=1 のとき fixture のみ。それ以外は fixture でない項目をキュー順で優先し、無ければ fixture */
function pickNextReadyItem(q: QueueFile, dryOnly: boolean, nowMs: number): QueueItem | null {
  const ready = q.items.filter((it) => it.state === "ready" && leaseExpired(it, nowMs));
  if (dryOnly) {
    const dry = ready.filter((it) => isFixtureItem(it));
    return dry[0] ?? null;
  }
  const nonFixture = ready.filter((it) => !isFixtureItem(it));
  const fixture = ready.filter((it) => isFixtureItem(it));
  return nonFixture[0] ?? fixture[0] ?? null;
}

function extractObjectiveLineFromMd(md: string): string {
  for (const line of String(md || "").split(/\r?\n/)) {
    const m = line.match(/^\s*OBJECTIVE\s*[=:]\s*(.+)\s*$/i);
    if (m) return m[1].trim();
  }
  return "";
}

/** objective は空文字を返さない（Mac executor 向け） */
function resolveObjective(it: QueueItem): string {
  const direct = String(it.objective ?? "").trim();
  if (direct) return direct.slice(0, 4000);
  const fromTag = extractObjectiveLineFromMd(it.card_body_md);
  if (fromTag) return fromTag.slice(0, 4000);
  const bodyPrefix = String(it.card_body_md ?? "").trim().slice(0, 500);
  if (bodyPrefix) return bodyPrefix.slice(0, 4000);
  const src = String(it.source ?? "").trim() || "unknown";
  const card = String(it.cursor_card ?? it.card_name ?? "").trim() || "card";
  return `Remote cursor job (${src}): ${card}`.slice(0, 4000);
}

function resolveJobFile(it: QueueItem): string | null {
  const fromItem = String(it.job_file ?? "").trim();
  if (fromItem) return fromItem;
  return executorJobFileRel(it.id);
}

/** カード本文の RUN_ID / JOB_ID / probe_job_* 等（キュー id ではない運用ラベル） */
function extractJobIdFromCardBody(md: string): string | null {
  const text = String(md || "");
  for (const line of text.split(/\r?\n/)) {
    for (const re of [
      /^\s*RUN_ID\s*[=:]\s*(\S+)/i,
      /^\s*JOB_ID\s*[=:]\s*(\S+)/i,
      /^\s*job_id\s*[=:]\s*(\S+)/i,
    ]) {
      const m = line.match(re);
      if (m) return m[1].trim().slice(0, 240);
    }
  }
  const probe = text.match(/\b(probe_job_[A-Za-z0-9]+)\b/);
  if (probe) return probe[1];
  return null;
}

/** 本文由来の run ラベル（無ければ null、空文字は null） */
function normalizeRunJobId(runLabel: string | null): string | null {
  if (runLabel == null) return null;
  const s = String(runLabel).trim();
  return s ? s.slice(0, 240) : null;
}

/**
 * API 返却用 job_id: item.job_id → 本文ラベル → queue id。空文字は返さない。
 */
function resolveSurfaceJobId(it: QueueItem, runLabel: string | null, qid: string): string | null {
  const fromItem = String(it.job_id ?? "").trim();
  if (fromItem) return fromItem.slice(0, 240);
  const run = normalizeRunJobId(runLabel);
  if (run) return run;
  const qq = String(qid ?? "").trim();
  return qq ? qq : null;
}

function augmentQueueItemForApi(it: QueueItem): Record<string, unknown> {
  const qid = String(it.id ?? "").trim();
  const runLabel = extractJobIdFromCardBody(it.card_body_md);
  const jobIdResolved = resolveSurfaceJobId(it, runLabel, qid);
  const runJobId = normalizeRunJobId(runLabel);
  const fixture = isFixtureItem(it);
  return {
    ...it,
    id: qid,
    queue_id: qid,
    job_id: jobIdResolved,
    run_job_id: runJobId,
    fixture,
    dry_run_only: it.dry_run_only,
  };
}

function hasAnyQueueLookupKey(body: Record<string, unknown> | undefined): boolean {
  const r = body ?? {};
  return Boolean(
    String(r.id ?? "").trim() || String(r.queue_id ?? "").trim() || String(r.job_id ?? "").trim()
  );
}

/** 探索順: id → queue_id → job_id（job_id は本文ラベル or キュー id と一致） */
export function findQueueItem(q: QueueFile, body: Record<string, unknown>): QueueItem | undefined {
  const raw = body ?? {};
  const id = String(raw.id ?? "").trim();
  const queue_id = String(raw.queue_id ?? "").trim();
  const job_id = String(raw.job_id ?? "").trim();
  if (id) {
    const hit = q.items.find((x) => x.id === id);
    if (hit) return hit;
  }
  if (queue_id) {
    const hit = q.items.find((x) => x.id === queue_id);
    if (hit) return hit;
  }
  if (job_id) {
    return q.items.find((x) => {
      const ex = extractJobIdFromCardBody(x.card_body_md);
      const qxid = String(x.id ?? "").trim();
      const resolved = resolveSurfaceJobId(x, ex, qxid);
      return ex === job_id || qxid === job_id || resolved === job_id;
    });
  }
  return undefined;
}

const DEFAULT_EXECUTOR_JOB_REL_BASE = "api/automation/out/remote_cursor_executor";

/** manifest 用相対パス。base / queueId 欠損時は null（path.join に undefined を渡さない） */
function executorJobFileRel(queueId: string | null | undefined, baseDir?: string | null): string | null {
  const base = String(baseDir ?? DEFAULT_EXECUTOR_JOB_REL_BASE).trim();
  const qid = String(queueId ?? "").trim();
  if (!base || !qid) return null;
  return path.posix.join(base, qid, "job.json");
}

function buildNextManifestPayload(it: QueueItem): Record<string, unknown> {
  const runLabel = extractJobIdFromCardBody(it.card_body_md);
  if (!String(it.id ?? "").trim()) repairQueueItemSurfaceId(it);
  const qid = String(it.id ?? "").trim();
  const objective = resolveObjective(it);
  const jobFile = resolveJobFile(it);
  const fixture = isFixtureItem(it);
  const jobIdResolved = resolveSurfaceJobId(it, runLabel, qid);
  const runJobId = normalizeRunJobId(runLabel);
  const ext = it as unknown as Record<string, unknown>;
  const currentRun = it.current_run === true || ext.current_run === true;
  const escrowApproved = it.escrow_approved === true || ext.escrow_approved === true;
  const riskTier = String(it.risk_tier ?? ext.risk_tier ?? "").trim();
  const enqueueReason = String(it.enqueue_reason ?? ext.enqueue_reason ?? "").trim();
  const highRisk =
    it.high_risk === true ||
    ext.high_risk === true ||
    riskTier === "high" ||
    enqueueReason === "escrow_human_approval";
  const cardNameResolved = String(it.cursor_card ?? it.card_name ?? ext.cursor_card ?? "").trim();
  const execution_contract = buildExecutionContractV1(it, qid, cardNameResolved, riskTier);
  return {
    id: qid,
    queue_id: qid,
    job_id: jobIdResolved,
    run_job_id: runJobId,
    state: it.state,
    source: String(it.source ?? ""),
    cursor_card: cardNameResolved,
    objective,
    job_file: jobFile,
    fixture,
    dry_run_only: it.dry_run_only,
    leased_until: it.leased_until,
    createdAt: it.submitted_at,
    card_name: cardNameResolved || String(it.card_name ?? ""),
    card_body_md: it.card_body_md,
    current_run: currentRun,
    escrow_approved: escrowApproved,
    risk_tier: riskTier,
    high_risk: highRisk,
    enqueue_reason: enqueueReason,
    execution_contract,
    role_separation: CURSOR_ORCHESTRATION_ROLES_V1,
  };
}

const QUEUE_ID_HINT =
  "Primary key: id / queue_id (equal). job_id is normalized id or label; run_job_id is body label (probe_job_*) if any.";

/** GET queue summary（管理者） */
adminCursorCommandRouter.get("/admin/cursor/queue", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  const q = readQueue();
  const now = Date.now();
  const lease_reconciled = reconcileExpiredDeliveredLeases(q, now);
  if (lease_reconciled > 0) writeQueue(q);
  const summary = {
    approval_required: q.items.filter((i) => i.state === "approval_required").length,
    ready: q.items.filter((i) => i.state === "ready").length,
    rejected: q.items.filter((i) => i.state === "rejected").length,
    delivered: q.items.filter((i) => i.state === "delivered").length,
    executed: q.items.filter((i) => i.state === "executed").length,
  };
  const items = q.items.slice(-80).map((it) => augmentQueueItemForApi(it));
  return res.json({
    ok: true,
    summary,
    items,
    path: QUEUE_PATH,
    lease_reconciled,
  });
});

/** POST カード投入 — 承認ゲート必須（既定 approval_required） */
adminCursorCommandRouter.post("/admin/cursor/submit", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
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
    queue_id: id,
    note: state === "approval_required" ? "承認後に Mac エージェントが取得可能" : "ready（即取得可）",
  });
});

/** POST 承認 → ready */
adminCursorCommandRouter.post("/admin/cursor/approve", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!hasAnyQueueLookupKey(body)) {
    return res.status(400).json({ ok: false, error: "id required", detail: "send id, queue_id, or job_id" });
  }
  const q = readQueue();
  const it = findQueueItem(q, body);
  if (!it) return res.status(404).json({ ok: false, error: "not found", hint: QUEUE_ID_HINT });
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
adminCursorCommandRouter.post("/admin/cursor/reject", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const reason = String(body.reason ?? "").trim() || "manual_reject";
  if (!hasAnyQueueLookupKey(body)) {
    return res.status(400).json({ ok: false, error: "id required", detail: "send id, queue_id, or job_id" });
  }
  const q = readQueue();
  const it = findQueueItem(q, body);
  if (!it) return res.status(404).json({ ok: false, error: "not found", hint: QUEUE_ID_HINT });
  it.state = "rejected";
  it.reject_reasons = [...it.reject_reasons, `manual:${reason}`];
  writeQueue(q);
  return res.json({ ok: true, item: it });
});

/** GET エージェント pull: 次の ready をリースし Mac executor 向け manifest を返す */
adminCursorCommandRouter.get("/admin/cursor/next", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const dryOnly = String(req.query.dry_run_only ?? "") === "1";
  const q = readQueue();
  const now = Date.now();
  const lease_reconciled = reconcileExpiredDeliveredLeases(q, now);
  const sf = hasActiveDeliveredSingleFlight(q, now);
  if (sf.active) {
    if (lease_reconciled > 0) writeQueue(q);
    return res.json({
      ok: true,
      item: null,
      message: "single_flight_active_await_result",
      lease_reconciled,
      orchestration_v1: {
        single_flight_blocked: true,
        active_command_id: sf.command_id,
        hint: "POST /api/admin/cursor/result for the delivered command before issuing another next.",
        roles: CURSOR_ORCHESTRATION_ROLES_V1,
      },
    });
  }
  const it = pickNextReadyItem(q, dryOnly, now);
  if (!it) {
    if (lease_reconciled > 0) writeQueue(q);
    return res.json({
      ok: true,
      item: null,
      message: "no ready items",
      lease_reconciled,
      orchestration_v1: { single_flight_blocked: false, roles: CURSOR_ORCHESTRATION_ROLES_V1 },
    });
  }
  it.state = "delivered";
  it.leased_until = new Date(now + 15 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  writeQueue(q);
  return res.json({
    ok: true,
    item: buildNextManifestPayload(it),
    lease_reconciled,
    orchestration_v1: { single_flight_blocked: false, roles: CURSOR_ORCHESTRATION_ROLES_V1 },
  });
});

/** POST リース解放（失敗時に ready に戻す） */
adminCursorCommandRouter.post("/admin/cursor/release", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!hasAnyQueueLookupKey(body)) {
    return res.status(400).json({ ok: false, error: "id required", detail: "send id, queue_id, or job_id" });
  }
  const q = readQueue();
  if (reconcileExpiredDeliveredLeases(q, Date.now()) > 0) writeQueue(q);
  const it = findQueueItem(q, body);
  if (!it) return res.status(404).json({ ok: false, error: "not found", hint: QUEUE_ID_HINT });
  if (it.state === "executed" || it.state === "rejected") {
    return res.status(409).json({ ok: false, error: "cannot_release_terminal_state", state: it.state });
  }
  it.state = "ready";
  it.leased_until = null;
  writeQueue(q);
  return res.json({ ok: true, item: augmentQueueItemForApi(it) });
});

/** 簡易ダッシュボード HTML（管理者 cookie または手動で founderKey を入力） */
adminCursorCommandRouter.get("/admin/cursor/dashboard", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
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
