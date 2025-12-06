/**
 * Ark Writer Router
 * ブログ自動生成API
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { generateBlogPost, autoPublish } from "../lib/arkWriter";

export const arkWriterRouter = router({
  /**
   * ブログ記事を生成
   */
  generatePost: protectedProcedure
    .input(z.object({
      topic: z.string(),
      style: z.enum(["fire", "water", "balanced"]).default("balanced"),
      targetLanguage: z.string().default("ja"),
      seoOptimize: z.boolean().default(true),
      wordCount: z.number().default(1000),
    }))
    .mutation(async ({ input }) => {
      const post = await generateBlogPost(input);
      return post;
    }),

  /**
   * 自動投稿
   */
  autoPublish: protectedProcedure
    .input(z.object({
      post: z.object({
        title: z.string(),
        content: z.string(),
        excerpt: z.string(),
        tags: z.array(z.string()),
        seoKeywords: z.array(z.string()),
        metaDescription: z.string(),
        slug: z.string(),
        estimatedReadTime: z.number(),
      }),
      platform: z.enum(["wordpress", "medium", "dev.to"]).default("wordpress"),
    }))
    .mutation(async ({ input }) => {
      const result = await autoPublish(input.post, input.platform);
      return result;
    }),

  /**
   * 投稿履歴を取得
   */
  getPublishHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: データベースから取得
      return [];
    }),
});
