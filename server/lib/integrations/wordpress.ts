/**
 * WordPress API Integration
 * WordPress REST APIを使用した自動投稿
 */

import type { BlogPost } from "../arkWriter";

export interface WordPressConfig {
  url: string;
  username: string;
  password: string; // Application Password
}

export interface WordPressPost {
  id: number;
  link: string;
  status: string;
}

/**
 * WordPressに記事を投稿
 */
export async function publishToWordPress(
  post: BlogPost,
  config: WordPressConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const apiUrl = `${config.url}/wp-json/wp/v2/posts`;
    
    // Basic認証のためのBase64エンコード
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        status: 'publish',
        slug: post.slug,
        tags: post.tags,
        meta: {
          description: post.metaDescription,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to publish to WordPress');
    }

    const data: WordPressPost = await response.json();

    return {
      success: true,
      url: data.link,
    };
  } catch (error) {
    console.error('Failed to publish to WordPress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
