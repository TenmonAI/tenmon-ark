import type { ChatRequest, ChatResponse } from "../types/chat";
import { API_BASE_URL } from "../config/api.js";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: req.message,
      threadId: req.sessionId,
    })
  });

  const data = (await res.json()) as ChatResponse;
  return data;
}
