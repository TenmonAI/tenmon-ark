// API接続（POST /api/chat）
import type { ChatRequest, ChatResponse } from "../types/chat";
import { API_BASE_URL } from "../config/api.js";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: req.threadId, // API側のthreadIdに統一
        message: req.message,
        meta: req.meta ?? {},
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error: ${res.status} - ${errorText.slice(0, 200)}`);
    }
    return (await res.json()) as ChatResponse;
  } finally {
    clearTimeout(t);
  }
}
