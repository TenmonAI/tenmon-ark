/**
 * TENMON-ARK SiteCrawler Engine v1 Router
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { crawlSite, analyzePageSemantics } from '../siteCrawler/crawlerEngine';
import { getDb } from '../db';
import { crawledSites, sitePages, siteMemories } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const siteCrawlerRouter = router({
  /**
   * サイト全体をクロール
   */
  crawlSite: protectedProcedure
    .input(z.object({
      siteUrl: z.string().url(),
      siteId: z.string().min(1).max(100),
      siteName: z.string().optional(),
      siteDescription: z.string().optional(),
      maxPages: z.number().optional().default(100),
      maxDepth: z.number().optional().default(3),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // サイト情報を保存
      await db.insert(crawledSites).values({
        userId: ctx.user.id,
        siteId: input.siteId,
        siteUrl: input.siteUrl,
        siteName: input.siteName || input.siteId,
        siteDescription: input.siteDescription || '',
        crawlDepth: input.maxDepth,
        maxPages: input.maxPages,
        status: 'crawling',
      }).onDuplicateKeyUpdate({
        set: {
          siteUrl: input.siteUrl,
          siteName: input.siteName || input.siteId,
          siteDescription: input.siteDescription || '',
          status: 'crawling',
          updatedAt: new Date(),
        },
      });

      try {
        // クロール実行
        const { pages, structures } = await crawlSite(input.siteUrl, {
          maxPages: input.maxPages,
          maxDepth: input.maxDepth,
        });

        // ページデータを保存
        for (const page of pages) {
          await db.insert(sitePages).values({
            siteId: input.siteId,
            url: page.url,
            title: page.title,
            description: page.description,
            htmlContent: page.htmlContent.substring(0, 65000), // TEXT型の制限
            textContent: page.textContent.substring(0, 65000),
            headings: JSON.stringify(page.headings),
            links: JSON.stringify(page.links),
            images: JSON.stringify(page.images),
            metadata: JSON.stringify(page.metadata),
            statusCode: page.statusCode,
          });
        }

        // 意味構造を保存
        for (const structure of structures) {
          await db.insert(siteMemories).values({
            siteId: input.siteId,
            category: structure.category,
            title: structure.title,
            content: structure.content,
            structuredData: JSON.stringify(structure.structuredData),
            sourceUrl: structure.sourceUrl,
            priority: structure.priority,
            keywords: JSON.stringify(structure.keywords),
          });
        }

        // クロール完了
        await db.update(crawledSites)
          .set({
            status: 'completed',
            lastCrawledAt: new Date(),
            totalPages: pages.length,
            updatedAt: new Date(),
          })
          .where(eq(crawledSites.siteId, input.siteId));

        return {
          success: true,
          totalPages: pages.length,
          totalStructures: structures.length,
        };
      } catch (error) {
        // クロール失敗
        await db.update(crawledSites)
          .set({
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(crawledSites.siteId, input.siteId));

        throw error;
      }
    }),

  /**
   * クロール済みサイト一覧を取得
   */
  listSites: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const sites = await db.select()
        .from(crawledSites)
        .where(eq(crawledSites.userId, ctx.user.id));

      return sites;
    }),

  /**
   * サイトのSiteMemoryを取得
   */
  getSiteMemory: protectedProcedure
    .input(z.object({
      siteId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const memories = await db.select()
        .from(siteMemories)
        .where(eq(siteMemories.siteId, input.siteId));

      return memories.map(m => ({
        ...m,
        structuredData: m.structuredData ? JSON.parse(m.structuredData) : {},
        keywords: m.keywords ? JSON.parse(m.keywords) : [],
      }));
    }),

  /**
   * サイトのページ一覧を取得
   */
  getSitePages: protectedProcedure
    .input(z.object({
      siteId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const pages = await db.select()
        .from(sitePages)
        .where(eq(sitePages.siteId, input.siteId));

      return pages.map(p => ({
        ...p,
        headings: p.headings ? JSON.parse(p.headings) : [],
        links: p.links ? JSON.parse(p.links) : [],
        images: p.images ? JSON.parse(p.images) : [],
        metadata: p.metadata ? JSON.parse(p.metadata) : {},
      }));
    }),
});
