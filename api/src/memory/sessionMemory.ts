import { dbPrepare } from "../db/index.js";
import type { MemoryMessage, MemoryRole } from "./memoryTypes.js";

function nowIso(): string {
  return new Date().toISOString();
}

const insertStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO session_memory (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)"
);

const readStmt = dbPrepare(
  "kokuzo",
  "SELECT role, content, timestamp FROM session_memory WHERE session_id = ? ORDER BY id DESC LIMIT ?"
);

const clearStmt = dbPrepare("kokuzo", "DELETE FROM session_memory WHERE session_id = ?");

export function sessionMemoryAdd(sessionId: string, role: MemoryRole, content: string): MemoryMessage {
  const ts = nowIso();
  insertStmt.run(sessionId, role, content, ts);
  return { role, content, ts };
}

export function sessionMemoryRead(sessionId: string, limit = 200): MemoryMessage[] {
  const rows = readStmt.all(sessionId, limit) as Array<{ role: MemoryRole; content: string; timestamp: string }>;
  // read is DESC; return ascending
  return rows
    .reverse()
    .map((r) => ({ role: r.role, content: r.content, ts: r.timestamp }));
}

export function sessionMemoryClear(sessionId: string): void {
  clearStmt.run(sessionId);
}
