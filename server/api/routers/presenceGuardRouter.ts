/**
 * Presence Guard Router
 * 
 * Presence OS v1.0の閾値変更を管理するtRPC API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  requestThresholdChange,
  approveThresholdChange,
  rejectThresholdChange,
  getThresholdChangeHistory,
  getCurrentThresholds,
} from "../../services/presence-guard/presenceThresholdGuard";

export const presenceGuardRouter = router({
  /**
   * 閾値変更リクエストを作成
   */
  requestThresholdChange: protectedProcedure
    .input(
      z.object({
        thresholdPath: z.string(),
        proposedValue: z.unknown(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await requestThresholdChange(
        ctx.user.id,
        input.thresholdPath,
        input.proposedValue,
        input.reason
      );
      return {
        success: true,
        requestId: request.id!,
        request,
      };
    }),

  /**
   * 閾値変更リクエストを承認
   */
  approveThresholdChange: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 天聞（admin）のみ承認可能
      if (ctx.user.role !== "admin") {
        throw new Error("Only admin can approve threshold changes");
      }

      const request = await approveThresholdChange(input.requestId, ctx.user.id);
      return {
        success: true,
        request,
      };
    }),

  /**
   * 閾値変更リクエストを拒否
   */
  rejectThresholdChange: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 天聞（admin）のみ拒否可能
      if (ctx.user.role !== "admin") {
        throw new Error("Only admin can reject threshold changes");
      }

      const request = await rejectThresholdChange(input.requestId, ctx.user.id);
      return {
        success: true,
        request,
      };
    }),

  /**
   * 閾値変更履歴を取得
   */
  getThresholdChangeHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const history = await getThresholdChangeHistory(input.limit);
      return history;
    }),

  /**
   * 現在の閾値を取得
   */
  getCurrentThresholds: protectedProcedure.query(() => {
    return getCurrentThresholds();
  }),
});
