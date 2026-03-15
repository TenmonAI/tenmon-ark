/**
 * CARD_THREADCORE_MIN_V1: thread_center_memory を利用した ThreadCore の load/save（schema 変更なし）
 */

import { getDb } from "../db/index.js";
import { upsertThreadCenter } from "./threadCenterMemory.js";
import {
  type ThreadCore,
  type ThreadResponseContract,
  emptyThreadCore,
  centerLabelFromKey,
} from "./threadCore.js";

type Row = {
  id?: number;
  thread_id: string;
  center_type: string;
  center_key: string | null;
  center_reason: string | null;
  source_route_reason: string | null;
  updated_at: string;
};

/** CARD_THREADCORE_MIN_V1B: center_reason に JSON で lastResponseContract を保存している場合に復元 */
function parseLastResponseContract(row: Row): ThreadResponseContract | null {
  const rr = row.source_route_reason;
  try {
    const s = row.center_reason;
    if (s && typeof s === "string") {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && (parsed.routeReason != null || parsed.answerLength != null)) {
        return {
          answerLength: (parsed.answerLength as ThreadResponseContract["answerLength"]) ?? null,
          answerMode: (parsed.answerMode as string) ?? null,
          answerFrame: (parsed.answerFrame as string) ?? null,
          routeReason: (parsed.routeReason as string) ?? rr ?? null,
        };
      }
    }
  } catch {}
  return rr ? { routeReason: rr } : null;
}

/**
 * threadId に対応する ThreadCore を 1 件取得。例外時は emptyThreadCore を返す。
 */
export async function loadThreadCore(threadId: string): Promise<ThreadCore> {
  const tid = String(threadId || "").trim();
  if (!tid) return emptyThreadCore(tid || "default");
  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        `SELECT thread_id, center_type, center_key, center_reason, source_route_reason, updated_at
         FROM thread_center_memory WHERE thread_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(tid) as Row | undefined;
    if (!row) return emptyThreadCore(tid);
    const centerKey = row.center_key != null ? String(row.center_key) : null;
    const centerLabel = centerLabelFromKey(centerKey);
    return {
      threadId: tid,
      centerKey,
      centerLabel,
      activeEntities: centerLabel ? [centerLabel] : [],
      openLoops: [],
      commitments: [],
      lastResponseContract: parseLastResponseContract(row),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    };
  } catch {
    return emptyThreadCore(tid);
  }
}

/**
 * ThreadCore を保存。既存行があれば center_key / source_route_reason を更新、なければ upsert。
 * 失敗しても throw せず chat を落とさない。
 */
export async function saveThreadCore(core: ThreadCore): Promise<void> {
  const tid = String(core.threadId || "").trim();
  if (!tid) return;
  try {
    const db = getDb("kokuzo");
    const now = new Date().toISOString();
    const row = db
      .prepare(
        `SELECT id FROM thread_center_memory WHERE thread_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(tid) as { id: number } | undefined;
    const routeReason = core.lastResponseContract?.routeReason ?? null;
    const contractJson = core.lastResponseContract != null
      ? JSON.stringify({
          answerLength: core.lastResponseContract.answerLength ?? null,
          answerMode: core.lastResponseContract.answerMode ?? null,
          answerFrame: core.lastResponseContract.answerFrame ?? null,
          routeReason: core.lastResponseContract.routeReason ?? null,
        })
      : null;
    if (row && typeof row.id === "number") {
      db.prepare(
        `UPDATE thread_center_memory
         SET center_key = ?, center_reason = ?, source_route_reason = ?, updated_at = ?
         WHERE id = ?`
      ).run(core.centerKey ?? null, contractJson, routeReason, now, row.id);
    } else {
      upsertThreadCenter({
        threadId: tid,
        centerType: "concept",
        centerKey: core.centerKey ?? null,
        sourceRouteReason: routeReason,
      });
    }
  } catch {
    // best-effort: do not break chat
  }
}
