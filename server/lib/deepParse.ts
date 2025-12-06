/**
 * DeepParse Engine
 * HTML/テキストから段落を抽出し、重要度順に並べ替える
 */

import { invokeLLM } from "../_core/llm";

export interface Paragraph {
  text: string;
  importance: number;
  topic?: string;
  position: number;
}

export interface DeepParseResult {
  paragraphs: Paragraph[];
  keyPoints: string[];
  summary: string;
  totalParagraphs: number;
}

/**
 * HTMLからテキストを抽出
 * @param html - HTML文字列
 * @returns プレーンテキスト
 */
function extractTextFromHTML(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * テキストを段落に分割
 * @param text - プレーンテキスト
 * @returns 段落の配列
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20); // 短すぎる段落を除外
}

/**
 * DeepParse段落抽出
 * @param content - HTML or プレーンテキスト
 * @param maxParagraphs - 抽出する最大段落数（デフォルト: 10）
 * @returns DeepParse結果
 */
export async function deepParseParagraphs(
  content: string,
  maxParagraphs: number = 10
): Promise<DeepParseResult> {
  try {
    // HTMLからテキストを抽出
    const text = content.includes("<") ? extractTextFromHTML(content) : content;
    
    // 段落に分割
    const rawParagraphs = splitIntoParagraphs(text);
    
    if (rawParagraphs.length === 0) {
      return {
        paragraphs: [],
        keyPoints: [],
        summary: "コンテンツが見つかりませんでした。",
        totalParagraphs: 0,
      };
    }

    // LLMを使用して段落の重要度を分析
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはテキスト分析の専門家です。
与えられた段落のリストから、各段落の重要度（0-1）、トピック、キーポイント、要約を抽出してください。`,
        },
        {
          role: "user",
          content: `以下の段落を分析してください：

${rawParagraphs.slice(0, 20).map((p, i) => `[${i}] ${p.substring(0, 200)}...`).join("\n\n")}

以下の形式でJSON形式で回答してください：
{
  "paragraphs": [
    {
      "position": 0,
      "importance": 0.95,
      "topic": "メイントピック"
    },
    ...
  ],
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
  "summary": "全体の要約"
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "deep_parse_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              paragraphs: {
                type: "array",
                description: "段落の分析結果",
                items: {
                  type: "object",
                  properties: {
                    position: {
                      type: "integer",
                      description: "段落の位置（0から始まる）",
                    },
                    importance: {
                      type: "number",
                      description: "重要度（0-1）",
                    },
                    topic: {
                      type: "string",
                      description: "段落のトピック",
                    },
                  },
                  required: ["position", "importance", "topic"],
                  additionalProperties: false,
                },
              },
              keyPoints: {
                type: "array",
                description: "キーポイントのリスト",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
                description: "全体の要約",
              },
            },
            required: ["paragraphs", "keyPoints", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    // 段落を重要度順にソート
    const analyzedParagraphs: Paragraph[] = result.paragraphs
      .map((p: any) => ({
        text: rawParagraphs[p.position] || "",
        importance: p.importance || 0,
        topic: p.topic || "",
        position: p.position || 0,
      }))
      .sort((a: Paragraph, b: Paragraph) => b.importance - a.importance)
      .slice(0, maxParagraphs);

    return {
      paragraphs: analyzedParagraphs,
      keyPoints: result.keyPoints || [],
      summary: result.summary || "",
      totalParagraphs: rawParagraphs.length,
    };
  } catch (error) {
    console.error("Failed to deep parse paragraphs:", error);
    
    // フォールバック：単純な段落抽出
    const rawParagraphs = splitIntoParagraphs(
      content.includes("<") ? extractTextFromHTML(content) : content
    );
    
    return {
      paragraphs: rawParagraphs.slice(0, maxParagraphs).map((text, i) => ({
        text,
        importance: 1 - (i / rawParagraphs.length),
        position: i,
      })),
      keyPoints: ["分析中にエラーが発生しました"],
      summary: "段落の分析に失敗しました。",
      totalParagraphs: rawParagraphs.length,
    };
  }
}

/**
 * キーワードベースの段落検索
 * @param paragraphs - 段落の配列
 * @param keywords - 検索キーワード
 * @returns マッチした段落
 */
export function searchParagraphs(
  paragraphs: Paragraph[],
  keywords: string[]
): Paragraph[] {
  return paragraphs.filter(p =>
    keywords.some(keyword =>
      p.text.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}
