/**
 * ASES Router
 * Ark Self Evolution System API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  detectError,
  detectImprovementPoints,
  collectExternalAIOpinions,
  generateSelfEvolutionSchedule,
  generateSelfDiagnosticReport,
  requestManusRepair,
  sendReportToFractalOS,
  type ErrorDetectionResult,
  type ImprovementPoint,
  type SelfEvolutionSchedule,
  type SelfDiagnosticReport,
} from "../engines/selfEvolution/arkSelfEvolutionEngine";

// メモリ内ストレージ（本番環境ではDBを使用）
const errorsStore: ErrorDetectionResult[] = [];
const improvementsStore: ImprovementPoint[] = [];
const schedulesStore: SelfEvolutionSchedule[] = [];
const reportsStore: SelfDiagnosticReport[] = [];

export const asesRouter = router({
  /**
   * エラーを報告
   */
  reportError: protectedProcedure
    .input(
      z.object({
        errorMessage: z.string(),
        errorName: z.string().optional(),
        stackTrace: z.string().optional(),
        file: z.string(),
        function: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const error = new Error(input.errorMessage);
      error.name = input.errorName || 'Error';
      error.stack = input.stackTrace;

      const detectedError = detectError(error, {
        file: input.file,
        function: input.function,
        userId: ctx.user.id,
      });

      // エラーを保存
      errorsStore.push(detectedError);

      // 重要度が高い場合、Manusへ修復依頼
      if (detectedError.severity >= 8) {
        await requestManusRepair(detectedError);
      }

      return {
        success: true,
        error: detectedError,
      };
    }),

  /**
   * エラー一覧を取得
   */
  getErrors: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        minSeverity: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let errors = errorsStore;

      // 重要度でフィルタ
      if (input.minSeverity !== undefined) {
        errors = errors.filter(e => e.severity >= input.minSeverity!);
      }

      // 制限
      if (input.limit) {
        errors = errors.slice(0, input.limit);
      }

      return {
        success: true,
        errors,
        total: errorsStore.length,
      };
    }),

  /**
   * 改善ポイントを検出
   */
  detectImprovements: protectedProcedure
    .input(
      z.object({
        complexity: z.number(),
        linesOfCode: z.number(),
        testCoverage: z.number(),
        performanceScore: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const improvements = detectImprovementPoints(input);

      // 改善ポイントを保存
      improvements.forEach(imp => improvementsStore.push(imp));

      return {
        success: true,
        improvements,
      };
    }),

  /**
   * 改善ポイント一覧を取得
   */
  getImprovements: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        minPriority: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let improvements = improvementsStore;

      // 優先度でフィルタ
      if (input.minPriority !== undefined) {
        improvements = improvements.filter(i => i.priority >= input.minPriority!);
      }

      // 制限
      if (input.limit) {
        improvements = improvements.slice(0, input.limit);
      }

      return {
        success: true,
        improvements,
        total: improvementsStore.length,
      };
    }),

  /**
   * 外部AI意見を収集
   */
  collectAIOpinions: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const opinions = await collectExternalAIOpinions(input.topic);

      return {
        success: true,
        opinions,
      };
    }),

  /**
   * 自己進化スケジュールを生成
   */
  generateSchedule: protectedProcedure
    .mutation(async () => {
      const schedules = generateSelfEvolutionSchedule(errorsStore, improvementsStore);

      // スケジュールを保存
      schedules.forEach(sched => schedulesStore.push(sched));

      return {
        success: true,
        schedules,
      };
    }),

  /**
   * スケジュール一覧を取得
   */
  getSchedules: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
      })
    )
    .query(async ({ input }) => {
      let schedules = schedulesStore;

      // ステータスでフィルタ
      if (input.status) {
        schedules = schedules.filter(s => s.status === input.status);
      }

      return {
        success: true,
        schedules,
        total: schedulesStore.length,
      };
    }),

  /**
   * 自己診断レポートを生成
   */
  generateDiagnosticReport: protectedProcedure
    .input(
      z.object({
        performanceMetrics: z.object({
          averageResponseTime: z.number(),
          uptime: z.number(),
          errorRate: z.number(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const report = generateSelfDiagnosticReport(
        errorsStore,
        improvementsStore,
        input.performanceMetrics
      );

      // レポートを保存
      reportsStore.push(report);

      // Fractal OSへ送信
      await sendReportToFractalOS(report);

      return {
        success: true,
        report,
      };
    }),

  /**
   * レポート一覧を取得
   */
  getReports: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let reports = reportsStore;

      // 制限
      if (input.limit) {
        reports = reports.slice(0, input.limit);
      }

      return {
        success: true,
        reports,
        total: reportsStore.length,
      };
    }),

  /**
   * 最新の診断レポートを取得
   */
  getLatestReport: protectedProcedure
    .query(async () => {
      const latestReport = reportsStore[reportsStore.length - 1] || null;

      return {
        success: true,
        report: latestReport,
      };
    }),
});
