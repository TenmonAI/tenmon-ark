// src/kanagi/core/truthCore.ts
// TENMON-ARK: Truth-Core is a deterministic judge (no LLM). It stabilizes CorePlan.

import type { CorePlan } from "./corePlan.js";

export type TruthCoreInput = {
  responseText: string;
  trace?: any;
};

export function applyTruthCore(plan: CorePlan, input: TruthCoreInput): CorePlan {
  // chainOrder を必ず伸ばす（工程4の封印ポイント）
  if (!Array.isArray(plan.chainOrder)) plan.chainOrder = [];
  if (!plan.chainOrder.includes("TRUTH_CORE")) plan.chainOrder.push("TRUTH_CORE");

  // centerClaim を安定化（短く・決定論）
  const base = String(plan.centerClaim || input.responseText || "").trim();
  plan.centerClaim = base.slice(0, 120);

  // 空仮中/未確定は warnings に落とす（最小）
  if (!Array.isArray(plan.warnings)) plan.warnings = [];
  if (!plan.centerClaim) plan.warnings.push("TRUTH_CORE: centerClaim empty");

  return plan;
}
