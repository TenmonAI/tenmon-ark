export const API_BASE_URL = "";

export const API_CHAT_URL = API_BASE_URL + "/api/chat";
export const API_CHAT_FRONT_URL = API_BASE_URL + "/api/chat_front";

export function getChatApiMode(): "legacy" | "front" {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("CHAT_API_MODE") : null;
    if (v === "legacy") return "legacy";
    if (v === "front") return "front";
    return "front";
  } catch {
    return "front";
  }
}

export function getChatApiUrl(): string {
  return getChatApiMode() === "front" ? API_CHAT_FRONT_URL : API_CHAT_URL;
}
