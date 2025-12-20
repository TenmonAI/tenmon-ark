import { Router, type IRouter, type Request, type Response } from "express";
import { getPlan } from "../tools/planner.js";
import { evaluatePolicy } from "../safety/policyEngine.js";
import { createApproval } from "../safety/approval.js";
import type { ApprovalRequestInput, ApprovalResponse } from "../safety/safetyTypes.js";
import { incApprovalRequest } from "../ops/metrics.js";

const router: IRouter = Router();

router.post("/approval/request", (req: Request<unknown, unknown, ApprovalRequestInput>, res: Response<ApprovalResponse>) => {
  incApprovalRequest();
  const planId = (req.body as any)?.planId;
  const reason = (req.body as any)?.reason;

  if (typeof planId !== "string" || typeof reason !== "string") {
    return res.status(400).json({
      approvalId: "invalid",
      token: "",
      expiresAt: new Date(0).toISOString(),
      risk: "high",
      summary: "invalid request",
    });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return res.status(404).json({
      approvalId: "not_found",
      token: "",
      expiresAt: new Date(0).toISOString(),
      risk: "high",
      summary: "plan not found",
    });
  }

  const policy = evaluatePolicy(plan);
  if (!policy.ok) {
    return res.status(403).json({
      approvalId: "denied",
      token: "",
      expiresAt: new Date(0).toISOString(),
      risk: policy.risk,
      summary: policy.violations.join("; "),
    });
  }

  const approval = createApproval(plan, policy.risk, reason);
  return res.json({
    approvalId: approval.approvalId,
    token: approval.token,
    expiresAt: approval.expiresAt,
    risk: approval.risk,
    summary: approval.summary,
  });
});

export default router;


