import type { RiskLevel, ToolAction } from "../tools/toolTypes.js";

export type PolicyDecision =
  | { ok: true; risk: RiskLevel; violations: [] }
  | { ok: false; risk: RiskLevel; violations: string[] };

export type ApprovalRequestInput = {
  planId: string;
  reason: string;
};

export type ApprovalResponse = {
  approvalId: string;
  token: string;
  expiresAt: string;
  risk: RiskLevel;
  summary: string;
};

export type ExecuteRequestInput = {
  planId: string;
  approvalToken: string;
};

export type AuditWriteInput = {
  planId: string;
  sessionId: string;
  persona: string;
  risk: RiskLevel;
  actions: ToolAction[];
  ok: boolean;
  result: unknown;
  deniedReason?: string;
};

export type AuditWriteResult = { auditId: string };


