export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ChatRequest = {
  message: string;
  sessionId: string;
  meta?: Record<string, any>;
};

export type ChatResponse = {
  response: string;
  timestamp?: string;
};
