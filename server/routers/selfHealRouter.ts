/**
 * TENMON-ARK Self-Heal OS v1.0
 * tRPC API Router
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { selfHealOS } from '../selfHeal/selfHealOS';
import { diagnosticsEngine } from '../selfHeal/diagnosticsEngine';
import { selfReportLayer } from '../selfHeal/selfReportLayer';
import { selfPatchLayer } from '../selfHeal/selfPatchLayer';
import { selfVerifyEngine } from '../selfHeal/selfVerifyEngine';
import { selfEvolveFoundation } from '../selfHeal/selfEvolveFoundation';

export const selfHealRouter = router({
  /**
   * Self-Heal OSのステータスを取得
   */
  getStatus: publicProcedure.query(async () => {
    return selfHealOS.getStatus();
  }),

  /**
   * 診断レポートを生成
   */
  runDiagnostics: publicProcedure.query(async () => {
    return await selfHealOS.runDiagnostics();
  }),

  /**
   * Self-Healサイクルを実行
   */
  runSelfHealCycle: publicProcedure
    .input(
      z.object({
        context: z.enum(['prod', 'dev', 'test']).default('prod'),
      })
    )
    .mutation(async ({ input }) => {
      return await selfHealOS.runSelfHealCycle(input.context);
    }),

  /**
   * サイクル履歴を取得
   */
  getCycleHistory: publicProcedure.query(async () => {
    return selfHealOS.getCycleHistory();
  }),

  /**
   * 特定のサイクルを取得
   */
  getCycle: publicProcedure
    .input(
      z.object({
        cycleId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return selfHealOS.getCycle(input.cycleId);
    }),

  /**
   * 診断イシューを記録
   */
  recordIssue: publicProcedure
    .input(
      z.object({
        type: z.enum(['ui', 'api', 'build', 'deploy', 'router', 'state', 'cache', 'dom']),
        severity: z.enum(['critical', 'high', 'medium', 'low']),
        message: z.string(),
        location: z.string().optional(),
        stackTrace: z.string().optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const issue: import('../selfHeal/diagnosticsEngine').DiagnosticIssue = {
        ...input,
        timestamp: Date.now(),
      };
      diagnosticsEngine.recordIssue(issue);
      return { success: true };
    }),

  /**
   * レポート履歴を取得
   */
  getReportHistory: publicProcedure.query(async () => {
    return selfReportLayer.getReportHistory();
  }),

  /**
   * パッチ履歴を取得
   */
  getPatchHistory: publicProcedure.query(async () => {
    return selfPatchLayer.getPatchHistory();
  }),

  /**
   * 検証履歴を取得
   */
  getVerificationHistory: publicProcedure.query(async () => {
    return selfVerifyEngine.getVerificationHistory();
  }),

  /**
   * 進化メトリクスを取得
   */
  getEvolutionMetrics: publicProcedure.query(async () => {
    return selfEvolveFoundation.getEvolutionMetrics();
  }),

  /**
   * 予測アラートを取得
   */
  getPredictiveAlerts: publicProcedure.query(async () => {
    return selfEvolveFoundation.getPredictiveAlerts();
  }),

  /**
   * 最適化提案を取得
   */
  getOptimizationSuggestions: publicProcedure.query(async () => {
    return selfEvolveFoundation.getOptimizationSuggestions();
  }),

  /**
   * 失敗記憶を取得
   */
  getFailureMemory: publicProcedure.query(async () => {
    const memory = selfEvolveFoundation.getFailureMemory();
    return Array.from(memory.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));
  }),

  /**
   * Consoleエラーを記録
   */
  recordConsoleError: publicProcedure
    .input(
      z.object({
        error: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      selfVerifyEngine.recordConsoleError(input.error);
      return { success: true };
    }),

  /**
   * ErrorBoundaryログを記録
   */
  recordErrorBoundaryLog: publicProcedure
    .input(
      z.object({
        log: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      selfVerifyEngine.recordErrorBoundaryLog(input.log);
      return { success: true };
    }),

  /**
   * 診断イシューをクリア
   */
  clearIssues: publicProcedure.mutation(async () => {
    diagnosticsEngine.clearIssues();
    return { success: true };
  }),

  /**
   * 全データをクリア（開発用）
   */
  clearAllData: publicProcedure.mutation(async () => {
    diagnosticsEngine.clearIssues();
    selfReportLayer.clearReportHistory();
    selfVerifyEngine.clearConsoleErrors();
    selfVerifyEngine.clearErrorBoundaryLogs();
    selfEvolveFoundation.clearFailureMemory();
    selfEvolveFoundation.clearPredictiveAlerts();
    selfEvolveFoundation.clearOptimizationSuggestions();
    return { success: true };
  }),
});
