import type { CorePlan } from "../kanagi/core/corePlan.js";
import { getDb } from "../db/index.js";

type RecallState = { centerClaim: string; updatedAt: string };

// フォールバック用プロセス内Map（DB失敗時）
const mem = new Map<string, RecallState>();

function ensureRecallTable(): void {
  try {
    const db = getDb("kokuzo");
    db.exec(`CREATE TABLE IF NOT EXISTS kokuzo_recall_cache (
      thread_id TEXT PRIMARY KEY,
      center_claim TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch {}
}

export function kokuzoRecall(threadId: string): RecallState | null {
  // まずDBから
  try {
    ensureRecallTable();
    const db = getDb("kokuzo");
    const row = db.prepare(
      "SELECT center_claim, updated_at FROM kokuzo_recall_cache WHERE thread_id = ? LIMIT 1"
    ).get(threadId) as { center_claim: string; updated_at: string } | undefined;
    if (row) return { centerClaim: row.center_claim, updatedAt: row.updated_at };
  } catch {}
  // フォールバック
  return mem.get(threadId) ?? null;
}

export function kokuzoRemember(threadId: string, plan: CorePlan): void {
  const centerClaim = String(plan.centerClaim || "");
  const updatedAt = new Date().toISOString();
  // DBに永続化
  try {
    ensureRecallTable();
    const db = getDb("kokuzo");
    db.prepare(
      "INSERT OR REPLACE INTO kokuzo_recall_cache (thread_id, center_claim, updated_at) VALUES (?, ?, ?)"
    ).run(threadId, centerClaim, updatedAt);
  } catch {}
  // メモリにも保持
  mem.set(threadId, { centerClaim, updatedAt });
}
