/**
 * Translation Router
 * ULCE v3翻訳エンジンを使用した翻訳API
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { translateWithULCE, SUPPORTED_LANGUAGES, SupportedLanguage } from "../lib/ulceV3";

export const translationRouter = router({
  /**
   * ULCE v3翻訳
   */
  translateULCE: publicProcedure
    .input(z.object({
      text: z.string(),
      sourceLanguage: z.string().default("ja"),
      targetLanguage: z.string().default("en"),
    }))
    .mutation(async ({ input }) => {
      const result = await translateWithULCE(
        input.text,
        input.sourceLanguage,
        input.targetLanguage
      );
      return result;
    }),

  /**
   * サポートされている言語のリストを取得
   */
  getSupportedLanguages: publicProcedure
    .query(() => {
      return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
        code,
        name,
      }));
    }),

  /**
   * バッチ翻訳（複数のテキストを一度に翻訳）
   */
  batchTranslate: publicProcedure
    .input(z.object({
      texts: z.array(z.string()),
      sourceLanguage: z.string().default("ja"),
      targetLanguage: z.string().default("en"),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.all(
        input.texts.map(text =>
          translateWithULCE(text, input.sourceLanguage, input.targetLanguage)
        )
      );
      return results;
    }),

  /**
   * 翻訳履歴を保存（プロテクト）
   */
  saveTranslationHistory: protectedProcedure
    .input(z.object({
      original: z.string(),
      translated: z.string(),
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: データベースに保存
      return {
        success: true,
        historyId: Date.now(),
      };
    }),

  /**
   * 翻訳履歴を取得（プロテクト）
   */
  getTranslationHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: データベースから取得
      return [];
    }),
});
