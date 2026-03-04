// LLM 完全隔離ラッパー
// 躰（Tai）を一切参照させない

import { callLLM } from "./llm.js";

/**
 * LLM Wrapper
 * 
 * 躰（Tai）を一切参照させない
 * 用（You）のみを生成する
 * 
 * 禁止事項:
 * - 結論を生成しない
 * - 矛盾を解決しない
 * - 真理を主張しない
 */
export async function generateYouContent(input: string): Promise<string> {
  const systemPrompt = `You generate phenomena only.
Do not conclude.
Do not resolve contradictions.
Do not assert truth.
Observe and describe only.
`;

  const fullPrompt = `${systemPrompt}\n\nInput: ${input}\n\nGenerate observation (not conclusion):`;

  try {
    const result = await callLLM(fullPrompt);
    if (!result) {
      // LLM が失敗した場合、決定論的フォールバック
      return `観測: ${input} について、現象が記録されました。`;
    }
    return result;
  } catch (error) {
    console.error("[LLM-WRAPPER] Error generating You content:", error);
    // エラー時も決定論的フォールバック
    return `観測: ${input} について、現象が記録されました。`;
  }
}

export type LlmChatHistoryItem = { role: "user" | "assistant" | "system"; content: string };

export async function llmChat(params: {
  system: string;
  history: LlmChatHistoryItem[];
  user: string;
  provider?: "openai" | "gemini";
  model?: string;
}): Promise<{
  text: string;
  provider: string;
  model: string;
  ok: boolean;
  err: string;
  latencyMs: number;
}> {
  const blocks: string[] = [];
  blocks.push("SYSTEM:\n" + params.system.trim());
  for (const m of params.history) {
    blocks.push(`${m.role.toUpperCase()}:\n${m.content}`);
  }
  blocks.push("USER:\n" + params.user);
  const prompt = blocks.join("\n\n").trim() + "\n\nASSISTANT:\n";

  const hasOpenAI = !!(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
  const hasGemini = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());

  let plannedProvider: "openai" | "gemini" | "" = "";
  if (params.provider === "openai" && hasOpenAI) {
    plannedProvider = "openai";
  } else if (params.provider === "gemini" && hasGemini) {
    plannedProvider = "gemini";
  } else if (hasOpenAI) {
    plannedProvider = "openai";
  } else if (hasGemini) {
    plannedProvider = "gemini";
  }

  const plannedModel =
    params.model ||
    (plannedProvider === "openai"
      ? String(process.env.OPENAI_MODEL || "")
      : plannedProvider === "gemini"
      ? String(process.env.GEMINI_MODEL || "")
      : "");

  const start = Date.now();
  const timeoutMs = 10000;

  const makeResult = (
    text: string,
    provider: string,
    model: string,
    ok: boolean,
    err: string
  ) => ({
    text: String(text ?? "").trim(),
    provider,
    model,
    ok,
    err,
    latencyMs: Date.now() - start,
  });

  // helper: with timeout
  async function withTimeout<T>(p: Promise<T>): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const result = await Promise.race([p, timeoutPromise]) as T;
      clearTimeout(timeoutId!);
      return result;
    } catch (e) {
      clearTimeout(timeoutId!);
      throw e;
    }
  }

  // No specific provider available: fall back to existing callLLM behavior
  if (!plannedProvider) {
    try {
      const out = await withTimeout(callLLM(prompt));
      const txt = (out ?? "").trim();
      const ok = !!txt;
      return makeResult(txt, "", "", ok, ok ? "" : "empty");
    } catch (e: any) {
      return makeResult("", "", "", false, String(e?.message || e || "timeout"));
    }
  }

  if (plannedProvider === "openai") {
    try {
      const out = await withTimeout(callLLM(prompt));
      const txt = (out ?? "").trim();
      const ok = !!txt;
      return makeResult(
        txt,
        "openai",
        plannedModel || String(process.env.OPENAI_MODEL || ""),
        ok,
        ok ? "" : "empty"
      );
    } catch (e: any) {
      return makeResult(
        "",
        "openai",
        plannedModel || String(process.env.OPENAI_MODEL || ""),
        false,
        String(e?.message || e || "timeout")
      );
    }
  }

  // plannedProvider === "gemini"
  try {
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      const out = await withTimeout(callLLM(prompt));
      const txt = (out ?? "").trim();
      const ok = !!txt;
      return makeResult(txt, "", "", ok, ok ? "" : "empty");
    }
    const model =
      plannedModel || String(process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res: any = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }) as any
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      console.error("[LLM-WRAPPER] Gemini API error:", res.status, errText);
      return makeResult("", "gemini", model, false, `http ${res.status}`);
    }

    const data = (await res.json()) as any;
    const text =
      (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => String(p?.text || ""))
        .join("") || "";

    const txt = text.trim();
    const ok = !!txt;
    return makeResult(txt, "gemini", model, ok, ok ? "" : "empty");
  } catch (e: any) {
    console.error("[LLM-WRAPPER] Gemini call failed:", e instanceof Error ? e.message : String(e));
    return makeResult(
      "",
      "gemini",
      plannedModel || String(process.env.GEMINI_MODEL || ""),
      false,
      String(e?.message || e || "timeout")
    );
  }
}
