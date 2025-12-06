import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Founder Feedback Center Router
 * 
 * Founderプランユーザーが機能要望・バグ報告を送信できる機能
 */
export const founderFeedbackRouter = router({
  /**
   * フィードバック送信
   */
  submit: protectedProcedure
    .input(
      z.object({
        feedbackType: z.enum(["feature_request", "bug_report", "improvement"]),
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        priority: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Founderプランチェック
      if (ctx.user.plan !== "founder" && ctx.user.plan !== "dev") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This feature is only available for Founder plan users",
        });
      }

      const feedbackId = await db.createFounderFeedback({
        userId: ctx.user.id,
        category: input.feedbackType,
        title: input.title,
        message: input.description,
        priority: input.priority,
      });

      return { feedbackId };
    }),

  /**
   * 自分のフィードバック一覧取得
   */
  listMy: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserFounderFeedback(ctx.user.id);
  }),

  /**
   * 全フィードバック一覧取得（管理者のみ）
   */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    return db.getAllFounderFeedback();
  }),

  /**
   * フィードバック詳細取得
   */
  get: protectedProcedure
    .input(z.object({ feedbackId: z.number() }))
    .query(async ({ ctx, input }) => {
      const feedback = await db.getFounderFeedbackById(input.feedbackId);
      
      // 権限チェック: 自分のフィードバックまたは管理者のみ取得可能
      if (!feedback || (feedback.userId !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback not found or access denied",
        });
      }

      return feedback;
    }),

  /**
   * フィードバックステータス更新（管理者のみ）
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        feedbackId: z.number(),
        status: z.enum(["pending", "approved", "implemented", "rejected"]),
        adminResponse: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      await db.updateFounderFeedbackStatus(input.feedbackId, input.status, input.adminResponse);

      return { success: true };
    }),
});
