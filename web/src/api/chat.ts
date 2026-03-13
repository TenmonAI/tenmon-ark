import type { ChatRequest, ChatResponse } from "../types/chat";
import { getChatApiUrl } from "../config/api.js";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(getChatApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      threadId: req.sessionId,
      message: req.message,
    })
  });

  const data = (await res.json()) as ChatResponse;
  return data;
}
