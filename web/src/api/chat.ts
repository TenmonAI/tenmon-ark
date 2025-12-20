import type { ChatRequest, ChatResponse } from "../types/chat";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": req.sessionId
    },
    body: JSON.stringify(req)
  });

  const data = (await res.json()) as ChatResponse;
  return data;
}
