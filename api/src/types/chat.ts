export type ChatRequestBody = {
  message: string;
  sessionId?: string;
};

export type ChatResponseBody = {
  response: string;
  timestamp: string;
  trace?: unknown; // KanagiTrace（型循環を避けるため unknown）
  provisional?: boolean;
};
