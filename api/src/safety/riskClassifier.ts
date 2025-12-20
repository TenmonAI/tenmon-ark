import type { RiskLevel, ToolPlan } from "../tools/toolTypes.js";
import { computePlanRisk } from "../tools/permissions.js";

export function classifyRisk(plan: ToolPlan): RiskLevel {
  // Prefer tool/arg based risk.
  return computePlanRisk(plan.actions);
}


