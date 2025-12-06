/**
 * Soul Sync Router (tRPC API)
 * 個人靈核OS API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as soulSyncEngine from "./soulSyncEngine";
import { analyzeEthics } from "../reiEthicFilterEngine";
import * as soulSyncArkCore from "./soulSyncArkCoreIntegration";

export const soulSyncRouter = router({
  /**
   * 魂プロファイルを取得
   */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await soulSyncEngine.analyzeSoulCharacteristics(ctx.user!.id, []);
    return profile;
  }),

  /**
   * 思考パターンを抽出
   */
  patterns: protectedProcedure.query(async ({ ctx }) => {
    const patterns = await soulSyncEngine.analyzeThinkingPatterns(ctx.user!.id, []);
    return patterns;
  }),

  /**
   * 靈的成長レポートを取得
   */
  growth: protectedProcedure.query(async ({ ctx }) => {
    const soulCharacteristics = await soulSyncEngine.analyzeSoulCharacteristics(ctx.user!.id, []);
    const thinkingPatterns = await soulSyncEngine.analyzeThinkingPatterns(ctx.user!.id, []);
    const report = await soulSyncEngine.generateSpiritualGrowthReport(ctx.user!.id, soulCharacteristics, thinkingPatterns);
    return report;
  }),

  /**
   * 行動を記録（倫理フィルタ統合）
   */
  recordAction: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        context: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.action);
      
      const result = await soulSyncEngine.recordUserAction(ctx.user!.id, input.action, input.context);
      
      return {
        ...result,
        ethicAnalysis,
      };
    }),

  /**
   * 感情を記録
   */
  recordEmotion: protectedProcedure
    .input(
      z.object({
        emotion: z.string(),
        intensity: z.number().min(0).max(1),
        context: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await soulSyncEngine.recordEmotion(ctx.user!.id, input.emotion, input.intensity, input.context);
      return result;
    }),

  /**
   * 魂の同期状態を取得
   */
  syncStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await soulSyncEngine.getSoulSyncStatus(ctx.user!.id);
    return status;
  }),

  /**
   * 推奨アクションを取得
   */
  recommendations: protectedProcedure.query(async ({ ctx }) => {
    const recommendations = await soulSyncEngine.getRecommendations(ctx.user!.id);
    return recommendations;
  }),

  /**
   * Soul Sync常駐状態を取得
   */
  getResidentStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = soulSyncArkCore.getSoulSyncResidentStatus(ctx.user!.id);
    return status;
  }),

  /**
   * Soul Syncを常駐化
   */
  startResident: protectedProcedure.mutation(async ({ ctx }) => {
    const status = await soulSyncArkCore.startSoulSyncResident(ctx.user!.id);
    return status;
  }),

  /**
   * Soul Syncを停止
   */
  stopResident: protectedProcedure.mutation(async ({ ctx }) => {
    const success = soulSyncArkCore.stopSoulSyncResident(ctx.user!.id);
    return { success };
  }),

  /**
   * 人格同期状態を取得
   */
  getPersonalitySyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = soulSyncArkCore.getPersonalitySyncStatus(ctx.user!.id);
    return status;
  }),

  /**
   * 人格同期を実行
   */
  syncPersonality: protectedProcedure.mutation(async ({ ctx }) => {
    const status = await soulSyncArkCore.syncPersonality(ctx.user!.id);
    return status;
  }),

  /**
   * チャット最適化設定を取得
   */
  getChatOptimizationSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = soulSyncArkCore.getChatOptimizationSettings(ctx.user!.id);
    return settings;
  }),

  /**
   * チャット最適化設定を更新
   */
  updateChatOptimizationSettings: protectedProcedure
    .input(
      z.object({
        enablePersonalization: z.boolean().optional(),
        enablePersonalityCorrection: z.boolean().optional(),
        enableSpiritualOptimization: z.boolean().optional(),
        optimizationIntensity: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const settings = soulSyncArkCore.updateChatOptimizationSettings(ctx.user!.id, input);
      return settings;
    }),
});
