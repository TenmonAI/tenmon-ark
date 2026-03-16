import { getDb } from "../db/index.js";

export type BookContinuationRow = {
  id: number;
  thread_id: string;
  book_mode_requested: number;
  target_length_hint: number | null;
  chapter_title: string | null;
  center_topic: string | null;
  last_book_intent: string | null;
  updated_at: string;
};

export type BookContinuationInput = {
  threadId: string;
  bookModeRequested?: boolean;
  targetLengthHint?: number | null;
  chapterTitle?: string | null;
  centerTopic?: string | null;
  lastBookIntent?: string | null;
};

export type BookContinuationState = {
  threadId: string;
  bookModeRequested: boolean;
  targetLengthHint: number | null;
  chapterTitle: string | null;
  centerTopic: string | null;
  lastBookIntent: string | null;
  updatedAt: string;
};

function normalizeInput(input: BookContinuationInput): {
  threadId: string;
  bookModeRequested: number;
  targetLengthHint: number | null;
  chapterTitle: string | null;
  centerTopic: string | null;
  lastBookIntent: string | null;
} {
  const threadId = String(input.threadId ?? "").trim();
  const bookModeRequested = input.bookModeRequested === true ? 1 : 0;
  const targetLengthHint =
    typeof input.targetLengthHint === "number" && Number.isFinite(input.targetLengthHint)
      ? input.targetLengthHint
      : null;
  const chapterTitle =
    input.chapterTitle != null && input.chapterTitle !== ""
      ? String(input.chapterTitle).slice(0, 500)
      : null;
  const centerTopic =
    input.centerTopic != null && input.centerTopic !== ""
      ? String(input.centerTopic).slice(0, 1000)
      : null;
  const lastBookIntent =
    input.lastBookIntent != null && input.lastBookIntent !== ""
      ? String(input.lastBookIntent).slice(0, 200)
      : null;
  return {
    threadId,
    bookModeRequested,
    targetLengthHint,
    chapterTitle,
    centerTopic,
    lastBookIntent,
  };
}

function rowToState(row: BookContinuationRow): BookContinuationState {
  return {
    threadId: row.thread_id,
    bookModeRequested: row.book_mode_requested !== 0,
    targetLengthHint: row.target_length_hint,
    chapterTitle: row.chapter_title,
    centerTopic: row.center_topic,
    lastBookIntent: row.last_book_intent,
    updatedAt: row.updated_at,
  };
}

/**
 * threadId 単位で book 継続記憶を 1 件取得。無ければ null。
 */
export function getBookContinuation(threadId: string): BookContinuationState | null {
  const tid = String(threadId ?? "").trim();
  if (!tid) return null;
  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        `SELECT * FROM book_continuation_memory WHERE thread_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(tid) as BookContinuationRow | undefined;
    return row ? rowToState(row) : null;
  } catch {
    return null;
  }
}

/**
 * threadId 単位で upsert。既存行があれば更新、なければ INSERT。失敗時は throw せず会話を落とさない。
 */
export function upsertBookContinuation(input: BookContinuationInput): void {
  const norm = normalizeInput(input);
  if (!norm.threadId) return;
  try {
    const db = getDb("kokuzo");
    const now = new Date().toISOString();
    const existing = db
      .prepare(
        `SELECT id FROM book_continuation_memory WHERE thread_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(norm.threadId) as { id: number } | undefined;

    if (existing?.id != null) {
      db.prepare(
        `UPDATE book_continuation_memory
         SET book_mode_requested = ?,
             target_length_hint = ?,
             chapter_title = ?,
             center_topic = ?,
             last_book_intent = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(
        norm.bookModeRequested,
        norm.targetLengthHint,
        norm.chapterTitle,
        norm.centerTopic,
        norm.lastBookIntent,
        now,
        existing.id
      );
    } else {
      db.prepare(
        `INSERT INTO book_continuation_memory (
           thread_id,
           book_mode_requested,
           target_length_hint,
           chapter_title,
           center_topic,
           last_book_intent,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        norm.threadId,
        norm.bookModeRequested,
        norm.targetLengthHint,
        norm.chapterTitle,
        norm.centerTopic,
        norm.lastBookIntent,
        now
      );
    }
  } catch {
    // best-effort: do not break chat
  }
}
