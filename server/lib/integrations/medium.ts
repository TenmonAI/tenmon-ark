/**
 * Medium API Integration
 * Medium APIを使用した自動投稿
 */

import type { BlogPost } from "../arkWriter";

export interface MediumConfig {
  apiKey: string;
}

export interface MediumPost {
  id: string;
  url: string;
  publishStatus: string;
}

/**
 * Mediumに記事を投稿
 */
export async function publishToMedium(
  post: BlogPost,
  config: MediumConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // まずユーザー情報を取得
    const userResponse = await fetch('https://api.medium.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Medium');
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // 記事を投稿
    const postResponse = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: post.title,
        contentFormat: 'markdown',
        content: post.content,
        tags: post.tags,
        publishStatus: 'public',
      }),
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.json();
      throw new Error(errorData.errors?.[0]?.message || 'Failed to publish to Medium');
    }

    const data: { data: MediumPost } = await postResponse.json();

    return {
      success: true,
      url: data.data.url,
    };
  } catch (error) {
    console.error('Failed to publish to Medium:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
