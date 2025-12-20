import { randomBytes, randomUUID, createHash } from "node:crypto";
import { dbPrepare } from "../db/index.js";
import type { RiskLevel, ToolPlan } from "../tools/toolTypes.js";

export type ApprovalRecord = {
  approvalId: string;
  planId: string;
  token: string; // one-time token (plaintext returned once)
  expiresAt: string;
  risk: RiskLevel;
  summary: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function summarizePlan(plan: ToolPlan): string {
  const tools = plan.actions.map((a) => a.tool).join(", ");
  const count = plan.actions.length;
  return `plan ${plan.planId}: ${count} action(s) [${tools}]`;
}

const insertStmt = dbPrepare(
  "audit",
  "INSERT INTO tool_approval (approval_id, plan_id, token_hash, risk, summary, reason, session_id, persona, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)"
);

const selectStmt = dbPrepare(
  "audit",
  "SELECT approval_id, plan_id, token_hash, expires_at, used_at FROM tool_approval WHERE token_hash = ?"
);

const markUsedStmt = dbPrepare("audit", "UPDATE tool_approval SET used_at = ? WHERE approval_id = ?");

export function createApproval(plan: ToolPlan, risk: RiskLevel, reason: string): ApprovalRecord {
  const approvalId = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const tokenHash = sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const summary = summarizePlan(plan);

  insertStmt.run(
    approvalId,
    plan.planId,
    tokenHash,
    risk,
    summary,
    reason,
    plan.context.sessionId,
    plan.context.persona,
    expiresAt,
    createdAt
  );

  return { approvalId, planId: plan.planId, token, expiresAt, risk, summary };
}

export function verifyAndConsumeApproval(planId: string, token: string): { ok: true; approvalId: string } | { ok: false; violations: string[] } {
  if (!token || token.trim().length === 0) return { ok: false, violations: ["approvalToken is required"] };

  const tokenHash = sha256(token);
  const row = selectStmt.get(tokenHash) as
    | { approval_id: string; plan_id: string; token_hash: string; expires_at: string; used_at: string | null }
    | undefined;

  if (!row) return { ok: false, violations: ["invalid approval token"] };
  if (row.plan_id !== planId) return { ok: false, violations: ["approval token does not match planId"] };
  if (row.used_at) return { ok: false, violations: ["approval token already used"] };

  const exp = Date.parse(row.expires_at);
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, violations: ["approval token expired"] };

  markUsedStmt.run(nowIso(), row.approval_id);
  return { ok: true, approvalId: row.approval_id };
}


