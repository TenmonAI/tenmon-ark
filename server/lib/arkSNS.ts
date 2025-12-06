/**
 * Ark SNS Engine
 * 自動SNS発信OS × 多言語 × 自動動画生成
 */

import { invokeLLM } from "../_core/llm";

export interface SNSPost {
  platform: "x" | "instagram" | "youtube";
  content: string;
  media?: {
    type: "image" | "video";
    url: string;
  }[];
  hashtags: string[];
  scheduledAt?: Date;
}

export interface ArkSNSOptions {
  topic: string;
  platforms: ("x" | "instagram" | "youtube")[];
  targetLanguage?: string;
  includeMedia?: boolean;
  autoSchedule?: boolean;
}

/**
 * プラットフォームごとの最適化されたコンテンツを生成
 */
async function generatePlatformOptimizedContent(
  topic: string,
  platform: "x" | "instagram" | "youtube",
  targetLanguage: string = "ja"
): Promise<{
  content: string;
  hashtags: string[];
}> {
  try {
    const platformSpecs = {
      x: {
        maxLength: 280,
        style: "簡潔で魅力的",
        hashtags: 2,
      },
      instagram: {
        maxLength: 2200,
        style: "視覚的で感情的",
        hashtags: 10,
      },
      youtube: {
        maxLength: 5000,
        style: "詳細で説明的",
        hashtags: 5,
      },
    };

    const spec = platformSpecs[platform];

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは${platform}のコンテンツ作成の専門家です。
${spec.style}なスタイルで、最大${spec.maxLength}文字以内のコンテンツを作成してください。
言語: ${targetLanguage}`,
        },
        {
          role: "user",
          content: `トピック: ${topic}

以下の形式でJSON形式で回答してください：
{
  "content": "${platform}用のコンテンツ",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", ...]
}

ハッシュタグは${spec.hashtags}個程度にしてください。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sns_content",
          strict: true,
          schema: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: `${platform}用のコンテンツ`,
              },
              hashtags: {
                type: "array",
                description: "ハッシュタグのリスト",
                items: {
                  type: "string",
                },
              },
            },
            required: ["content", "hashtags"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      content: result.content || topic,
      hashtags: result.hashtags || [topic],
    };
  } catch (error) {
    console.error(`Failed to generate ${platform} content:`, error);
    return {
      content: topic,
      hashtags: [topic],
    };
  }
}

/**
 * 自動動画生成（外部API呼び出し）
 * @param topic - トピック
 * @param script - 動画スクリプト
 * @returns 動画URL
 */
async function generateVideo(
  topic: string,
  script: string
): Promise<string | null> {
  try {
    // TODO: 外部動画生成API（例：Runway ML, Synthesia, D-ID）を呼び出す
    console.log("Generating video for topic:", topic);
    console.log("Script:", script);

    // モック実装
    return `https://example.com/videos/${topic.toLowerCase().replace(/\s+/g, "-")}.mp4`;
  } catch (error) {
    console.error("Failed to generate video:", error);
    return null;
  }
}

/**
 * SNS投稿を自動生成
 */
export async function generateSNSPosts(
  options: ArkSNSOptions
): Promise<SNSPost[]> {
  try {
    const {
      topic,
      platforms,
      targetLanguage = "ja",
      includeMedia = false,
      autoSchedule = false,
    } = options;

    const posts: SNSPost[] = [];

    for (const platform of platforms) {
      // プラットフォーム最適化されたコンテンツを生成
      const { content, hashtags } = await generatePlatformOptimizedContent(
        topic,
        platform,
        targetLanguage
      );

      const post: SNSPost = {
        platform,
        content,
        hashtags,
      };

      // メディア生成（YouTube用）
      if (includeMedia && platform === "youtube") {
        const videoUrl = await generateVideo(topic, content);
        if (videoUrl) {
          post.media = [
            {
              type: "video",
              url: videoUrl,
            },
          ];
        }
      }

      // 自動スケジュール
      if (autoSchedule) {
        // プラットフォームごとに最適な投稿時間を設定
        const now = new Date();
        const scheduleOffsets = {
          x: 2, // 2時間後
          instagram: 4, // 4時間後
          youtube: 8, // 8時間後
        };
        const scheduledAt = new Date(now.getTime() + scheduleOffsets[platform] * 60 * 60 * 1000);
        post.scheduledAt = scheduledAt;
      }

      posts.push(post);
    }

    return posts;
  } catch (error) {
    console.error("Failed to generate SNS posts:", error);
    return [];
  }
}

/**
 * SNS投稿を実行（モック実装）
 */
export async function publishToSNS(
  post: SNSPost
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // TODO: 実際のSNS APIに接続
    console.log(`Publishing to ${post.platform}:`, post.content);

    const platformUrls = {
      x: "https://x.com/status/",
      instagram: "https://instagram.com/p/",
      youtube: "https://youtube.com/watch?v=",
    };

    return {
      success: true,
      url: `${platformUrls[post.platform]}${Date.now()}`,
    };
  } catch (error) {
    console.error(`Failed to publish to ${post.platform}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 多言語対応
 */
export const SNS_SUPPORTED_LANGUAGES = {
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

export type SNSSupportedLanguage = keyof typeof SNS_SUPPORTED_LANGUAGES;
