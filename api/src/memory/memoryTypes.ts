export type MemoryRole = "user" | "assistant";

export type SessionMemoryRow = {
  sessionId: string;
  role: MemoryRole;
  content: string;
  timestamp: string; // ISO 8601
};

export type ConversationLogRow = {
  sessionId: string;
  turnIndex: number;
  role: MemoryRole;
  content: string;
  createdAt: string; // ISO 8601
};

export type KokuzoCoreRow = {
  key: string;
  summary: string;
  importance: number;
  updatedAt: string; // ISO 8601
};

// API response shape used by existing routes
export type MemoryMessage = {
  role: MemoryRole;
  content: string;
  ts: string; // ISO 8601
};

export type MemoryReadResponseBody = {
  sessionId: string;
  memory: MemoryMessage[];
};

export type MemoryClearResponseBody = {
  sessionId: string;
  cleared: true;
};
