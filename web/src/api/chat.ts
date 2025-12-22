import type { ChatRequest, ChatResponse } from "../types/chat";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: req.message,
      session_id: req.sessionId,
    })
  });

  const data = (await res.json()) as ChatResponse;
  return data;
}
