import type { CorePlan } from "../kanagi/core/corePlan.js";

// 最小：プロセス内Map（acceptanceの連続呼び出しで十分検証できる）
type RecallState = { centerClaim: string; updatedAt: string };
const mem = new Map<string, RecallState>();

export function kokuzoRecall(threadId: string): RecallState | null {
  const result = mem.get(threadId) ?? null;
  const hits = result ? 1 : 0;
  console.log(`[RECALL] session_id=${threadId} hits=${hits} source=kokuzo_recall_map`);
  return result;
}

export function kokuzoRemember(threadId: string, plan: CorePlan): void {
  mem.set(threadId, { centerClaim: String(plan.centerClaim || ""), updatedAt: new Date().toISOString() });
}
