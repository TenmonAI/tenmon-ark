import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { guardTouchedFiles } from "../founder/remoteCursorGuardV1.js";
import { requireFounderOrExecutorBearer } from "../founder/executorTokenV1.js";
import {
  readQueue,
  writeQueue,
  findQueueItem,
  isFixtureItem,
  type QueueFile,
  type QueueItem,
  type CursorExecutionContractV1,
  CURSOR_ORCHESTRATION_ROLES_V1,
} from "./adminCursorCommand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTOMATION_DIR = path.join(__dirname, "..", "..", "automation");

export const adminCursorResultRouter = Router();

const BUNDLE_PATH =
  process.env.TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH || path.join(AUTOMATION_DIR, "remote_cursor_result_bundle.json");

function utcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

type BundleFile = { version: number; card: string; updatedAt: string; entries: unknown[] };

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

function strPath(v: unknown, max = 4096): string {
  return String(v ?? "").trim().slice(0, max);
}

function mapTransitionToResultStatus(transition: string, fileGuardOk: boolean): string {
  if (!fileGuardOk) return "blocked_paths";
  if (transition === "current_run_executed" || transition === "legacy_executed" || transition === "current_run_high_risk_acceptance_pass")
    return "accepted";
  if (transition === "fixture_released_ready") return "ingested_fixture";
  if (transition === "high_risk_acceptance_fail_ready") return "high_risk_retry_ready";
  if (transition === "executor_session_missing_current_run") return "executor_session_incomplete";
  if (transition === "legacy_ready") return "retry_ready";
  if (transition === "none") return "no_matching_delivered_item";
  return "processed";
}

function normalizeResultPayload(body: Record<string, unknown>): Record<string, unknown> {
  const rp = body.result_payload;
  if (rp != null && typeof rp === "object" && !Array.isArray(rp)) return rp as Record<string, unknown>;
  return {};
}

function mirrorExecutionContract(
  it: QueueItem | undefined,
  queueId: string,
  cardName: string,
  riskTier: string,
): CursorExecutionContractV1 {
  const qid = String(queueId || "").trim();
  const cid = String(cardName || "").trim();
  const fixture = it ? isFixtureItem(it) : false;
  const dry = it?.dry_run_only === true || fixture;
  return {
    schema: "TENMON_CURSOR_EXECUTION_CONTRACT_V1",
    command_id: qid,
    card_id: cid || String(it?.card_name ?? "").trim(),
    risk_level: riskTier || "unknown",
    apply_mode: dry ? "dry_run" : "patch_apply",
    expected_files: [],
    expected_acceptance: { npm_run_check: true },
  };
}

function queueItemHighRisk(it: QueueItem | undefined): boolean {
  if (!it) return false;
  const ext = it as unknown as Record<string, unknown>;
  if (ext.high_risk === true) return true;
  return String(ext.risk_tier ?? it.risk_tier ?? "").toLowerCase() === "high";
}

function applyQueueAfterResult(
  q: QueueFile,
  it: QueueItem | undefined,
  entry: Record<string, unknown>,
  fileGuardOk: boolean
): { transition: string } {
  if (!it || it.state !== "delivered") {
    return { transition: "none" };
  }

  if (isFixtureItem(it)) {
    it.state = "ready";
    it.leased_until = null;
    writeQueue(q);
    return { transition: "fixture_released_ready" };
  }

  const currentRun = entry.current_run === true;
  const resultType = strPath(entry.result_type, 120);
  const executorSession = resultType === "executor_session";

  if (executorSession && !currentRun) {
    it.state = "ready";
    it.leased_until = null;
    writeQueue(q);
    return { transition: "executor_session_missing_current_run" };
  }

  if (executorSession && currentRun && fileGuardOk) {
    const chainAttempted = entry.high_risk_acceptance_chain_attempted === true;
    if (chainAttempted && queueItemHighRisk(it)) {
      const rb = entry.rollback_executed === true;
      const brc = entry.build_rc != null ? Number(entry.build_rc) : null;
      const acceptPass = entry.acceptance_ok === true;
      if (acceptPass && brc === 0 && !rb) {
        it.state = "executed";
        it.completed_at = utcIso();
        it.leased_until = null;
        writeQueue(q);
        return { transition: "current_run_high_risk_acceptance_pass" };
      }
      it.state = "ready";
      it.leased_until = null;
      writeQueue(q);
      return { transition: "high_risk_acceptance_fail_ready" };
    }
    it.state = "executed";
    it.completed_at = utcIso();
    it.leased_until = null;
    writeQueue(q);
    return { transition: "current_run_executed" };
  }

  const buildOk = entry.build_rc == null || Number(entry.build_rc) === 0;
  const acceptOk = entry.acceptance_ok !== false;
  if (fileGuardOk && buildOk && acceptOk) {
    it.state = "executed";
    it.completed_at = utcIso();
    it.leased_until = null;
    writeQueue(q);
    return { transition: "legacy_executed" };
  }

  it.state = "ready";
  it.leased_until = null;
  writeQueue(q);
  return { transition: "legacy_ready" };
}

/** POST 結果回収（legacy build/accept + current-run executor_session 証跡） */
adminCursorResultRouter.post("/admin/cursor/result", requireFounderOrExecutorBearer, (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const q = readQueue();
  const it = findQueueItem(q, body);
  const queue_id = it
    ? String(it.id ?? "").trim()
    : String(body.queue_id ?? body.id ?? body.job_id ?? "").trim();
  if (!queue_id) {
    return res.status(400).json({ ok: false, error: "queue_id required", detail: "send id, queue_id, or job_id" });
  }

  const touched_files = Array.isArray(body.touched_files) ? body.touched_files.map((x) => String(x)) : [];
  const fileGuard = guardTouchedFiles(touched_files);

  const cardNameForContract = String(it?.cursor_card ?? it?.card_name ?? body.card_id ?? "").trim();
  const riskForContract = String(
    (it as unknown as Record<string, unknown>)?.risk_tier ?? it?.risk_tier ?? body.risk_level ?? "",
  ).trim();

  const entry: Record<string, unknown> = {
    schema_version: 3,
    queue_id,
    command_id: strPath(body.command_id, 128) || queue_id,
    card_id: strPath(body.card_id, 240) || cardNameForContract || null,
    ingested_at: utcIso(),
    touched_files,
    file_guard_ok: fileGuard.ok,
    file_guard_blocked: fileGuard.blocked,
    build_result: { rc: body.build_rc != null ? Number(body.build_rc) : null },
    build_rc: body.build_rc != null ? Number(body.build_rc) : null,
    acceptance_result: { ok: body.acceptance_ok != null ? Boolean(body.acceptance_ok) : null },
    acceptance_ok: body.acceptance_ok != null ? Boolean(body.acceptance_ok) : null,
    rollback_executed: body.rollback_executed === true,
    commit_ready: body.commit_ready === true,
    high_risk_acceptance_chain_attempted: body.high_risk_acceptance_chain_attempted === true,
    next_card: body.next_card != null ? String(body.next_card) : null,
    log_snippet: body.log_snippet != null ? String(body.log_snippet).slice(0, 8000) : "",
    dry_run: Boolean(body.dry_run),
    real_execution_enabled: body.real_execution_enabled === true,
    escrow_approved:
      typeof body.escrow_approved === "boolean" ? Boolean(body.escrow_approved) : null,
    status: strPath(body.status, 240) || null,
    result_type: strPath(body.result_type, 120) || null,
    session_id: strPath(body.session_id, 500) || null,
    cursor_job_session_manifest: strPath(body.cursor_job_session_manifest) || null,
    mac_executor_state: strPath(body.mac_executor_state) || null,
    dangerous_patch_block_report: strPath(body.dangerous_patch_block_report) || null,
    log_path: strPath(body.log_path) || null,
    current_run: body.current_run === true,
    role_separation: CURSOR_ORCHESTRATION_ROLES_V1,
    execution_contract: mirrorExecutionContract(it, queue_id, cardNameForContract, riskForContract),
  };

  const { transition } = applyQueueAfterResult(q, it, entry, fileGuard.ok);

  const explicitRs = strPath(body.result_status, 64) || null;
  entry.result_status = explicitRs || mapTransitionToResultStatus(transition, fileGuard.ok);
  const extraPayload = normalizeResultPayload(body);
  entry.result_payload =
    Object.keys(extraPayload).length > 0
      ? extraPayload
      : {
          build_rc: entry.build_rc,
          acceptance_ok: entry.acceptance_ok,
          touched_files_count: touched_files.length,
          transition,
        };

  const bundle = readBundle();
  bundle.entries.push(entry);
  if (bundle.entries.length > 200) bundle.entries = bundle.entries.slice(-200);
  writeBundle(bundle);

  let statusLabel = fileGuard.ok ? "accepted" : "blocked_paths";
  if (transition === "fixture_released_ready") statusLabel = "ingested_fixture_not_completed";
  else if (transition === "current_run_executed") statusLabel = "executed";
  else if (transition === "current_run_high_risk_acceptance_pass") statusLabel = "executed";
  else if (transition === "high_risk_acceptance_fail_ready") statusLabel = "high_risk_acceptance_fail_retry_ready";
  else if (transition === "legacy_executed") statusLabel = "executed";
  else if (transition === "executor_session_missing_current_run") statusLabel = "executor_session_requires_current_run";

  return res.json({
    ok: fileGuard.ok,
    status: statusLabel,
    transition,
    result_status: entry.result_status,
    entry,
    queue_item: it ?? null,
    orchestration_v1: {
      roles: CURSOR_ORCHESTRATION_ROLES_V1,
      queue_item_state_after: it?.state ?? null,
      transition,
      note: "delivered を result で executed/ready に戻した後にのみ GET /admin/cursor/next で次 command を発行（single-flight）。",
    },
  });
});

/** GET バンドル参照 */
adminCursorResultRouter.get("/admin/cursor/result/bundle", requireFounderOrExecutorBearer, (_req: Request, res: Response) => {
  const b = readBundle();
  return res.json({ ok: true, bundle: b, path: BUNDLE_PATH });
});
