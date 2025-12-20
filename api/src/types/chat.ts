export type ChatRequestBody = {
  message: string;
  sessionId?: string;
};

export type ChatResponseBody = {
  response: string;
  timestamp: string;
};
