export const API_BASE_URL = "";

export const API_CHAT_URL = API_BASE_URL + "/api/chat";
export const API_CHAT_FRONT_URL = API_BASE_URL + "/api/chat_front";

export function getChatApiMode(): "legacy" | "front" {
  // UI 側は /api/chat に統一。将来のため enum は残すが常に legacy を返す。
  return "legacy";
}

export function getChatApiUrl(): string {
  // 常に /api/chat を使う
  return API_CHAT_URL;
}
