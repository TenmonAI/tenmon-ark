/**
 * ULCE v3 Translation Engine
 * Universal Language Conversion Engine
 * 意味 → 構文 → 火水の翻訳パイプライン
 */

import { invokeLLM } from "../_core/llm";

export interface TranslationStage {
  stage: "meaning" | "syntax" | "fire_water";
  content: string;
  metadata?: Record<string, any>;
}

export interface ULCETranslationResult {
  original: string;
  sourceLanguage: string;
  targetLanguage: string;
  stages: TranslationStage[];
  final: string;
  confidence: number;
}

/**
 * Stage 1: 意味抽出
 * テキストの本質的な意味を抽出
 */
async function extractMeaning(text: string, sourceLanguage: string): Promise<TranslationStage> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは言語の本質的な意味を抽出する専門家です。
与えられたテキストから、文化的・言語的な装飾を取り除き、純粋な意味を抽出してください。`,
        },
        {
          role: "user",
          content: `以下のテキスト（${sourceLanguage}）の本質的な意味を抽出してください：

${text}

意味のみを簡潔に記述してください。`,
        },
      ],
    });

    const meaningContent = response.choices[0]?.message?.content;
    const meaning = typeof meaningContent === 'string' ? meaningContent : text;

    return {
      stage: "meaning",
      content: meaning,
      metadata: {
        sourceLanguage,
      },
    };
  } catch (error) {
    console.error("Failed to extract meaning:", error);
    return {
      stage: "meaning",
      content: text,
    };
  }
}

/**
 * Stage 2: 構文変換
 * 意味をターゲット言語の構文に変換
 */
async function convertSyntax(
  meaning: string,
  targetLanguage: string
): Promise<TranslationStage> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは言語の構文変換の専門家です。
与えられた意味を、${targetLanguage}の自然な構文に変換してください。`,
        },
        {
          role: "user",
          content: `以下の意味を${targetLanguage}の構文に変換してください：

${meaning}

${targetLanguage}の自然な構文で表現してください。`,
        },
      ],
    });
    const contextContent = response.choices[0]?.message?.content;
    const context = typeof contextContent === 'string' ? contextContent : meaning;

    return {
      stage: "syntax",
      content: context,
      metadata: {
        targetLanguage,
      },
    };
  } catch (error) {
    console.error("Failed to convert syntax:", error);
    return {
      stage: "syntax",
      content: meaning,
    };
  }
}

/**
 * Stage 3: 火水調和
 * 火（論理・明確性）と水（感情・流動性）のバランスを調整
 */
async function harmonizeFireWater(
  syntax: string,
  targetLanguage: string
): Promise<TranslationStage> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは言語の火水調和の専門家です。
火（論理・明確性・力強さ）と水（感情・流動性・柔らかさ）のバランスを調整し、
${targetLanguage}として最も自然で美しい表現に仕上げてください。`,
        },
        {
          role: "user",
          content: `以下のテキストの火水バランスを調整してください：

${syntax}

火（論理・明確性）と水（感情・流動性）のバランスを取り、自然で美しい${targetLanguage}に仕上げてください。`,
        },
      ],
    });
    const expressionContent = response.choices[0]?.message?.content;
    const expression = typeof expressionContent === 'string' ? expressionContent : syntax;

    return {
      stage: "fire_water",
      content: expression,
      metadata: {
        targetLanguage,
        fireWaterBalance: "harmonized",
      },
    };
  } catch (error) {
    console.error("Failed to harmonize fire-water:", error);
    return {
      stage: "fire_water",
      content: syntax,
    };
  }
}

/**
 * ULCE v3翻訳パイプライン
 * @param text - 元のテキスト
 * @param sourceLanguage - ソース言語
 * @param targetLanguage - ターゲット言語
 * @returns ULCE翻訳結果
 */
export async function translateWithULCE(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<ULCETranslationResult> {
  try {
    // Stage 1: 意味抽出
    const meaningStage = await extractMeaning(text, sourceLanguage);

    // Stage 2: 構文変換
    const syntaxStage = await convertSyntax(meaningStage.content, targetLanguage);

    // Stage 3: 火水調和
    const fireWaterStage = await harmonizeFireWater(syntaxStage.content, targetLanguage);

    return {
      original: text,
      sourceLanguage,
      targetLanguage,
      stages: [meaningStage, syntaxStage, fireWaterStage],
      final: fireWaterStage.content,
      confidence: 0.9,
    };
  } catch (error) {
    console.error("Failed to translate with ULCE:", error);
    return {
      original: text,
      sourceLanguage,
      targetLanguage,
      stages: [],
      final: text,
      confidence: 0,
    };
  }
}

/**
 * 世界10言語対応
 */
export const SUPPORTED_LANGUAGES = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * 言語コードから言語名を取得
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code as SupportedLanguage] || code;
}
