import type { ChatRequest, ChatResponse } from "../types/chat";
import { getChatApiUrl } from "../config/api.js";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(getChatApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: req.message,
      threadId: req.threadId,
    }),
  });

  const data = (await res.json()) as ChatResponse;
  return data;
}
