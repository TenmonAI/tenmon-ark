import { getDb } from "../db/index.js";

export type ThreadCenterType = "scripture" | "subconcept" | "concept" | "general" | "unresolved";

export type ThreadCenterInput = {
  threadId: string;
  centerType: ThreadCenterType;
  centerKey?: string | null;
  centerReason?: string | null;
  nextAxes?: unknown;
  sourceRouteReason?: string | null;
  sourceScriptureKey?: string | null;
  sourceTopicClass?: string | null;
  sourceSelfPhase?: string | null;
  sourceIntentPhase?: string | null;
  confidence?: number | null;
};

export type ThreadCenterRow = {
  id: number;
  thread_id: string;
  center_type: string;
  center_key: string | null;
  center_reason: string | null;
  next_axes_json: string | null;
  source_route_reason: string | null;
  source_scripture_key: string | null;
  source_topic_class: string | null;
  source_self_phase: string | null;
  source_intent_phase: string | null;
  confidence: number;
  updated_at: string;
};

function normalizeInput(input: ThreadCenterInput): {
  threadId: string;
  centerType: ThreadCenterType;
  centerKey: string | null;
  centerReason: string | null;
  nextAxesJson: string | null;
  sourceRouteReason: string | null;
  sourceScriptureKey: string | null;
  sourceTopicClass: string | null;
  sourceSelfPhase: string | null;
  sourceIntentPhase: string | null;
  confidence: number;
} {
  const threadId = String(input.threadId || "").trim();
  const centerType = (input.centerType || "unresolved") as ThreadCenterType;
  const centerKey = input.centerKey != null ? String(input.centerKey) : null;
  const centerReason = input.centerReason != null ? String(input.centerReason) : null;
  const nextAxesJson =
    input.nextAxes === undefined
      ? null
      : JSON.stringify(input.nextAxes ?? null);
  const sourceRouteReason =
    input.sourceRouteReason != null ? String(input.sourceRouteReason) : null;
  const sourceScriptureKey =
    input.sourceScriptureKey != null ? String(input.sourceScriptureKey) : null;
  const sourceTopicClass =
    input.sourceTopicClass != null ? String(input.sourceTopicClass) : null;
  const sourceSelfPhase =
    input.sourceSelfPhase != null ? String(input.sourceSelfPhase) : null;
  const sourceIntentPhase =
    input.sourceIntentPhase != null ? String(input.sourceIntentPhase) : null;
  const c =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? input.confidence
      : 0;
  const confidence = Math.max(0, Math.min(1, c));

  return {
    threadId,
    centerType,
    centerKey,
    centerReason,
    nextAxesJson,
    sourceRouteReason,
    sourceScriptureKey,
    sourceTopicClass,
    sourceSelfPhase,
    sourceIntentPhase,
    confidence,
  };
}

/**
 * 最新の thread center を threadId 単位で 1 件だけ取得する。見つからなければ null。
 */
export function getLatestThreadCenter(threadId: string): ThreadCenterRow | null {
  const tid = String(threadId || "").trim();
  if (!tid) return null;
  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        `SELECT * FROM thread_center_memory WHERE thread_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(tid);
    return (row as any) as ThreadCenterRow || null;
  } catch {
    return null;
  }
}

/**
 * threadId + centerType 単位で upsert。既存行があれば更新、なければ INSERT。
 * 失敗しても throw せず、会話を落とさない。
 */
export function upsertThreadCenter(input: ThreadCenterInput): void {
  const norm = normalizeInput(input);
  if (!norm.threadId) return;

  try {
    const db = getDb("kokuzo");
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        `SELECT id FROM thread_center_memory WHERE thread_id = ? AND center_type = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(norm.threadId, norm.centerType);

    if (existing && typeof existing.id === "number") {
      db.prepare(
        `UPDATE thread_center_memory
         SET center_key = ?,
             center_reason = ?,
             next_axes_json = ?,
             source_route_reason = ?,
             source_scripture_key = ?,
             source_topic_class = ?,
             source_self_phase = ?,
             source_intent_phase = ?,
             confidence = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(
        norm.centerKey,
        norm.centerReason,
        norm.nextAxesJson,
        norm.sourceRouteReason,
        norm.sourceScriptureKey,
        norm.sourceTopicClass,
        norm.sourceSelfPhase,
        norm.sourceIntentPhase,
        norm.confidence,
        now,
        existing.id
      );
    } else {
      db.prepare(
        `INSERT INTO thread_center_memory (
           thread_id,
           center_type,
           center_key,
           center_reason,
           next_axes_json,
           source_route_reason,
           source_scripture_key,
           source_topic_class,
           source_self_phase,
           source_intent_phase,
           confidence,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        norm.threadId,
        norm.centerType,
        norm.centerKey,
        norm.centerReason,
        norm.nextAxesJson,
        norm.sourceRouteReason,
        norm.sourceScriptureKey,
        norm.sourceTopicClass,
        norm.sourceSelfPhase,
        norm.sourceIntentPhase,
        norm.confidence,
        now
      );
    }
  } catch {
    // best-effort: do not break chat
  }
}

