export type LlmProvider = "openai" | "gemini";

export type LlmChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type LlmChatInput = {
  system: string;
  history?: LlmChatHistoryItem[];
  user: string;
  provider?: LlmProvider;
  model?: string;
};

export type LlmChatOutput = {
  text: string;
  provider: LlmProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  ok?: boolean;
  err?: string;
  providerPlanned?: LlmProvider;
  providerUsed?: LlmProvider | "";
};

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}
function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());
}

function pickProvider(explicit?: LlmProvider): LlmProvider {
  if (explicit) return explicit;
  if (hasOpenAI()) return "openai";
  if (hasGemini()) return "gemini";
  throw new Error("No LLM provider configured");
}

export function getLlmProviderReadinessV1() {
  const openai = hasOpenAI();
  const gemini = hasGemini();
  return {
    hasOpenAI: openai,
    hasGemini: gemini,
    providerPlanned: openai ? "openai" : gemini ? "gemini" : "",
    ok: openai || gemini,
    err: openai || gemini ? "" : "No LLM provider configured",
  } as const;
}

function pickModel(provider: LlmProvider, explicit?: string): string {
  if (explicit && String(explicit).trim()) {
    const m = String(explicit).trim();
    if (m === "gpt-5.4") return String(process.env.OPENAI_MODEL || "gpt-4o").trim();
    return m;
  }
  if (provider === "openai") return String(process.env.OPENAI_MODEL || "gpt-4o").trim();
  return String(process.env.GEMINI_MODEL || "models/gemini-1.5-pro").trim();
}

function buildOpenAIMessages(input: LlmChatInput) {
  const out: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  out.push({ role: "system", content: String(input.system || "") });
  for (const h of input.history || []) {
    if (!h?.content) continue;
    out.push({ role: h.role, content: h.content });
  }
  out.push({ role: "user", content: String(input.user || "") });
  return out;
}

function buildGeminiContents(input: LlmChatInput) {
  const out: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  const sys = String(input.system || "").trim();
  if (sys) out.push({ role: "user", parts: [{ text: `SYSTEM:\n${sys}` }] });
  for (const h of input.history || []) {
    if (!h?.content) continue;
    out.push({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    });
  }
  out.push({ role: "user", parts: [{ text: String(input.user || "") }] });
  return out;
}

async function callOpenAI(input: LlmChatInput, model: string): Promise<LlmChatOutput> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildOpenAIMessages(input),
      temperature: 0.4,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 500)}`);
  }

  const json: any = await resp.json();
  const text = String(json?.choices?.[0]?.message?.content || "").trim();
  return {
    text,
    provider: "openai",
    model,
    inputTokens: json?.usage?.prompt_tokens,
    outputTokens: json?.usage?.completion_tokens,
  };
}

async function callGemini(input: LlmChatInput, model: string): Promise<LlmChatOutput> {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: buildGeminiContents(input),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 500)}`);
  }

  const json: any = await resp.json();
  const text = String(
    json?.candidates?.[0]?.content?.parts?.map((p: any) => String(p?.text || "")).join("") || ""
  ).trim();

  return {
    text,
    provider: "gemini",
    model,
    inputTokens: json?.usageMetadata?.promptTokenCount,
    outputTokens: json?.usageMetadata?.candidatesTokenCount,
  };
}

export async function llmChat(input: LlmChatInput): Promise<LlmChatOutput> {
  try {
    const provider = pickProvider(input.provider);
    const model = pickModel(provider, input.model);
    const out = provider === "openai"
      ? await callOpenAI(input, model)
      : await callGemini(input, model);

    if (!String(out.text || "").trim()) {
      throw new Error(`${provider} empty response`);
    }
    return {
      ...out,
      ok: true,
      err: "",
      providerPlanned: provider,
      providerUsed: provider,
    };
  } catch (e: any) {
    const ready = getLlmProviderReadinessV1();
    const providerFallback = (input.provider || (ready.providerPlanned as LlmProvider) || "openai") as LlmProvider;
    const model = pickModel(providerFallback, input.model);
    const errMsg = String(e?.message || e || "llm_chat_failed");
    try { console.error("[llmChat]", providerFallback, model, errMsg); } catch {}
    return {
      text: "",
      provider: providerFallback,
      model,
      ok: false,
      err: errMsg,
      providerPlanned: providerFallback,
      providerUsed: "",
    };
  }
}
