/**
 * TENMON-ARK SiteCrawler Engine v1
 * 
 * Webサイト全体をクロールし、Semantic Structuringを行う
 */

import * as cheerio from 'cheerio';
import { invokeLLM } from '../_core/llm';

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  allowedDomains?: string[];
  excludePatterns?: string[];
}

export interface PageData {
  url: string;
  title: string;
  description: string;
  htmlContent: string;
  textContent: string;
  headings: Array<{ level: string; text: string }>;
  links: Array<{ url: string; text: string }>;
  images: Array<{ url: string; alt: string }>;
  metadata: Record<string, string>;
  statusCode: number;
}

export interface SemanticStructure {
  category: 'serviceSummary' | 'priceList' | 'features' | 'worldview' | 'faq' | 'flow' | 'caution' | 'metadata' | 'other';
  title: string;
  content: string;
  structuredData: any;
  sourceUrl: string;
  priority: number;
  keywords: string[];
}

/**
 * URLからページをクロール
 */
export async function crawlPage(url: string): Promise<PageData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TENMON-ARK SiteCrawler/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const htmlContent = await response.text();
    const $ = cheerio.load(htmlContent);

    // メタデータ抽出
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

    // 見出し抽出
    const headings: Array<{ level: string; text: string }> = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = el.tagName.toLowerCase();
      const text = $(el).text().trim();
      if (text) {
        headings.push({ level, text });
      }
    });

    // リンク抽出
    const links: Array<{ url: string; text: string }> = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push({ url: absoluteUrl, text });
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });

    // 画像抽出
    const images: Array<{ url: string; alt: string }> = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          images.push({ url: absoluteUrl, alt });
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });

    // テキストコンテンツ抽出（スクリプト・スタイルを除外）
    $('script, style, nav, footer, header').remove();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();

    // メタデータ
    const metadata: Record<string, string> = {};
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    return {
      url,
      title,
      description,
      htmlContent,
      textContent,
      headings,
      links,
      images,
      metadata,
      statusCode: response.status,
    };
  } catch (error) {
    console.error(`[SiteCrawler] クロールエラー: ${url}`, error);
    throw error;
  }
}

/**
 * Semantic Structuring - ページ内容を意味解析
 */
export async function analyzePageSemantics(pageData: PageData): Promise<SemanticStructure[]> {
  const prompt = `以下のWebページ内容を解析し、意味カテゴリに分類してください。

URL: ${pageData.url}
タイトル: ${pageData.title}
説明: ${pageData.description}

見出し:
${pageData.headings.map(h => `${h.level}: ${h.text}`).join('\n')}

本文（抜粋）:
${pageData.textContent.substring(0, 3000)}

以下のカテゴリに分類し、JSON形式で返してください：
- serviceSummary: サービス概要
- priceList: 料金表・価格情報
- features: 機能・特徴
- worldview: 世界観・理念・ビジョン
- faq: よくある質問
- flow: 利用の流れ・手順
- caution: 注意事項・規約
- metadata: メタ情報（会社情報、連絡先など）
- other: その他

各カテゴリについて、以下の形式で返してください：
{
  "structures": [
    {
      "category": "serviceSummary",
      "title": "サービス名",
      "content": "サービスの説明文",
      "structuredData": {},
      "priority": 8,
      "keywords": ["キーワード1", "キーワード2"]
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'あなたはWebページの意味解析を行うAIです。JSON形式で構造化データを返してください。' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'semantic_structures',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              structures: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      enum: ['serviceSummary', 'priceList', 'features', 'worldview', 'faq', 'flow', 'caution', 'metadata', 'other'],
                    },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    structuredData: { type: 'object', additionalProperties: true },
                    priority: { type: 'integer', minimum: 1, maximum: 10 },
                    keywords: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['category', 'title', 'content', 'structuredData', 'priority', 'keywords'],
                  additionalProperties: false,
                },
              },
            },
            required: ['structures'],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const contentText = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    const result = JSON.parse(contentText || '{"structures":[]}');
    
    return result.structures.map((s: any) => ({
      ...s,
      sourceUrl: pageData.url,
    }));
  } catch (error) {
    console.error(`[SiteCrawler] 意味解析エラー: ${pageData.url}`, error);
    return [];
  }
}

/**
 * サイト全体をクロール
 */
export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<{ pages: PageData[]; structures: SemanticStructure[] }> {
  const {
    maxPages = 100,
    maxDepth = 3,
    allowedDomains = [],
    excludePatterns = [],
  } = options;

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const pages: PageData[] = [];
  const structures: SemanticStructure[] = [];

  // 許可ドメインの設定
  const startDomain = new URL(startUrl).hostname;
  const domains = allowedDomains.length > 0 ? allowedDomains : [startDomain];

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift()!;

    // 訪問済みチェック
    if (visited.has(url)) continue;
    visited.add(url);

    // 深さチェック
    if (depth > maxDepth) continue;

    // ドメインチェック
    try {
      const urlObj = new URL(url);
      if (!domains.some(d => urlObj.hostname === d || urlObj.hostname.endsWith(`.${d}`))) {
        continue;
      }
    } catch (e) {
      continue;
    }

    // 除外パターンチェック
    if (excludePatterns.some(pattern => url.includes(pattern))) {
      continue;
    }

    try {
      console.log(`[SiteCrawler] クロール中: ${url} (深さ: ${depth})`);
      
      // ページをクロール
      const pageData = await crawlPage(url);
      pages.push(pageData);

      // 意味解析
      const pageStructures = await analyzePageSemantics(pageData);
      structures.push(...pageStructures);

      // 次のページをキューに追加
      if (depth < maxDepth) {
        for (const link of pageData.links) {
          if (!visited.has(link.url)) {
            queue.push({ url: link.url, depth: depth + 1 });
          }
        }
      }

      // レート制限（1秒待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[SiteCrawler] ページクロール失敗: ${url}`, error);
    }
  }

  console.log(`[SiteCrawler] クロール完了: ${pages.length} ページ、${structures.length} 構造`);
  
  return { pages, structures };
}
