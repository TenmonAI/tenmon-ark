/**
 * PWA chat API 契約（TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1）
 * 正典順（解決）: URL の threadId > backend response.threadId > localStorage > 新規生成
 *
 * 本線は threadId のみ。チャット POST に旧 session 名義のキーを載せない（Training 等の別 API は別型）。
 */
export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

/** POST /api/chat リクエスト（threadId を正とする） */
export type ChatRequest = {
  message: string;
  threadId: string;
  /** 互換: backend 側が sessionId を受ける経路でも threadId を正とする */
  sessionId?: string;
};

/** POST /api/chat レスポンス（backend は threadId を返し得る） */
export type ChatResponse = {
  response: string;
  timestamp: string;
  threadId?: string;
  /** 互換: 旧経路の sessionId 応答を threadId へ正規化するため */
  sessionId?: string;
  decisionFrame?: {
    ku?: {
      routeReason?: string;
      responsePlan?: unknown;
      surfaceStyle?: string;
      closingType?: string;
      threadCoreLinkSurfaceV1?: unknown;
      threadCore?: unknown;
    };
  };
  threadCoreLinkSurfaceV1?: unknown;
};
