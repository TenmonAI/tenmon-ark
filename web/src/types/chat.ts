export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ChatRequest = {
  message: string;
  sessionId: string;
};

export type ChatResponse = {
  response: string;
  timestamp: string;
};
