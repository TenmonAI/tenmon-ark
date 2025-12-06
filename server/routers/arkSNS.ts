/**
 * Ark SNS Router
 * 自動SNS発信API
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { generateSNSPosts, publishToSNS } from "../lib/arkSNS";

export const arkSNSRouter = router({
  /**
   * SNS投稿を生成
   */
  generatePosts: protectedProcedure
    .input(z.object({
      topic: z.string(),
      platforms: z.array(z.enum(["x", "instagram", "youtube"])),
      targetLanguage: z.string().default("ja"),
      includeMedia: z.boolean().default(false),
      autoSchedule: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const posts = await generateSNSPosts(input);
      return posts;
    }),

  /**
   * SNSに投稿
   */
  publish: protectedProcedure
    .input(z.object({
      post: z.object({
        platform: z.enum(["x", "instagram", "youtube"]),
        content: z.string(),
        media: z.array(z.object({
          type: z.enum(["image", "video"]),
          url: z.string(),
        })).optional(),
        hashtags: z.array(z.string()),
        scheduledAt: z.date().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const result = await publishToSNS(input.post);
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

  /**
   * スケジュールされた投稿を取得
   */
  getScheduledPosts: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: データベースから取得
      return [];
    }),
});
