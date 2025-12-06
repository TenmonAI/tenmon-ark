import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Custom TENMON-ARK Router
 * 
 * ユーザーが独自のARKパーソナリティを作成・管理できる機能
 */
export const customArksRouter = router({
  /**
   * カスタムARK作成
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        systemPrompt: z.string().min(1),
        knowledgeBase: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const arkId = await db.createCustomArk({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        knowledgeBase: input.knowledgeBase,
        isPublic: input.isPublic,
      });

      return { arkId };
    }),

  /**
   * カスタムARK一覧取得
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserCustomArks(ctx.user.id);
  }),

  /**
   * カスタムARK詳細取得
   */
  get: protectedProcedure
    .input(z.object({ arkId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ark = await db.getCustomArkById(input.arkId);
      
      // 権限チェック: 自分のARKまたは公開ARKのみ取得可能
      if (!ark || (ark.userId !== ctx.user.id && !ark.isPublic)) {
        throw new Error("Custom ARK not found or access denied");
      }

      return ark;
    }),

  /**
   * カスタムARK更新
   */
  update: protectedProcedure
    .input(
      z.object({
        arkId: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        systemPrompt: z.string().min(1).optional(),
        knowledgeBase: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ark = await db.getCustomArkById(input.arkId);
      
      // 権限チェック: 自分のARKのみ更新可能
      if (!ark || ark.userId !== ctx.user.id) {
        throw new Error("Custom ARK not found or access denied");
      }

      await db.updateCustomArk(input.arkId, {
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        knowledgeBase: input.knowledgeBase,
        isPublic: input.isPublic,
      });

      return { success: true };
    }),

  /**
   * カスタムARK削除
   */
  delete: protectedProcedure
    .input(z.object({ arkId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ark = await db.getCustomArkById(input.arkId);
      
      // 権限チェック: 自分のARKのみ削除可能
      if (!ark || ark.userId !== ctx.user.id) {
        throw new Error("Custom ARK not found or access denied");
      }

      await db.deleteCustomArk(input.arkId, ctx.user.id);

      return { success: true };
    }),

  /**
   * 公開カスタムARK一覧取得
   */
  listPublic: protectedProcedure.query(async () => {
    return db.getPublicCustomArks();
  }),
});
