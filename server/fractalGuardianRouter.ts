/**
 * Fractal Guardian Router (tRPC API)
 * フラクタル守護モデル API
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as fractalModel from "./fractalGuardianModel";

export const fractalGuardianRouter = router({
  /**
   * 三層守護状態を取得
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await fractalModel.getFractalGuardianStatus(ctx.user!.id);
    return status;
  }),

  /**
   * 統合保護レポートを取得
   */
  getReport: protectedProcedure.query(async ({ ctx }) => {
    const report = await fractalModel.generateIntegratedProtectionReport(ctx.user!.id);
    return report;
  }),

  /**
   * 脅威を上位層に伝達
   */
  propagateThreatUpward: protectedProcedure
    .input(
      z.object({
        threatType: z.string(),
        threatData: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await fractalModel.propagateThreatUpward(
        ctx.user!.id,
        input.threatType,
        input.threatData
      );
      return { success: true };
    }),

  /**
   * 警告を下位層に伝達
   */
  propagateWarningDownward: protectedProcedure
    .input(
      z.object({
        warningType: z.string(),
        warningData: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      await fractalModel.propagateWarningDownward(
        input.warningType,
        input.warningData
      );
      return { success: true };
    }),
});
