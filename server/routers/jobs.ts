/**
 * Job Management Routers
 * 
 * 管理者のみが実行できるジョブ管理エンドポイント
 */

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { triggerMemoryCompressionManually } from "../jobs/memoryCompression";

export const jobsRouter = router({
  /**
   * Manually trigger memory compression job
   * 
   * 管理者のみが実行可能
   */
  triggerMemoryCompression: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can trigger jobs",
      });
    }

    console.log(`[Jobs] Memory compression triggered by admin: ${ctx.user.name}`);

    try {
      await triggerMemoryCompressionManually();
      return { success: true, message: "Memory compression job completed" };
    } catch (error) {
      console.error("[Jobs] Memory compression failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
});
