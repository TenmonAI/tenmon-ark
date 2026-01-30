import type { CorePlan } from "../kanagi/core/corePlan.js";

// 最小：プロセス内Map（acceptanceの連続呼び出しで十分検証できる）
type RecallState = { centerClaim: string; updatedAt: string };
const mem = new Map<string, RecallState>();

export function kokuzoRecall(threadId: string): RecallState | null {
  return mem.get(threadId) ?? null;
}

export function kokuzoRemember(threadId: string, plan: CorePlan): void {
  mem.set(threadId, { centerClaim: String(plan.centerClaim || ""), updatedAt: new Date().toISOString() });
}
