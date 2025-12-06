/**
 * Ark Writer Engine
 * ブログ自動生成 × Twin-Core文体 × SEO最適化
 */

import { invokeLLM } from "../_core/llm";

export interface TwinCoreStyle {
  fire: string; // 論理的・明確・力強い文体
  water: string; // 感情的・流動的・柔らかい文体
  balanced: string; // 火水バランスの取れた文体
}

export interface BlogPost {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  seoKeywords: string[];
  metaDescription: string;
  slug: string;
  estimatedReadTime: number;
}

export interface ArkWriterOptions {
  topic: string;
  style?: "fire" | "water" | "balanced";
  targetLanguage?: string;
  seoOptimize?: boolean;
  wordCount?: number;
}

/**
 * Twin-Core文体エンジン
 * 火（論理）と水（感情）の2つの文体を生成
 */
async function generateTwinCoreStyles(
  topic: string,
  targetLanguage: string = "ja"
): Promise<TwinCoreStyle> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはTwin-Core文体エンジンです。
与えられたトピックについて、以下の3つの文体で文章を生成してください：

1. 火（Fire）：論理的・明確・力強い・断定的な文体
2. 水（Water）：感情的・流動的・柔らかい・共感的な文体
3. バランス（Balanced）：火と水のバランスが取れた文体

言語: ${targetLanguage}`,
        },
        {
          role: "user",
          content: `トピック: ${topic}

以下の形式でJSON形式で回答してください：
{
  "fire": "火の文体で書いた文章",
  "water": "水の文体で書いた文章",
  "balanced": "バランスの取れた文体で書いた文章"
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "twin_core_styles",
          strict: true,
          schema: {
            type: "object",
            properties: {
              fire: {
                type: "string",
                description: "火の文体で書いた文章",
              },
              water: {
                type: "string",
                description: "水の文体で書いた文章",
              },
              balanced: {
                type: "string",
                description: "バランスの取れた文体で書いた文章",
              },
            },
            required: ["fire", "water", "balanced"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      fire: result.fire || "",
      water: result.water || "",
      balanced: result.balanced || "",
    };
  } catch (error) {
    console.error("Failed to generate twin-core styles:", error);
    return {
      fire: topic,
      water: topic,
      balanced: topic,
    };
  }
}

/**
 * SEO最適化
 * タイトル、メタディスクリプション、キーワードを生成
 */
async function optimizeForSEO(
  content: string,
  topic: string
): Promise<{
  seoKeywords: string[];
  metaDescription: string;
  slug: string;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはSEO最適化の専門家です。
与えられたコンテンツから、SEOキーワード、メタディスクリプション、URLスラッグを生成してください。`,
        },
        {
          role: "user",
          content: `トピック: ${topic}
コンテンツ: ${content.substring(0, 500)}...

以下の形式でJSON形式で回答してください：
{
  "seoKeywords": ["キーワード1", "キーワード2", "キーワード3"],
  "metaDescription": "メタディスクリプション（160文字以内）",
  "slug": "url-slug"
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "seo_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              seoKeywords: {
                type: "array",
                description: "SEOキーワードのリスト",
                items: {
                  type: "string",
                },
              },
              metaDescription: {
                type: "string",
                description: "メタディスクリプション（160文字以内）",
              },
              slug: {
                type: "string",
                description: "URLスラッグ",
              },
            },
            required: ["seoKeywords", "metaDescription", "slug"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : '{}';
    const result = JSON.parse(contentStr);

    return {
      seoKeywords: result.seoKeywords || [],
      metaDescription: result.metaDescription || "",
      slug: result.slug || topic.toLowerCase().replace(/\s+/g, "-"),
    };
  } catch (error) {
    console.error("Failed to optimize for SEO:", error);
    return {
      seoKeywords: [topic],
      metaDescription: topic,
      slug: topic.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}

/**
 * ブログ記事を自動生成
 */
export async function generateBlogPost(
  options: ArkWriterOptions
): Promise<BlogPost> {
  try {
    const {
      topic,
      style = "balanced",
      targetLanguage = "ja",
      seoOptimize = true,
      wordCount = 1000,
    } = options;

    // Twin-Core文体で生成
    const twinCoreStyles = await generateTwinCoreStyles(topic, targetLanguage);
    const content = twinCoreStyles[style];

    // タイトルと要約を生成
    const titleResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはブログ記事のタイトルと要約を生成する専門家です。`,
        },
        {
          role: "user",
          content: `トピック: ${topic}
コンテンツ: ${content.substring(0, 200)}...

以下の形式でJSON形式で回答してください：
{
  "title": "魅力的なタイトル",
  "excerpt": "要約（200文字以内）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "blog_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "魅力的なタイトル",
              },
              excerpt: {
                type: "string",
                description: "要約（200文字以内）",
              },
              tags: {
                type: "array",
                description: "タグのリスト",
                items: {
                  type: "string",
                },
              },
            },
            required: ["title", "excerpt", "tags"],
            additionalProperties: false,
          },
        },
      },
    });

    const metadataContent = titleResponse.choices[0]?.message?.content;
    const metadataStr = typeof metadataContent === 'string' ? metadataContent : '{}';
    const metadata = JSON.parse(metadataStr);

    // SEO最適化
    let seoData = {
      seoKeywords: [topic],
      metaDescription: metadata.excerpt || topic,
      slug: topic.toLowerCase().replace(/\s+/g, "-"),
    };

    if (seoOptimize) {
      seoData = await optimizeForSEO(content, topic);
    }

    // 読了時間を推定（1分あたり200文字）
    const estimatedReadTime = Math.ceil(content.length / 200);

    return {
      title: metadata.title || topic,
      content,
      excerpt: metadata.excerpt || content.substring(0, 200),
      tags: metadata.tags || [topic],
      seoKeywords: seoData.seoKeywords,
      metaDescription: seoData.metaDescription,
      slug: seoData.slug,
      estimatedReadTime,
    };
  } catch (error) {
    console.error("Failed to generate blog post:", error);
    return {
      title: options.topic,
      content: options.topic,
      excerpt: options.topic,
      tags: [options.topic],
      seoKeywords: [options.topic],
      metaDescription: options.topic,
      slug: options.topic.toLowerCase().replace(/\s+/g, "-"),
      estimatedReadTime: 1,
    };
  }
}

/**
 * 自動投稿
 */
export async function autoPublish(
  post: BlogPost,
  platform: "wordpress" | "medium" | "dev.to" = "wordpress"
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // TODO: API設定を環境変数またはデータベースから取得
    // 現在はモック実装
    console.log(`Publishing to ${platform}:`, post.title);
    
    // 実際のAPI統合は以下のように実装:
    // import { publishToWordPress } from "./integrations/wordpress";
    // import { publishToMedium } from "./integrations/medium";
    // import { publishToDevTo } from "./integrations/devto";
    //
    // switch (platform) {
    //   case "wordpress":
    //     return await publishToWordPress(post, wordpressConfig);
    //   case "medium":
    //     return await publishToMedium(post, mediumConfig);
    //   case "dev.to":
    //     return await publishToDevTo(post, devtoConfig);
    // }
    
    return {
      success: true,
      url: `https://${platform}.com/posts/${post.slug}`,
    };
  } catch (error) {
    console.error("Failed to auto-publish:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
