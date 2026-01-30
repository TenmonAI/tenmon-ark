import type { CorePlan } from "./corePlan.js";

export function applyVerifier(plan: CorePlan): CorePlan {
  if (!Array.isArray(plan.chainOrder)) plan.chainOrder = [];
  if (!plan.chainOrder.includes("VERIFIER")) plan.chainOrder.push("VERIFIER");
  if (!Array.isArray(plan.warnings)) plan.warnings = [];
  // 最小：現時点では evidenceIds が空なら warning
  if (!Array.isArray(plan.evidenceIds) || plan.evidenceIds.length === 0) {
    plan.warnings.push("VERIFIER: evidence missing");
  }
  return plan;
}
