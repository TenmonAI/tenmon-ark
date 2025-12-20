import { Router, type IRouter, type Request, type Response } from "express";
import { dryRunPlan, executePlan } from "../tools/executor.js";
import { getPlan, createPlan } from "../tools/planner.js";
import { validatePlan } from "../tools/permissions.js";
import { verifyAndConsumeApproval } from "../safety/approval.js";
import { writeAudit } from "../safety/auditLog.js";
import { evaluatePolicy } from "../safety/policyEngine.js";
import { incToolUsage } from "../ops/metrics.js";
import { getSafeModeReason, isSafeMode } from "../ops/safeMode.js";
import type { ToolDryRunRequest, ToolDryRunResponse, ToolExecuteRequest, ToolExecuteResponse, ToolPlanRequest, ToolPlanResponse, ToolValidateRequest, ToolValidateResponse } from "../tools/toolTypes.js";

const router: IRouter = Router();

router.post("/tool/plan", (req: Request<unknown, unknown, ToolPlanRequest>, res: Response<ToolPlanResponse>) => {
  const intent = (req.body as any)?.intent;
  const context = (req.body as any)?.context;

  if (typeof intent !== "string" || !context || typeof context.sessionId !== "string" || typeof context.persona !== "string") {
    return res.status(400).json({
      planId: "invalid",
      actions: [],
      risk: "high",
      requires: [],
    });
  }

  const plan = createPlan({ intent, context });
  for (const a of plan.actions) incToolUsage(a.tool, "plan");
  return res.json(plan);
});

router.post("/tool/validate", (req: Request<unknown, unknown, ToolValidateRequest>, res: Response<ToolValidateResponse>) => {
  const planId = (req.body as any)?.planId;
  if (typeof planId !== "string") return res.json({ ok: false, violations: ["planId must be a string"] });

  const plan = getPlan(planId);
  if (!plan) return res.json({ ok: false, violations: ["plan not found"] });

  const v = validatePlan(plan);
  return res.json(v.ok ? { ok: true, violations: [] } : { ok: false, violations: v.violations });
});

router.post("/tool/dry-run", async (req: Request<unknown, unknown, ToolDryRunRequest>, res: Response<ToolDryRunResponse>) => {
  const planId = (req.body as any)?.planId;
  if (typeof planId !== "string") {
    return res.status(400).json({ ok: false, results: [], note: "dry-run only (no side effects)", violations: ["planId must be a string"] });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return res.status(404).json({ ok: false, results: [], note: "dry-run only (no side effects)", violations: ["plan not found"] });
  }

  const r = await dryRunPlan(plan);
  if (!r.ok) {
    return res.status(400).json({ ok: false, results: r.results, note: "dry-run only (no side effects)", violations: r.violations });
  }

  for (const a of plan.actions) incToolUsage(a.tool, "dry-run");
  return res.json({ ok: true, results: r.results, note: "dry-run only (no side effects)" });
});

router.post("/tool/execute", async (req: Request<unknown, unknown, ToolExecuteRequest>, res: Response<ToolExecuteResponse>) => {
  const planId = (req.body as any)?.planId;
  const approvalToken = (req.body as any)?.approvalToken;

  if (typeof planId !== "string" || typeof approvalToken !== "string") {
    const audit = writeAudit({
      planId: typeof planId === "string" ? planId : "invalid",
      sessionId: "unknown",
      persona: "unknown",
      risk: "high",
      actions: [],
      ok: false,
      result: { ok: false },
      deniedReason: "invalid request",
    });
    return res.status(400).json({ ok: false, results: [], auditId: audit.auditId, violations: ["planId and approvalToken are required"] });
  }

  const plan = getPlan(planId);
  if (!plan) {
    const audit = writeAudit({
      planId,
      sessionId: "unknown",
      persona: "unknown",
      risk: "high",
      actions: [],
      ok: false,
      result: { ok: false },
      deniedReason: "plan not found",
    });
    return res.status(404).json({ ok: false, results: [], auditId: audit.auditId, violations: ["plan not found"] });
  }

  if (isSafeMode()) {
    const audit = writeAudit({
      planId,
      sessionId: plan.context.sessionId,
      persona: plan.context.persona,
      risk: "high",
      actions: plan.actions,
      ok: false,
      result: { ok: false, violations: ["safe mode: execute disabled"] },
      deniedReason: `safe mode: ${getSafeModeReason() ?? "enabled"}`,
    });
    return res.status(503).json({ ok: false, results: [], auditId: audit.auditId, violations: ["safe mode: execute disabled"] });
  }

  // Policy deny (even with approval)
  const policy = evaluatePolicy(plan);
  if (!policy.ok) {
    const audit = writeAudit({
      planId,
      sessionId: plan.context.sessionId,
      persona: plan.context.persona,
      risk: policy.risk,
      actions: plan.actions,
      ok: false,
      result: { ok: false, violations: policy.violations },
      deniedReason: "policy denied",
    });
    return res.status(403).json({ ok: false, results: [], auditId: audit.auditId, violations: policy.violations });
  }

  // Approval required for ANY execute in Phase8
  const approval = verifyAndConsumeApproval(planId, approvalToken);
  if (!approval.ok) {
    const audit = writeAudit({
      planId,
      sessionId: plan.context.sessionId,
      persona: plan.context.persona,
      risk: policy.risk,
      actions: plan.actions,
      ok: false,
      result: { ok: false, violations: approval.violations },
      deniedReason: "approval denied",
    });
    return res.status(403).json({ ok: false, results: [], auditId: audit.auditId, violations: approval.violations });
  }

  const exec = await executePlan(plan);
  const audit = writeAudit({
    planId,
    sessionId: plan.context.sessionId,
    persona: plan.context.persona,
    risk: policy.risk,
    actions: plan.actions,
    ok: exec.ok,
    result: exec,
    deniedReason: exec.ok ? undefined : "executor denied",
  });

  if (!exec.ok) {
    return res.status(400).json({ ok: false, results: exec.results, auditId: audit.auditId, violations: exec.violations });
  }

  for (const a of plan.actions) incToolUsage(a.tool, "execute");
  return res.json({ ok: true, results: exec.results, auditId: audit.auditId });
});

export default router;


