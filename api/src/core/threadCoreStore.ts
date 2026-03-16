/**
 * CARD_THREADCORE_MIN_V1: thread_center_memory を利用した ThreadCore の load/save（schema 変更なし）
 * CARD_THREADCORE_EXPAND_V1: center_reason JSON で openLoops / commitments も一貫保存・復元
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

/** CARD_THREADCORE_MIN_V1B + EXPAND_V1: center_reason JSON から contract / openLoops / commitments を復元 */
function parseCenterReason(row: Row): {
  contract: ThreadResponseContract | null;
  openLoops: string[];
  commitments: string[];
} {
  const rr = row.source_route_reason;
  const empty = { contract: rr ? { routeReason: rr } : null, openLoops: [] as string[], commitments: [] as string[] };
  try {
    const s = row.center_reason;
    if (!s || typeof s !== "string") return empty;
    const parsed = JSON.parse(s) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return empty;
    const contract: ThreadResponseContract | null =
      parsed.routeReason != null || parsed.answerLength != null
        ? {
            answerLength: (parsed.answerLength as ThreadResponseContract["answerLength"]) ?? null,
            answerMode: (parsed.answerMode as string) ?? null,
            answerFrame: (parsed.answerFrame as string) ?? null,
            routeReason: (parsed.routeReason as string) ?? rr ?? null,
          }
        : rr ? { routeReason: rr } : null;
    const openLoops = Array.isArray(parsed.openLoops) ? (parsed.openLoops as string[]).filter((x): x is string => typeof x === "string") : [];
    const commitments = Array.isArray(parsed.commitments) ? (parsed.commitments as string[]).filter((x): x is string => typeof x === "string") : [];
    return { contract, openLoops, commitments };
  } catch {
    return empty;
  }
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
    const { contract, openLoops, commitments } = parseCenterReason(row);
    return {
      threadId: tid,
      centerKey,
      centerLabel,
      activeEntities: centerLabel ? [centerLabel] : [],
      openLoops,
      commitments,
      lastResponseContract: contract,
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
    const contractJson = (() => {
      const base =
        core.lastResponseContract != null
          ? {
              answerLength: core.lastResponseContract.answerLength ?? null,
              answerMode: core.lastResponseContract.answerMode ?? null,
              answerFrame: core.lastResponseContract.answerFrame ?? null,
              routeReason: core.lastResponseContract.routeReason ?? null,
            }
          : { answerLength: null, answerMode: null, answerFrame: null, routeReason };
      return JSON.stringify({
        ...base,
        openLoops: Array.isArray(core.openLoops) ? core.openLoops : [],
        commitments: Array.isArray(core.commitments) ? core.commitments : [],
      });
    })();
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
        centerReason: contractJson,
      });
    }
  } catch {
    // best-effort: do not break chat
  }
}
