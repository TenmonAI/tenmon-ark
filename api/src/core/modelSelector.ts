/**
 * TENMON_MODEL_SELECTOR_V1 (ULTRA-11)
 * 意図ベースのLLMモデル選択 + プロンプトキャッシング戦略
 *
 * ユーザー意図の深度・応答長に基づいて最適なモデルを選択し、
 * コスト最適化を行う。
 *
 * 設計原則:
 *   - 深い問い → 高性能モデル (gemini-2.5-flash / gpt-4o)
 *   - 表層的な問い → 軽量モデル (gemini-2.5-flash-lite / gpt-4o-mini)
 *   - ゲスト → 常に軽量モデル (コスト重視)
 *   - 宿曜御神託 → 高性能モデル固定 (品質最優先)
 */

import type { UserIntent, IntentClassification } from "./intentClassifier.js";

// ============================================================
// Types
// ============================================================

export type ModelTier = "premium" | "standard" | "lite";

export interface ModelSelection {
  /** 推奨モデル名 (環境変数で上書き可能) */
  model: string;
  /** モデルティア */
  tier: ModelTier;
  /** 推奨 temperature */
  temperature: number;
  /** 推奨 maxTokens */
  maxTokens: number;
  /** プロンプトキャッシング推奨 */
  cacheHint: boolean;
  /** 選択理由 (デバッグ用) */
  reason: string;
}

export interface ModelSelectionContext {
  /** ユーザー意図分類 */
  intent?: IntentClassification;
  /** ゲストチャットか */
  isGuest?: boolean;
  /** 宿曜御神託モードか */
  isSukuyouOracle?: boolean;
  /** 宿曜関連クエリか */
  isSukuyouQuery?: boolean;
  /** deep_chat (CARRY) モードか */
  isDeepChat?: boolean;
  /** 会話ターン数 */
  turnCount?: number;
}

// ============================================================
// モデル定義
// ============================================================

/** Gemini モデル名 (環境変数で上書き可能) */
function getGeminiModel(tier: ModelTier): string {
  switch (tier) {
    case "premium":
      return String(
        process.env.GEMINI_MODEL_PREMIUM ||
          process.env.GEMINI_MODEL ||
          "models/gemini-2.5-flash",
      ).trim();
    case "standard":
      return String(
        process.env.GEMINI_MODEL ||
          "models/gemini-2.5-flash",
      ).trim();
    case "lite":
      return String(
        process.env.GEMINI_MODEL_LITE ||
          "models/gemini-2.5-flash-lite",
      ).trim();
  }
}

/** OpenAI モデル名 (環境変数で上書き可能) */
function getOpenAIModel(tier: ModelTier): string {
  switch (tier) {
    case "premium":
      return String(
        process.env.OPENAI_MODEL_PREMIUM ||
          process.env.OPENAI_MODEL ||
          "gpt-4o",
      ).trim();
    case "standard":
      return String(
        process.env.OPENAI_MODEL || "gpt-4o",
      ).trim();
    case "lite":
      return String(
        process.env.OPENAI_MODEL_LITE || "gpt-4o-mini",
      ).trim();
  }
}

// ============================================================
// selectModel
// ============================================================

/**
 * コンテキストに基づいてモデルを選択する。
 * llmWrapper.ts の pickModel/pickProvider とは独立して動作し、
 * 呼び出し側が model パラメータとして渡す。
 */
export function selectModel(ctx: ModelSelectionContext): ModelSelection {
  const provider = String(
    process.env.LLM_PRIMARY_PROVIDER || "gemini",
  ).trim();
  const isGemini = provider !== "openai";

  // ── 宿曜御神託: 常に premium ──
  if (ctx.isSukuyouOracle) {
    const tier: ModelTier = "premium";
    return {
      model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
      tier,
      temperature: 0.3,
      maxTokens: 4000,
      cacheHint: true,
      reason: "sukuyou_oracle: premium固定",
    };
  }

  // ── ゲストチャット: コスト重視で lite ──
  if (ctx.isGuest) {
    const tier: ModelTier = "lite";
    return {
      model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
      tier,
      temperature: 0.5,
      maxTokens: 800,
      cacheHint: false,
      reason: "guest: lite固定 (コスト最適化)",
    };
  }

  // ── deep_chat (CARRY): premium ──
  if (ctx.isDeepChat) {
    const tier: ModelTier = "premium";
    return {
      model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
      tier,
      temperature: 0.3,
      maxTokens: 3500,
      cacheHint: true,
      reason: "deep_chat: premium (深層対話)",
    };
  }

  // ── 意図ベースの選択 ──
  if (ctx.intent) {
    const { depth, targetTokens, primary } = ctx.intent;

    // 深い問い → premium
    if (
      depth === "deep" ||
      primary === "deep_inquiry" ||
      primary === "self_reflection" ||
      primary === "challenge"
    ) {
      const tier: ModelTier = "premium";
      return {
        model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
        tier,
        temperature: 0.3,
        maxTokens: Math.max(2500, targetTokens),
        cacheHint: true,
        reason: `intent=${primary}: premium (深い問い)`,
      };
    }

    // 表層的な問い → lite
    if (
      depth === "surface" ||
      primary === "greeting" ||
      primary === "confirmation"
    ) {
      const tier: ModelTier = "lite";
      return {
        model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
        tier,
        temperature: 0.5,
        maxTokens: Math.max(500, targetTokens),
        cacheHint: false,
        reason: `intent=${primary}: lite (表層)`,
      };
    }

    // 中間 → standard
    const tier: ModelTier = "standard";
    return {
      model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
      tier,
      temperature: 0.4,
      maxTokens: Math.max(1500, targetTokens),
      cacheHint: targetTokens > 1500,
      reason: `intent=${primary}: standard (中間)`,
    };
  }

  // ── 宿曜関連クエリ: standard ──
  if (ctx.isSukuyouQuery) {
    const tier: ModelTier = "standard";
    return {
      model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
      tier,
      temperature: 0.35,
      maxTokens: 3500,
      cacheHint: true,
      reason: "sukuyou_query: standard",
    };
  }

  // ── デフォルト: standard ──
  const tier: ModelTier = "standard";
  return {
    model: isGemini ? getGeminiModel(tier) : getOpenAIModel(tier),
    tier,
    temperature: 0.4,
    maxTokens: 2000,
    cacheHint: false,
    reason: "default: standard",
  };
}

// ============================================================
// Prompt Caching Helpers
// ============================================================

/**
 * system prompt のハッシュを計算する (簡易版)。
 * 同一ハッシュの場合、プロバイダ側のキャッシュが効く可能性がある。
 */
export function computePromptHash(systemPrompt: string): string {
  let hash = 0;
  const str = String(systemPrompt || "");
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return `ph_${(hash >>> 0).toString(36)}`;
}

/**
 * プロンプトキャッシング戦略のログ出力。
 * 実際のキャッシュはプロバイダ側 (Gemini context caching / OpenAI prompt caching) に依存。
 */
export function logModelSelection(selection: ModelSelection, promptHash: string): void {
  console.log(
    `[MODEL_SELECTOR] tier=${selection.tier} model=${selection.model} ` +
      `temp=${selection.temperature} maxTok=${selection.maxTokens} ` +
      `cache=${selection.cacheHint} hash=${promptHash} reason="${selection.reason}"`,
  );
}
