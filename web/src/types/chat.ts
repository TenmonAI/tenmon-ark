export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ChatRequest = {
  message: string;
  threadId: string; // API側のthreadIdに統一（旧sessionIdからリネーム）
  meta?: Record<string, any>;
};

export type ChatResponse = {
  response: string;
  timestamp?: string;
};
