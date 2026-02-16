// LLM クライアント（OpenAI互換）

/**
 * LLM呼び出しの設定
 */
const LLM_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || "",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  timeout: 8000, // 8秒
} as const;

/**
 * LLMを呼び出す
 * 
 * @param prompt プロンプト
 * @returns LLMの応答（失敗時はnull）
 */
export async function callLLM(prompt: string): Promise<string | null> {
  // APIキーが無い場合は null を返す
  if (!LLM_CONFIG.apiKey || LLM_CONFIG.apiKey.trim().length === 0) {
    console.log("[LLM] API key not configured, returning null");

  // H1A_NO_NULL_FALLBACK_V1
  // H1B_NO_NULL_ALL_ERRORS_V1
  console.log("[LLM] API key not configured, returning fallback text");
  return "（LLM未設定のため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
}

  try {
    // タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_CONFIG.timeout);

    const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLM_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(`[LLM] API error: ${response.status} ${errorText}`);
      return "（LLM接続に失敗したため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
  }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      console.error("[LLM] Invalid response format");
    return "（LLM接続に失敗したため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[LLM] Timeout");
    } else {
      console.error(`[LLM] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return "（LLM接続に失敗したため、検索結果ベースで応答します。#詳細 または doc=... pdfPage=... を指定してください）";
  }
}
/**
 * LLMにJSON形式で応答させる
 * 
 * @param prompt プロンプト（JSON形式で応答することを明示）
 * @returns パースされたJSONオブジェクト（失敗時はnull）
 */
export async function callLLMJSON<T = unknown>(prompt: string): Promise<T | null> {
  const jsonPrompt = `${prompt}\n\n必ずJSON形式で応答してください。`;
  const response = await callLLM(jsonPrompt);
  
  if (!response) {
    return null;
  }

  try {
    // JSONを抽出（コードブロックがある場合を考慮）
    let jsonText = response.trim();
    
    // ```json や ``` で囲まれている場合は除去
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      const startIndex = lines[0].includes("json") ? 1 : 0;
      const endIndex = lines.length - 1;
      jsonText = lines.slice(startIndex, endIndex).join("\n");
    }
    
    const parsed = JSON.parse(jsonText) as T;
    return parsed;
  } catch (error) {
    console.error(`[LLM] JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[LLM] Response text: ${response.substring(0, 200)}`);
    return null;
  }
}

