// LLM ラッパー（天聞アーク人格接続済み）
// TENMON_PHASE6_5_LLM_WRAPPER_PERSONA_RELINK_V1
// TENMON_DEEP_ANALYSIS_V3: 深層解析モード対応（動的max_tokens/timeout）

/**
 * LLM 設定（llm.ts の LLM_CONFIG と同一ソースを参照）
 * 環境変数から読み取り、callLLMMessages で直接 OpenAI API を呼ぶ。
 */
const WRAPPER_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || "",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  timeout: 15000,
} as const;

export type LlmChatHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * OpenAI Chat Completions API を messages 配列で正しく呼び出す。
 * V3: max_tokens と timeout を動的に指定可能に。
 */
async function callLLMMessages(
  messages: LlmChatHistoryItem[],
  opts?: { maxTokens?: number; timeout?: number },
): Promise<string | null> {
  if (!WRAPPER_CONFIG.apiKey || WRAPPER_CONFIG.apiKey.trim().length === 0) {
    console.log("[LLM-WRAPPER] API key not configured, returning fallback");
    return "（LLM未設定のため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
  }

  const maxTokens = opts?.maxTokens ?? 2000;
  const timeoutMs = opts?.timeout ?? WRAPPER_CONFIG.timeout;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `${WRAPPER_CONFIG.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WRAPPER_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: WRAPPER_CONFIG.model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(`[LLM-WRAPPER] API error: ${response.status} ${errorText}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.error("[LLM-WRAPPER] Invalid response format");
      return null;
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[LLM-WRAPPER] Timeout");
    } else {
      console.error(
        `[LLM-WRAPPER] Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }
}

/**
 * llmChat — 天聞アーク人格を正しくロール分離して LLM に送信する。
 *
 * V3変更点:
 * 1. maxTokens / timeout をオプションで指定可能
 * 2. 深層解析モード時は maxTokens=3500, timeout=25000 を推奨
 */
export async function llmChat(params: {
  system: string;
  history: LlmChatHistoryItem[];
  user: string;
  maxTokens?: number;
  timeout?: number;
}): Promise<{ text: string; provider: string }> {
  const messages: LlmChatHistoryItem[] = [];

  // 1. system ロール（天聞人格プロンプト）
  if (params.system && params.system.trim()) {
    messages.push({ role: "system", content: params.system.trim() });
  }

  // 2. history（会話履歴）
  for (const m of params.history) {
    messages.push({
      role: m.role === "system" ? "user" : m.role, // history 内の system は user に降格
      content: m.content,
    });
  }

  // 3. user メッセージ
  messages.push({ role: "user", content: params.user });

  const out = await callLLMMessages(messages, {
    maxTokens: params.maxTokens,
    timeout: params.timeout,
  });

  if (out === null) {
    return {
      text: "（LLM接続に失敗したため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）",
      provider: "fallback",
    };
  }

  return { text: out.trim(), provider: "llm" };
}
