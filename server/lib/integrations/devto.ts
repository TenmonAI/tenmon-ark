/**
 * Dev.to API Integration
 * Dev.to APIを使用した自動投稿
 */

import type { BlogPost } from "../arkWriter";

export interface DevToConfig {
  apiKey: string;
}

export interface DevToPost {
  id: number;
  url: string;
  published: boolean;
}

/**
 * Dev.toに記事を投稿
 */
export async function publishToDevTo(
  post: BlogPost,
  config: DevToConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: post.title,
          published: true,
          body_markdown: post.content,
          tags: post.tags.slice(0, 4), // Dev.toは最大4つのタグ
          description: post.excerpt,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to publish to Dev.to');
    }

    const data: DevToPost = await response.json();

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    console.error('Failed to publish to Dev.to:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
