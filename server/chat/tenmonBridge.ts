/**
 * TENMON Bridge v1
 * ================
 * server/ (PWA) から api/ (天聞エンジン) への接続ブリッジ。
 *
 * 設計原則:
 *   - server/ の既存アーキテクチャを壊さない
 *   - api/ のコードを server/ にコピペしない
 *   - HTTP 内部呼び出しで疎結合を維持する
 *   - api/ が到達不能な場合は server/ 既存フローにフォールバック
 *
 * カード: TENMON_PHASE7_API_PWA_BRIDGE_V1
 * 作成日: 2026-04-12
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenmonBridgeInput {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: number;
  language: string;
  sessionId?: string;
}

export interface TenmonBridgeOutput {
  /** 天聞エンジンの応答テキスト */
  response: string;
  /** ルーティング判定フレーム */
  decisionFrame?: {
    mode: string;
    intent?: string;
    ku_routeReason?: string;
  };
  /** kanagi エンジンのトレース（デバッグ用） */
  kanagiTrace?: unknown;
  /** ブリッジ経由で応答が生成されたか */
  bridged: true;
}

export interface TenmonBridgeFallback {
  bridged: false;
  reason: string;
}

export type TenmonBridgeResult = TenmonBridgeOutput | TenmonBridgeFallback;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TENMON_API_URL = process.env.TENMON_API_URL || "http://localhost:3000";
const BRIDGE_TIMEOUT_MS = parseInt(process.env.TENMON_BRIDGE_TIMEOUT || "15000", 10);
const BRIDGE_ENABLED = process.env.TENMON_BRIDGE_ENABLED !== "false"; // default: enabled

// ---------------------------------------------------------------------------
// Core Bridge Function
// ---------------------------------------------------------------------------

/**
 * api/ の天聞エンジンを呼び出し、応答を返す。
 * api/ が到達不能な場合は `{ bridged: false }` を返し、
 * 呼び出し元（chatAI.ts）が既存フローにフォールバックできるようにする。
 */
export async function invokeTenmonEngine(
  input: TenmonBridgeInput,
): Promise<TenmonBridgeResult> {
  if (!BRIDGE_ENABLED) {
    return { bridged: false, reason: "TENMON_BRIDGE_ENABLED=false" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);

    const res = await fetch(`${TENMON_API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenmon-Bridge": "server-v1",
        "X-Tenmon-UserId": String(input.userId),
      },
      body: JSON.stringify({
        message: input.userMessage,
        sessionId: input.sessionId || `bridge-${input.userId}-${Date.now()}`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(
        `[TenmonBridge] api/ returned ${res.status}: ${res.statusText}`,
      );
      return { bridged: false, reason: `api_status_${res.status}` };
    }

    const data = await res.json() as {
      response?: string;
      decisionFrame?: { mode: string; intent?: string };
      trace?: unknown;
      error?: string;
    };

    if (data.error || !data.response) {
      console.warn("[TenmonBridge] api/ returned error or empty response:", data.error);
      return { bridged: false, reason: data.error || "empty_response" };
    }

    return {
      response: data.response,
      decisionFrame: data.decisionFrame
        ? {
            mode: data.decisionFrame.mode,
            intent: data.decisionFrame.intent,
          }
        : undefined,
      kanagiTrace: data.trace,
      bridged: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // AbortError = timeout
    if (message.includes("abort")) {
      console.warn(`[TenmonBridge] api/ timeout (${BRIDGE_TIMEOUT_MS}ms)`);
      return { bridged: false, reason: "timeout" };
    }
    // Connection refused = api/ not running
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      console.warn("[TenmonBridge] api/ not reachable");
      return { bridged: false, reason: "api_unreachable" };
    }
    console.error("[TenmonBridge] unexpected error:", message);
    return { bridged: false, reason: `unexpected: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * api/ の天聞エンジンが到達可能かチェックする。
 * 起動時やヘルスチェックエンドポイントで使用。
 */
export async function checkTenmonApiHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  reason?: string;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${TENMON_API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    return {
      available: res.ok,
      latencyMs,
      reason: res.ok ? undefined : `status_${res.status}`,
    };
  } catch (err: unknown) {
    return {
      available: false,
      latencyMs: Date.now() - start,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
