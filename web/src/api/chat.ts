// API接続（POST /api/chat）
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
      sessionId: req.sessionId,
      meta: req.meta || {},
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText.slice(0, 200)}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data;
}
