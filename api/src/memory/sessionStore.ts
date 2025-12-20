import type { MemoryMessage, MemoryRole } from "../types/memory.js";

type SessionRecord = {
  createdAt: string;
  updatedAt: string;
  messages: MemoryMessage[];
};

function nowIso(): string {
  return new Date().toISOString();
}

export class SessionMemoryStore {
  private sessions = new Map<string, SessionRecord>();

  read(sessionId: string): SessionRecord {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    const created = nowIso();
    const record: SessionRecord = {
      createdAt: created,
      updatedAt: created,
      messages: [],
    };
    this.sessions.set(sessionId, record);
    return record;
  }

  append(sessionId: string, role: MemoryRole, content: string): MemoryMessage {
    const record = this.read(sessionId);
    const msg: MemoryMessage = {
      role,
      content,
      ts: nowIso(),
    };
    record.messages.push(msg);
    record.updatedAt = msg.ts;
    return msg;
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const sessionStore = new SessionMemoryStore();
