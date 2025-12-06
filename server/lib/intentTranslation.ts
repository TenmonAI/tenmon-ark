/**
 * Intent Translation Engine
 * ユーザーの検索意図を翻訳し、より適切な検索クエリを生成
 */

import { invokeLLM } from "../_core/llm";

export interface IntentTranslationResult {
  originalQuery: string;
  translatedIntent: string;
  suggestedQueries: string[];
  targetLanguage: string;
  confidence: number;
}

/**
 * ユーザーの検索意図を翻訳
 * @param query - 元の検索クエリ
 * @param targetLanguage - ターゲット言語（ja, en, zh, ko, es, fr, de, it, pt, ru）
 * @returns 翻訳された意図と推奨クエリ
 */
export async function translateSearchIntent(
  query: string,
  targetLanguage: string = "ja"
): Promise<IntentTranslationResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは検索意図を分析し、最適な検索クエリを生成する専門家です。
ユーザーの検索クエリから意図を読み取り、ターゲット言語（${targetLanguage}）で最適化された検索クエリを提案してください。`,
        },
        {
          role: "user",
          content: `検索クエリ: "${query}"
ターゲット言語: ${targetLanguage}

以下の形式でJSON形式で回答してください：
{
  "translatedIntent": "ユーザーの検索意図の説明",
  "suggestedQueries": ["推奨クエリ1", "推奨クエリ2", "推奨クエリ3"],
  "confidence": 0.95
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_translation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translatedIntent: {
                type: "string",
                description: "ユーザーの検索意図の説明",
              },
              suggestedQueries: {
                type: "array",
                description: "推奨される検索クエリのリスト",
                items: {
                  type: "string",
                },
              },
              confidence: {
                type: "number",
                description: "意図翻訳の信頼度（0-1）",
              },
            },
            required: ["translatedIntent", "suggestedQueries", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr || "{}");

    return {
      originalQuery: query,
      translatedIntent: result.translatedIntent || "",
      suggestedQueries: result.suggestedQueries || [],
      targetLanguage,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("Failed to translate search intent:", error);
    return {
      originalQuery: query,
      translatedIntent: `「${query}」の検索意図を分析中...`,
      suggestedQueries: [query],
      targetLanguage,
      confidence: 0,
    };
  }
}

/**
 * 多言語検索クエリを生成
 * @param query - 元の検索クエリ
 * @param languages - ターゲット言語のリスト
 * @returns 各言語の検索クエリ
 */
export async function generateMultilingualQueries(
  query: string,
  languages: string[] = ["ja", "en"]
): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};

  for (const lang of languages) {
    const translation = await translateSearchIntent(query, lang);
    results[lang] = translation.suggestedQueries;
  }

  return results;
}
