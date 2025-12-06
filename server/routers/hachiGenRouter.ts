/**
 * Hachigen tRPC Router
 * 八方位自己修復エンジンのAPI
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeWithHachigen, type ProblemContext } from "../engines/hachigen/hachiGenAnalyzer";
import { generateRepairPlan } from "../engines/hachigen/hachiGenRepairEngine";
import {
  startEvolutionLoop,
  executeEvolutionStep,
  completeEvolutionLoop,
  runFullEvolutionLoop,
  type EvolutionLoopState,
} from "../engines/hachigen/hachiGenEvolutionLoop";

// グローバル状態管理（ユーザーごとに管理）
const evolutionLoops = new Map<number, EvolutionLoopState>();
const analysisHistory = new Map<number, any[]>();
const temporalLogs = new Map<number, any[]>();

export const hachiGenRouter = router({
  /**
   * 問題を八方位に分析
   */
  analyze: protectedProcedure
    .input(
      z.object({
        problemType: z.enum(["error", "performance", "logic", "user_experience", "integration", "other"]),
        description: z.string(),
        errorMessage: z.string().optional(),
        stackTrace: z.string().optional(),
        components: z.array(z.string()).optional(),
        userFeedback: z.string().optional(),
        performanceMetrics: z
          .object({
            responseTime: z.number().optional(),
            memoryUsage: z.number().optional(),
            cpuUsage: z.number().optional(),
          })
          .optional(),
        conversationContext: z
          .object({
            recentMessages: z.array(z.string()).optional(),
            currentTopic: z.string().optional(),
            userIntent: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const problemContext: ProblemContext = input;
      const analysis = analyzeWithHachigen(problemContext);

      // 分析履歴に追加
      if (!analysisHistory.has(ctx.user.id)) {
        analysisHistory.set(ctx.user.id, []);
      }
      analysisHistory.get(ctx.user.id)!.push({
        timestamp: new Date(),
        analysis,
      });

      // 時間ログに追加
      if (!temporalLogs.has(ctx.user.id)) {
        temporalLogs.set(ctx.user.id, []);
      }
      temporalLogs.get(ctx.user.id)!.push({
        timestamp: new Date(),
        type: "analysis",
        analysisId: analysis.analysisId,
        overallScore: analysis.overallScore,
      });

      return analysis;
    }),

  /**
   * 修復プランを生成
   */
  repair: protectedProcedure
    .input(
      z.object({
        analysisId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 分析履歴から該当の分析を取得
      const history = analysisHistory.get(ctx.user.id) || [];
      const analysisRecord = history.find(h => h.analysis.analysisId === input.analysisId);

      if (!analysisRecord) {
        throw new Error("Analysis not found");
      }

      const repairPlan = generateRepairPlan(analysisRecord.analysis);

      // 時間ログに追加
      if (!temporalLogs.has(ctx.user.id)) {
        temporalLogs.set(ctx.user.id, []);
      }
      temporalLogs.get(ctx.user.id)!.push({
        timestamp: new Date(),
        type: "repair_plan",
        planId: repairPlan.planId,
        totalActions: repairPlan.actions.length,
      });

      return repairPlan;
    }),

  /**
   * 分析レポートを取得
   */
  getReport: protectedProcedure
    .input(
      z.object({
        analysisId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = analysisHistory.get(ctx.user.id) || [];
      const analysisRecord = history.find(h => h.analysis.analysisId === input.analysisId);

      if (!analysisRecord) {
        throw new Error("Analysis not found");
      }

      return {
        analysis: analysisRecord.analysis,
        timestamp: analysisRecord.timestamp,
      };
    }),

  /**
   * スコアを取得
   */
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const history = analysisHistory.get(ctx.user.id) || [];
    
    if (history.length === 0) {
      return {
        currentScore: null,
        previousScore: null,
        trend: "stable" as const,
      };
    }

    const current = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (previous) {
      const diff = current.analysis.overallScore - previous.analysis.overallScore;
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }

    return {
      currentScore: current.analysis.overallScore,
      previousScore: previous?.analysis.overallScore || null,
      trend,
      timestamp: current.timestamp,
    };
  }),

  /**
   * 改善プランを取得
   */
  getImprovementPlan: protectedProcedure.query(async ({ ctx }) => {
    const history = analysisHistory.get(ctx.user.id) || [];
    
    if (history.length === 0) {
      return {
        hasAnalysis: false,
        improvementPlan: null,
      };
    }

    const latest = history[history.length - 1];
    const analysis = latest.analysis;

    // 改善プランを生成
    const improvementPlan = {
      criticalDirections: analysis.criticalDirections,
      healthyDirections: analysis.healthyDirections,
      priorityActions: [] as string[],
      estimatedImpact: 0,
    };

    // 各方位の改善案を収集
    Object.values(analysis.scores).forEach((scoreData: any) => {
      if (scoreData.score < 80) {
        improvementPlan.priorityActions.push(...scoreData.improvements);
      }
    });

    // 推定効果を計算
    const criticalCount = analysis.criticalDirections.length;
    improvementPlan.estimatedImpact = Math.min(100 - analysis.overallScore, criticalCount * 15);

    return {
      hasAnalysis: true,
      improvementPlan,
      currentScore: analysis.overallScore,
      minakaState: analysis.minakaState,
    };
  }),

  /**
   * 完全な自己修復を実行
   */
  executeFullHealing: protectedProcedure
    .input(
      z.object({
        problemType: z.enum(["error", "performance", "logic", "user_experience", "integration", "other"]),
        description: z.string(),
        errorMessage: z.string().optional(),
        stackTrace: z.string().optional(),
        components: z.array(z.string()).optional(),
        userFeedback: z.string().optional(),
        performanceMetrics: z
          .object({
            responseTime: z.number().optional(),
            memoryUsage: z.number().optional(),
            cpuUsage: z.number().optional(),
          })
          .optional(),
        conversationContext: z
          .object({
            recentMessages: z.array(z.string()).optional(),
            currentTopic: z.string().optional(),
            userIntent: z.string().optional(),
          })
          .optional(),
        maxIterations: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { maxIterations, ...problemContext } = input;
      
      // 完全な進化ループを実行
      const result = await runFullEvolutionLoop(
        problemContext as ProblemContext,
        maxIterations || 64
      );

      // 時間ログに追加
      if (!temporalLogs.has(ctx.user.id)) {
        temporalLogs.set(ctx.user.id, []);
      }
      temporalLogs.get(ctx.user.id)!.push({
        timestamp: new Date(),
        type: "full_healing",
        loopId: result.loopId,
        initialScore: result.initialScore,
        finalScore: result.finalScore,
        improvement: result.totalImprovement,
      });

      return result;
    }),

  /**
   * 時間ログを取得
   */
  getTemporalLog: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = temporalLogs.get(ctx.user.id) || [];
      const limit = input.limit || 50;

      return {
        logs: logs.slice(-limit),
        totalCount: logs.length,
      };
    }),

  /**
   * 進化ループを開始
   */
  startEvolutionLoop: protectedProcedure
    .input(
      z.object({
        problemType: z.enum(["error", "performance", "logic", "user_experience", "integration", "other"]),
        description: z.string(),
        errorMessage: z.string().optional(),
        stackTrace: z.string().optional(),
        components: z.array(z.string()).optional(),
        userFeedback: z.string().optional(),
        performanceMetrics: z
          .object({
            responseTime: z.number().optional(),
            memoryUsage: z.number().optional(),
            cpuUsage: z.number().optional(),
          })
          .optional(),
        conversationContext: z
          .object({
            recentMessages: z.array(z.string()).optional(),
            currentTopic: z.string().optional(),
            userIntent: z.string().optional(),
          })
          .optional(),
        maxIterations: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { maxIterations, ...problemContext } = input;
      
      const loopState = startEvolutionLoop(
        problemContext as ProblemContext,
        maxIterations || 64
      );

      evolutionLoops.set(ctx.user.id, loopState);

      return {
        loopId: loopState.loopId,
        status: loopState.status,
        progress: loopState.progress,
        currentStage: loopState.currentStage,
      };
    }),

  /**
   * 進化ループのステップを実行
   */
  executeEvolutionStep: protectedProcedure
    .input(
      z.object({
        problemType: z.enum(["error", "performance", "logic", "user_experience", "integration", "other"]),
        description: z.string(),
        errorMessage: z.string().optional(),
        stackTrace: z.string().optional(),
        components: z.array(z.string()).optional(),
        userFeedback: z.string().optional(),
        performanceMetrics: z
          .object({
            responseTime: z.number().optional(),
            memoryUsage: z.number().optional(),
            cpuUsage: z.number().optional(),
          })
          .optional(),
        conversationContext: z
          .object({
            recentMessages: z.array(z.string()).optional(),
            currentTopic: z.string().optional(),
            userIntent: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const loopState = evolutionLoops.get(ctx.user.id);
      
      if (!loopState) {
        throw new Error("No active evolution loop found");
      }

      const newLoopState = executeEvolutionStep(loopState, input as ProblemContext);
      evolutionLoops.set(ctx.user.id, newLoopState);

      return {
        loopId: newLoopState.loopId,
        status: newLoopState.status,
        progress: newLoopState.progress,
        currentStage: newLoopState.currentStage,
        currentIteration: newLoopState.currentIteration,
      };
    }),

  /**
   * 進化ループを完了
   */
  completeEvolutionLoop: protectedProcedure.mutation(async ({ ctx }) => {
    const loopState = evolutionLoops.get(ctx.user.id);
    
    if (!loopState) {
      throw new Error("No active evolution loop found");
    }

    const result = completeEvolutionLoop(loopState);
    evolutionLoops.delete(ctx.user.id);

    // 時間ログに追加
    if (!temporalLogs.has(ctx.user.id)) {
      temporalLogs.set(ctx.user.id, []);
    }
    temporalLogs.get(ctx.user.id)!.push({
      timestamp: new Date(),
      type: "evolution_complete",
      loopId: result.loopId,
      initialScore: result.initialScore,
      finalScore: result.finalScore,
      improvement: result.totalImprovement,
    });

    return result;
  }),
});
