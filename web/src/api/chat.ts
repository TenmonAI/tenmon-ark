import type { ChatRequest, ChatResponse } from "../types/chat";
import { getChatApiUrl } from "../config/api.js";

/**
 * TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1
 * POST /api/chat — payload は { message, threadId } のみ（session_id 等の別名は付けない）
 */
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
  // TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1: mainline は threadId のみを正とする
  const normalizedThreadId = String(data?.threadId ?? "").trim() || String(req.threadId ?? "").trim();
  return {
    ...data,
    threadId: normalizedThreadId || undefined,
  };
}
