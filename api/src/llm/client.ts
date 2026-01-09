// /opt/tenmon-ark/api/src/llm/client.ts
import process from "node:process";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type LLMOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function getBaseUrl() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/+$/, "");
}

export async function llmChat(messages: ChatMsg[], opts: LLMOptions = {}) {
  const apiKey = mustEnv("OPENAI_API_KEY");
  const base = getBaseUrl();

  const model = opts.model ?? process.env.TENMON_LLM_MODEL ?? "gpt-4o-mini";
  const temperature = opts.temperature ?? 0.4;
  const max_tokens = opts.max_tokens ?? 450;

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${t}`);
  }

  const json: any = await res.json();
  const out = json?.choices?.[0]?.message?.content;
  return String(out ?? "").trim();
}

