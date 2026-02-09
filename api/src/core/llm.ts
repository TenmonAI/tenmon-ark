// LLM クライアント（OpenAI互換）

type LLMConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

/**
 * LLM呼び出しの設定を取得（毎回 process.env から読み取る）
 */
function getLLMConfig(): LLMConfig {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 8000);
  return {
    apiKey: String(process.env.OPENAI_API_KEY || "").trim(),
    baseUrl: String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim(),
    model: String(process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 8000,
  };
}

/**
 * LLMを呼び出す
 * 
 * @param prompt プロンプト
 * @returns LLMの応答（失敗時はnull）
 */
export async function callLLM(prompt: string): Promise<string | null> {
  const cfg = getLLMConfig();

  if (!cfg.apiKey) {
    console.log("[LLM] API key not configured, returning null");
    return null;
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), cfg.timeoutMs);

    const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(t);

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "unknown error");
      console.error(`[LLM] API error: ${resp.status} ${errorText}`);
      return null;
    }

    const data: any = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch (e: any) {
    if (e?.name === "AbortError") console.log("[LLM] Timeout");
    else console.error(`[LLM] Error: ${e?.message ?? String(e)}`);
    return null;
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

