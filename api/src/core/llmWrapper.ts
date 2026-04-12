// LLM ラッパー（天聞アーク人格接続済み）
// TENMON_PHASE6_5_LLM_WRAPPER_PERSONA_RELINK_V1

/**
 * LLM 設定（llm.ts の LLM_CONFIG と同一ソースを参照）
 * 環境変数から読み取り、callLLMMessages で直接 OpenAI API を呼ぶ。
 */
const WRAPPER_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || "",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  timeout: 8000,
} as const;

export type LlmChatHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * OpenAI Chat Completions API を messages 配列で正しく呼び出す。
 * 旧実装では system/history/user を1つの user メッセージに結合していたため、
 * ロール分離が効いていなかった。この修正で system ロールが正しく機能する。
 */
async function callLLMMessages(
  messages: LlmChatHistoryItem[],
): Promise<string | null> {
  if (!WRAPPER_CONFIG.apiKey || WRAPPER_CONFIG.apiKey.trim().length === 0) {
    console.log("[LLM-WRAPPER] API key not configured, returning fallback");
    return "（LLM未設定のため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WRAPPER_CONFIG.timeout);

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
          max_tokens: 1000,
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
 * 変更点（CARD 39）:
 * 1. system prompt を OpenAI の system ロールとして送信（旧: user ロールに結合）
 * 2. history を assistant/user ロールとして正しく送信
 * 3. generateYouContent（死コード）を削除
 *
 * 呼び出し元（chat.ts）の system 引数には既に天聞人格プロンプトが入っているため、
 * ここでは追加の人格注入は行わない。ロール分離のみを担当する。
 */
export async function llmChat(params: {
  system: string;
  history: LlmChatHistoryItem[];
  user: string;
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

  const out = await callLLMMessages(messages);

  if (out === null) {
    return {
      text: "（LLM接続に失敗したため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）",
      provider: "fallback",
    };
  }

  return { text: out.trim(), provider: "llm" };
}
