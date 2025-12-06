/**
 * Notion API Integration
 * Notion APIを使用した自動保存
 */

import type { BlogPost } from "../arkWriter";

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface NotionPage {
  id: string;
  url: string;
}

/**
 * Notionに記事を保存
 */
export async function saveToNotion(
  post: BlogPost,
  config: NotionConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          database_id: config.databaseId,
        },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: post.title,
                },
              },
            ],
          },
          'Tags': {
            multi_select: post.tags.map(tag => ({ name: tag })),
          },
          'SEO Keywords': {
            multi_select: post.seoKeywords.map(keyword => ({ name: keyword })),
          },
          'Slug': {
            rich_text: [
              {
                text: {
                  content: post.slug,
                },
              },
            ],
          },
          'Read Time': {
            number: post.estimatedReadTime,
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: post.excerpt,
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'divider',
            divider: {},
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: post.content.substring(0, 2000), // Notionのテキスト制限
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save to Notion');
    }

    const data: NotionPage = await response.json();

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    console.error('Failed to save to Notion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Notionデータベースからページを取得
 */
export async function getNotionPages(
  config: NotionConfig
): Promise<{ success: boolean; pages?: any[]; error?: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${config.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get Notion pages');
    }

    const data = await response.json();

    return {
      success: true,
      pages: data.results,
    };
  } catch (error) {
    console.error('Failed to get Notion pages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
