import type { MemoryMessage, MemoryRole } from "./memoryTypes.js";
import { getDb } from "../db/index.js";
import { conversationAppend, conversationClear } from "./conversationStore.js";
import { kokuzoClear, kokuzoMaybeUpdate } from "./kokuzoCore.js";
import { sessionMemoryAdd, sessionMemoryClear, sessionMemoryRead } from "./sessionMemory.js";

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

export function memoryClearSession(sessionId: string): void {
  memoryInit();
  sessionMemoryClear(sessionId);
  conversationClear(sessionId);
  kokuzoClear(sessionId);
}

export function memoryPersistMessage(sessionId: string, role: MemoryRole, content: string): PersistedTurn {
  memoryInit();

  const msg = sessionMemoryAdd(sessionId, role, content);
  conversationAppend(sessionId, role, content);
  kokuzoMaybeUpdate(sessionId);

  return {
    sessionId,
    role,
    content,
    timestamp: msg.ts,
  };
}
