import { dbPrepare } from "../db/index.js";

export type ThreadCenterMemory = {
  threadId: string;
  essentialGoal: string | null;
  centerKey: string | null;
  centerLoss: number;
};

export function readThreadCenterMemory(threadId: string): ThreadCenterMemory | null {
  const tid = String(threadId ?? "").trim();
  if (!tid) return null;
  const row = dbPrepare(
    "kokuzo",
    "SELECT thread_id, essential_goal, center_key, center_loss FROM thread_center_memory WHERE thread_id = ? LIMIT 1"
  ).get(tid) as
    | {
        thread_id: string;
        essential_goal: string | null;
        center_key: string | null;
        center_loss: number | null;
      }
    | undefined;
  if (!row) return null;
  return {
    threadId: row.thread_id,
    essentialGoal: row.essential_goal ?? null,
    centerKey: row.center_key ?? null,
    centerLoss: Number(row.center_loss ?? 0),
  };
}

