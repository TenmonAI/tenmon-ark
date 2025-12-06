/**
 * Ark Browser Router (tRPC API)
 * AI統合ブラウザAPI
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as arkBrowserEngine from "./arkBrowserEngine";
import { analyzeEthics } from "../reiEthicFilterEngine";

export const arkBrowserRouter = router({
  /**
   * ページを取得
   */
  fetchPage: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const page = await arkBrowserEngine.fetchPage(input.url);
      return page;
    }),

  /**
   * ページ内容を要約（倫理フィルタ統合）
   */
  summarizePage: publicProcedure
    .input(
      z.object({
        content: z.string(),
        maxLength: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.content);
      
      const summary = await arkBrowserEngine.summarizePage(input.content, input.maxLength);
      
      return {
        summary,
        ethicAnalysis,
      };
    }),

  /**
   * ページを言灵OS変換
   */
  convertPageToSpiritual: publicProcedure
    .input(
      z.object({
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await arkBrowserEngine.convertPageToSpiritual(input.content);
      return result;
    }),

  /**
   * 危険サイトを検知
   */
  detectDangerousSite: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await arkBrowserEngine.detectDangerousSite(input.url, input.content);
      return result;
    }),

  /**
   * ページの靈性スコアを計算
   */
  calculatePageSpiritualScore: publicProcedure
    .input(
      z.object({
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await arkBrowserEngine.calculatePageSpiritualScore(input.content);
      return result;
    }),

  /**
   * タブ管理
   */
  tabs: router({
    create: protectedProcedure
      .input(
        z.object({
          url: z.string().url(),
        })
      )
      .mutation(({ input }) => {
        const tab = arkBrowserEngine.createTab(input.url);
        return tab;
      }),

    get: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .query(({ input }) => {
        const tab = arkBrowserEngine.getTab(input.id);
        if (!tab) {
          throw new Error("Tab not found");
        }
        return tab;
      }),

    list: protectedProcedure.query(() => {
      const tabs = arkBrowserEngine.getAllTabs();
      return tabs;
    }),

    close: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(({ input }) => {
        const success = arkBrowserEngine.closeTab(input.id);
        return { success };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          url: z.string().url().optional(),
          title: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        const tab = arkBrowserEngine.updateTab(id, updates);
        if (!tab) {
          throw new Error("Tab not found");
        }
        return tab;
      }),
  }),

  /**
   * ブラウザを閉じる
   */
  closeBrowser: publicProcedure.mutation(async () => {
    await arkBrowserEngine.closeBrowser();
    return { success: true };
  }),
});
