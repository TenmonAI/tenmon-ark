import { dbPrepare } from "../db/index.js";
import type { ConversationLogRow, MemoryRole } from "./memoryTypes.js";

function nowIso(): string {
  return new Date().toISOString();
}

const nextTurnStmt = dbPrepare(
  "kokuzo",
  "SELECT COALESCE(MAX(turn_index), -1) + 1 AS next_turn FROM conversation_log WHERE session_id = ?"
);

const insertStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO conversation_log (session_id, turn_index, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
);

const readRecentStmt = dbPrepare(
  "kokuzo",
  "SELECT session_id, turn_index, role, content, created_at FROM conversation_log WHERE session_id = ? ORDER BY turn_index DESC LIMIT ?"
);

const countStmt = dbPrepare(
  "kokuzo",
  "SELECT COUNT(1) AS cnt FROM conversation_log WHERE session_id = ?"
);

const clearStmt = dbPrepare("kokuzo", "DELETE FROM conversation_log WHERE session_id = ?");

export function conversationAppend(sessionId: string, role: MemoryRole, content: string): ConversationLogRow {
  const next = nextTurnStmt.get(sessionId) as { next_turn: number };
  const turnIndex = Number(next.next_turn);
  const createdAt = nowIso();

  insertStmt.run(sessionId, turnIndex, role, content, createdAt);

  return { sessionId, turnIndex, role, content, createdAt };
}

export function conversationCount(sessionId: string): number {
  const row = countStmt.get(sessionId) as { cnt: number };
  return Number(row.cnt);
}

export function conversationReadRecent(sessionId: string, limit = 50): ConversationLogRow[] {
  const rows = readRecentStmt.all(sessionId, limit) as Array<{
    session_id: string;
    turn_index: number;
    role: MemoryRole;
    content: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    sessionId: r.session_id,
    turnIndex: Number(r.turn_index),
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export function conversationClear(sessionId: string): void {
  clearStmt.run(sessionId);
}
