export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ChatRequest = {
  message: string;
  sessionId: string;
  persona: "tenmon";
};

export type ChatResponse = {
  response: string;
  timestamp: string;
};
