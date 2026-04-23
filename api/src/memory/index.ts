import type { MemoryMessage, MemoryRole } from "./memoryTypes.js";
import { getDb } from "../db/index.js";
import { conversationAppend, conversationClear } from "./conversationStore.js";
import { type McLedgerAppendResultV1, tryAppendMcMemoryLedgerV1 } from "../mc/ledger/mcLedger.js";
import { kokuzoClear, kokuzoMaybeUpdate } from "./kokuzoCore.js";
import { sessionMemoryAdd, sessionMemoryClear, sessionMemoryCount, sessionMemoryRead } from "./sessionMemory.js";

export type PersistedTurn = {
  sessionId: string;
  role: MemoryRole;
  content: string;
  timestamp: string;
};

export function memoryInit(): void {
  // init DB on first use
  getDb("kokuzo");
}

export function memoryReadSession(sessionId: string, limit = 200): MemoryMessage[] {
  memoryInit();
  return sessionMemoryRead(sessionId, limit);
}

export function memorySessionCount(sessionId: string): number {
  memoryInit();
  return sessionMemoryCount(sessionId);
}

export function memoryClearSession(sessionId: string): void {
  memoryInit();
  sessionMemoryClear(sessionId);
  conversationClear(sessionId);
  kokuzoClear(sessionId);
}

export function memoryPersistMessage(
  sessionId: string,
  role: MemoryRole,
  content: string,
  options?: { requestId?: string; onLedgerWrite?: (result: McLedgerAppendResultV1) => void },
): PersistedTurn {
  memoryInit();

  const msg = sessionMemoryAdd(sessionId, role, content);
  const conv = conversationAppend(sessionId, role, content);
  kokuzoMaybeUpdate(sessionId);

  try {
    const result = tryAppendMcMemoryLedgerV1({
      requestId: options?.requestId,
      threadId: sessionId,
      turnIndex: conv.turnIndex,
      source: "memory",
      historyLen: -1,
      historyPreview: { role, head: String(content || "").slice(0, 80) },
      exactCount: -1,
      prefixCount: -1,
      persistedSuccess: 1,
    });
    try {
      options?.onLedgerWrite?.(result);
    } catch {}
  } catch {}

  return {
    sessionId,
    role,
    content,
    timestamp: msg.ts,
  };
}
