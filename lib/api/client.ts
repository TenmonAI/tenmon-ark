import { API_BASE_URL } from "../../constants/env";
import { ChatResponseSchema } from "./schema";
import { normalizeChatResponse } from "./normalize";
import type { NormalizedChatResponse, ApiError } from "../../types/api";

type PostChatArgs = {
  threadId: string;
  message: string;
};

const CHAT_TIMEOUT_MS = 30_000;

function makeApiError(error: ApiError): ApiError {
  return error;
}

export async function postChat(args: PostChatArgs): Promise<NormalizedChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  const url = `${API_BASE_URL.replace(/\/$/, "")}/api/chat`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadId: args.threadId,
        message: args.message,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Network error";
    throw makeApiError({ kind: "network", message });
  } finally {
    clearTimeout(timeoutId);
  }

  let rawBody: unknown;

  if (!response.ok) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      // ignore
    }
    throw makeApiError({
      kind: "server",
      status: response.status,
      message: text || `Server error (${response.status})`,
    });
  }

  try {
    rawBody = await response.json();
  } catch (err: any) {
    throw makeApiError({
      kind: "parse",
      message: `Failed to parse JSON: ${err?.message || "unknown error"}`,
    });
  }

  const parsedResult = ChatResponseSchema.safeParse(rawBody);
  if (!parsedResult.success) {
    throw makeApiError({
      kind: "parse",
      message: "Response schema validation failed",
    });
  }

  return normalizeChatResponse(parsedResult.data, rawBody);
}

