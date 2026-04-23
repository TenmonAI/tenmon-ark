// LLM ラッパー（TENMON-ARK人格接続済み）
// LLM_WRAPPER_V5: Gemini retry + abort detection + Oracle OpenAI fixed
import { type McLedgerAppendResultV1, tryAppendMcLlmExecutionLedgerV1, tryAppendMcSourceMapLedgerV1 } from "../mc/ledger/mcLedger.js";
export type LlmProvider = "openai" | "gemini";

export type LlmChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

/** Optional MC vNext ledger correlation (CARD_MC_VNEXT_COLLECTOR_AND_LEDGER_V1). */
export type LlmLedgerCtxV1 = {
  requestId?: string;
  threadId: string;
  turnIndex: number;
  routeReason: string;
  inputHash: string;
  onLedgerWrite?: (result: McLedgerAppendResultV1) => void;
};

export type LlmChatInput = {
  system: string;
  history?: LlmChatHistoryItem[];
  user: string;
  provider?: LlmProvider;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  /** When set, append-only mc_llm_execution_ledger row (fail-open). */
  ledgerCtx?: LlmLedgerCtxV1;
};

export type LlmChatOutput = {
  text: string;
  provider: LlmProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
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
  const rawPref = String(process.env.LLM_PRIMARY_PROVIDER || "gemini").trim();
  const pref: LlmProvider = rawPref === "openai" ? "openai" : "gemini";
  if (pref === "gemini" && hasGemini()) return "gemini";
  if (pref === "openai" && hasOpenAI()) return "openai";
  if (hasGemini()) return "gemini";
  if (hasOpenAI()) return "openai";
  throw new Error("No LLM provider configured");
}

/** 利用可能な代替プロバイダを返す。なければnull */
function alternateProvider(current: LlmProvider): LlmProvider | null {
  if (current === "openai" && hasGemini()) return "gemini";
  if (current === "gemini" && hasOpenAI()) return "openai";
  return null;
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
  // gemini-1.5-pro は廃止済み。デフォルトを gemini-2.5-flash に変更
  return String(process.env.GEMINI_MODEL || "models/gemini-2.5-flash").trim();
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

  // OPENAI_BASE_URL 環境変数をサポート（デフォルト: https://api.openai.com/v1）
  const baseUrl = String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const maxTokens = input.maxTokens ?? 2000;
  const timeoutMs = input.timeout ?? 15000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: buildOpenAIMessages(input),
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 500)}`);
    }

    const json: any = await resp.json();
    const text = String(json?.choices?.[0]?.message?.content || "").trim();
    const finishReason = String(json?.choices?.[0]?.finish_reason || "").trim();
    return {
      text,
      provider: "openai",
      model: String(json?.model || model || "").trim(),
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
      finishReason,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function callGemini(input: LlmChatInput, model: string): Promise<LlmChatOutput> {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const maxTokens = input.maxTokens ?? 2000;
  const timeoutMs = input.timeout ?? 30000;

  // モデル名に models/ プレフィックスがなければ付与
  const fullModel = model.startsWith("models/") ? model : `models/${model}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[GEMINI-CALL] requestedModel=${model} effectiveModel=${fullModel} provider=gemini maxTok=${maxTokens} timeoutMs=${timeoutMs}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/${fullModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: buildGeminiContents(input),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: maxTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 500)}`);
    }

    const json: any = await resp.json();
    const text = String(
      json?.candidates?.[0]?.content?.parts?.map((p: any) => String(p?.text || "")).join("") || ""
    ).trim();

    const finishReason = String(
      json?.candidates?.[0]?.finishReason ||
      json?.candidates?.[0]?.finish_reason ||
      ""
    ).trim();

    return {
      text,
      provider: "gemini",
      model: fullModel,
      inputTokens: json?.usageMetadata?.promptTokenCount,
      outputTokens: json?.usageMetadata?.candidatesTokenCount,
      finishReason,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/** abort/timeout系のエラーかどうかを判定 */
function __isAbortLikeError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("aborted") || msg.includes("aborterror") || msg.includes("timed out") ||
    msg.includes("timeout") || msg.includes("abort") || msg.includes("econnreset") ||
    msg.includes("socket hang up") || msg.includes("network");
}

/**
 * llmChat — TENMON-ARK人格を正しくロール分離して LLM に送信する。
 *
 * V5変更点:
 * 1. Gemini → Gemini retry (timeout延長) → OpenAI の3段階フォールバック
 * 2. abort/timeout系エラーの場合のみGemini retryを実行
 * 3. Gemini retryではtimeoutを1.5倍に延長
 * 4. 宿曜Oracle等で明示的にproviderが指定された場合はretryなしで即座にfallback
 */
export async function llmChat(input: LlmChatInput): Promise<LlmChatOutput> {
  const __ledgerFlush = (
    out: LlmChatOutput,
    requestedModel: string,
    extras?: { retryProvider?: string; retryOutLen?: number },
  ): LlmChatOutput => {
    const ctx = input.ledgerCtx;
    if (ctx) {
      const result = tryAppendMcLlmExecutionLedgerV1({
        requestId: ctx.requestId,
        threadId: ctx.threadId,
        turnIndex: ctx.turnIndex,
        provider: String(out.providerUsed || out.provider || ""),
        requestedModel: String(requestedModel || "").slice(0, 256),
        effectiveModel: String(out.model || "").slice(0, 256),
        maxTokensPlanned: Number(input.maxTokens ?? 0),
        timeoutMs: Number(input.timeout ?? 0),
        thinkingBudget: null,
        finishReason: String(out.finishReason || (out.ok === false ? "error" : "stop")),
        outLen: String(out.text ?? "").length,
        retryProvider: String(extras?.retryProvider ?? ""),
        retryOutLen: Number(extras?.retryOutLen ?? 0),
      });
      try {
        ctx.onLedgerWrite?.(result);
      } catch {}
      try {
        tryAppendMcSourceMapLedgerV1({
          githubRepo: String(process.env.GITHUB_REPOSITORY || "tenmon-ark-repo").slice(0, 128),
          threadId: ctx.threadId,
          turnIndex: ctx.turnIndex,
          filePath: "api/src/core/llmWrapper.ts",
          runtimeNode: String(out.providerUsed || out.provider || "llm").slice(0, 128),
          role: "llm_execution",
        });
      } catch {}
    }
    return out;
  };

  let primaryProvider: LlmProvider;
  try {
    primaryProvider = pickProvider(input.provider);
  } catch (e: any) {
    const r: LlmChatOutput = {
      text: "",
      provider: "openai",
      model: "none",
      ok: false,
      err: String(e?.message || "No LLM provider configured"),
      providerPlanned: "openai",
      providerUsed: "",
    };
    return __ledgerFlush(r, String(input.model || "none"));
  }

  const primaryModel = pickModel(primaryProvider, input.model);

  // 1. プライマリプロバイダで試行
  try {
    const out = primaryProvider === "openai"
      ? await callOpenAI(input, primaryModel)
      : await callGemini(input, primaryModel);

    if (!String(out.text || "").trim()) {
      throw new Error(`${primaryProvider} empty response`);
    }
    return __ledgerFlush(
      {
        ...out,
        ok: true,
        err: "",
        providerPlanned: primaryProvider,
        providerUsed: primaryProvider,
      },
      primaryModel,
    );
  } catch (primaryErr: any) {
    const primaryErrMsg = String(primaryErr?.message || primaryErr || "primary_failed");
    try { console.error("[llmChat] primary failed:", primaryProvider, primaryModel, primaryErrMsg); } catch {}

    // 2. Gemini primary + abort系エラー → Gemini retry（timeout 1.5倍）
    // 明示的にproviderが指定された場合（Oracle等）はretryスキップ
    if (primaryProvider === "gemini" && !input.provider && __isAbortLikeError(primaryErr)) {
      const retryTimeout = Math.round((input.timeout || 30000) * 1.5);
      const retryInput = { ...input, timeout: retryTimeout };
      try {
        console.log(`[llmChat] Gemini retry with timeout=${retryTimeout}ms`);
        const out = await callGemini(retryInput, primaryModel);
        if (!String(out.text || "").trim()) {
          throw new Error("gemini retry empty response");
        }
        return __ledgerFlush(
          {
            ...out,
            ok: true,
            err: "",
            providerPlanned: primaryProvider,
            providerUsed: "gemini",
          },
          primaryModel,
          {
            retryProvider: "gemini_retry",
            retryOutLen: String(out.text || "").length,
          },
        );
      } catch (retryErr: any) {
        const retryErrMsg = String(retryErr?.message || retryErr || "retry_failed");
        try { console.error("[llmChat] Gemini retry failed:", retryErrMsg); } catch {}
        // retryも失敗 → OpenAI fallbackへ
      }
    }

    // 3. 代替プロバイダで自動フォールバック
    const alt = alternateProvider(primaryProvider);
    if (alt) {
      const altModel = pickModel(alt);
      try {
        console.log(`[llmChat] fallback to ${alt} (${altModel})`);
        const out = alt === "openai"
          ? await callOpenAI(input, altModel)
          : await callGemini(input, altModel);

        if (!String(out.text || "").trim()) {
          throw new Error(`${alt} empty response`);
        }
        return __ledgerFlush(
          {
            ...out,
            ok: true,
            err: "",
            providerPlanned: primaryProvider,
            providerUsed: alt,
          },
          primaryModel,
          {
            retryProvider: String(primaryProvider),
            retryOutLen: String(out.text || "").length,
          },
        );
      } catch (altErr: any) {
        const altErrMsg = String(altErr?.message || altErr || "fallback_failed");
        try { console.error("[llmChat] fallback also failed:", alt, altModel, altErrMsg); } catch {}
        return __ledgerFlush(
          {
            text: "",
            provider: primaryProvider,
            model: primaryModel,
            ok: false,
            err: `primary(${primaryProvider}): ${primaryErrMsg}; fallback(${alt}): ${altErrMsg}`,
            providerPlanned: primaryProvider,
            providerUsed: "",
          },
          primaryModel,
        );
      }
    }

    // 代替プロバイダなし
    return __ledgerFlush(
      {
        text: "",
        provider: primaryProvider,
        model: primaryModel,
        ok: false,
        err: primaryErrMsg,
        providerPlanned: primaryProvider,
        providerUsed: "",
      },
      primaryModel,
    );
  }
}
