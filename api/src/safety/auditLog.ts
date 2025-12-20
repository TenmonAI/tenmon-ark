import { randomUUID } from "node:crypto";
import { dbPrepare } from "../db/index.js";
import type { AuditWriteInput, AuditWriteResult } from "./safetyTypes.js";

function nowIso(): string {
  return new Date().toISOString();
}

const insertStmt = dbPrepare(
  "audit",
  "INSERT INTO tool_audit (audit_id, plan_id, session_id, persona, risk, actions_json, ok, result_json, denied_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

export function writeAudit(input: AuditWriteInput): AuditWriteResult {
  const auditId = randomUUID();
  const createdAt = nowIso();

  insertStmt.run(
    auditId,
    input.planId,
    input.sessionId,
    input.persona,
    input.risk,
    JSON.stringify(input.actions),
    input.ok ? 1 : 0,
    JSON.stringify(input.result),
    input.deniedReason ?? null,
    createdAt
  );

  return { auditId };
}


