/**
 * 🔱 AutoSite Learner
 * URLを学習→サイト専用Index生成
 * 
 * 機能:
 * - サイトをクロール
 * - ページ内容を抽出
 * - サイト専用Semantic Indexに追加
 */

import { addDocumentToIndex } from "./semantic/index";
import type { Document } from "./semantic/index";

/**
 * クローラー結果（ページ情報）
 */
export interface CrawledPage {
  url: string;
  path: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * サイトを自動学習
 * 
 * @param url - クロール開始URL
 * @param siteId - サイトID（例: "example-com"）
 * @param options - オプション
 * @returns 学習結果
 */
export async function autoLearnSite(
  url: string,
  siteId: string,
  options?: {
    maxPages?: number; // 最大ページ数（デフォルト: 50）
    depth?: number; // クロール深度（デフォルト: 2）
  }
): Promise<{ pages: number; siteId: string }> {
  const maxPages = options?.maxPages || 50;
  const depth = options?.depth || 2;

  try {
    // サイトクローラーを使用（既存実装がある場合はそれを使用）
    let crawledPages: CrawledPage[] = [];

    try {
      // 既存のクローラーを使用
      const { crawlSite } = await import("../siteCrawler/crawlerEngine");
      const result = await crawlSite(url, { maxPages, maxDepth: depth });
      
      // PageDataをCrawledPageに変換
      crawledPages = result.pages.map((page) => ({
        url: page.url,
        path: new URL(page.url).pathname || "/",
        title: page.title || "Untitled",
        content: page.textContent || "",
        metadata: page.metadata,
      }));
    } catch (error) {
      // クローラーが存在しない場合は簡易実装
      console.warn("[AutoSite Learner] Crawler not found, using simple fetch:", error);
      crawledPages = await simpleCrawl(url, maxPages);
    }

    // 各ページをSemantic Indexに追加
    let addedCount = 0;
    for (const page of crawledPages) {
      const document: Document = {
        id: `${siteId}:${page.path}`,
        text: `${page.title}\n\n${page.content}`,
        metadata: {
          siteId,
          url: page.url,
          path: page.path,
          title: page.title,
        },
      };

      const result = await addDocumentToIndex(siteId, document);
      if (result.success) {
        addedCount++;
      } else {
        console.error(`[AutoSite Learner] Failed to add document ${document.id}:`, result.error);
      }
    }

    console.log(`[AutoSite Learner] Learned ${addedCount} pages from ${url} (siteId: ${siteId})`);

    return {
      pages: addedCount,
      siteId,
    };
  } catch (error) {
    console.error("[AutoSite Learner] Error:", error);
    throw error;
  }
}

/**
 * 簡易クローラー（既存クローラーがない場合のフォールバック）
 */
async function simpleCrawl(url: string, maxPages: number): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const visited = new Set<string>();

  async function crawlPage(currentUrl: string): Promise<void> {
    if (pages.length >= maxPages || visited.has(currentUrl)) {
      return;
    }

    visited.add(currentUrl);

    try {
      // サーバーサイドでfetchを使用（Node.js 18+）
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": "TENMON-ARK AutoSite Learner/1.0",
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();

      // 簡易的なHTMLパース（titleとbodyテキストを抽出）
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled";

      // bodyタグ内のテキストを抽出（簡易版）
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let content = "";
      if (bodyMatch) {
        // HTMLタグを除去（簡易版）
        content = bodyMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000); // 最大5000文字
      }

      if (content.length > 100) {
        // URLからパスを抽出
        const urlObj = new URL(currentUrl);
        const path = urlObj.pathname || "/";

        pages.push({
          url: currentUrl,
          path,
          title,
          content,
        });
      }
    } catch (error) {
      console.error(`[AutoSite Learner] Failed to crawl ${currentUrl}:`, error);
    }
  }

  // 最初のページをクロール
  await crawlPage(url);

  return pages;
}

