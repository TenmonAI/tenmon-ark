/**
 * 🔱 Multi-Site Learner
 * 複数サイトを一括で学習可能にする拡張機能
 * 
 * 機能:
 * - 複数 URL を一括で学習可能
 * - それぞれ独立した Semantic Index を生成
 * - SiteId を発行し、ArkWidget と紐づける
 */

import { autoLearnSite } from "./autoSiteLearner";
import { getSiteIndex, getIndexStats } from "./semantic/index";
import type { Document } from "./semantic/index";

/**
 * サイト学習結果
 */
export interface SiteLearningResult {
  url: string;
  siteId: string;
  pages: number;
  success: boolean;
  error?: string;
}

/**
 * 複数サイトを一括学習
 * 
 * @param urls - 学習するURLの配列
 * @param options - オプション
 * @returns 学習結果の配列
 */
export async function learnMultipleSites(
  urls: string[],
  options?: {
    maxPages?: number;
    depth?: number;
    generateSiteId?: (url: string, index: number) => string;
  }
): Promise<SiteLearningResult[]> {
  const results: SiteLearningResult[] = [];
  const maxPages = options?.maxPages || 50;
  const depth = options?.depth || 2;

  // サイトID生成関数（デフォルト）
  const generateSiteId = options?.generateSiteId || ((url: string, index: number) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/\./g, "-").replace(/[^a-z0-9-]/gi, "");
      return `site-${hostname}-${Date.now()}-${index}`;
    } catch {
      return `site-${Date.now()}-${index}`;
    }
  });

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const siteId = generateSiteId(url, i);

    try {
      console.log(`[Multi-Site Learner] Learning site ${i + 1}/${urls.length}: ${url} (siteId: ${siteId})`);

      const result = await autoLearnSite(url, siteId, {
        maxPages,
        depth,
      });

      results.push({
        url,
        siteId,
        pages: result.pages,
        success: true,
      });

      console.log(`[Multi-Site Learner] ✓ Learned ${result.pages} pages from ${url}`);
    } catch (error) {
      console.error(`[Multi-Site Learner] ✗ Failed to learn ${url}:`, error);
      results.push({
        url,
        siteId,
        pages: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * サイト学習結果を保存（将来の拡張用）
 * 
 * @param siteId - サイトID
 * @param summary - 学習サマリー
 */
export async function saveSiteIndex(
  siteId: string,
  summary: { pages: number; siteId: string }
): Promise<void> {
  // 現在はインメモリで管理しているため、特に保存処理は不要
  // 将来的にDBに保存する場合はここに実装
  const stats = await getIndexStats({ siteId });
  console.log(`[Multi-Site Learner] Saved site index: ${siteId} (${stats.documentCount} documents)`);
}

/**
 * サイト一覧を取得
 * 
 * @returns サイトIDの配列
 */
export async function getLearnedSites(): Promise<string[]> {
  // TODO: 実際の実装では、DBからサイト一覧を取得
  // 現在はインメモリで管理しているため、空配列を返す
  return [];
}

