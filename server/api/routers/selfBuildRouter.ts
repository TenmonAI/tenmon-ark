/**
 * Self-Build Router
 * 
 * Phase Z-5（Self-Build Mode）の統合tRPC API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  generateBuildPlan,
  approveBuildPlan,
  executeBuildPlan,
} from "../../services/self-build/selfBuildEngine";
import {
  detectErrors,
  attemptAutoRepair,
  getRepairHistory,
  requestManusHelp,
} from "../../services/self-build/selfHealEngine";
import {
  learnUserBehavior,
  improveResponseQuality,
  learnSoulCharacteristics,
  getEvolutionHistory,
  rollbackEvolution,
} from "../../services/self-build/selfEvolutionEngine";
import {
  connectToManus,
  generateImprovementRequest,
  applyManusResponse,
  getCoDevHistory,
  emergencyManusCall,
} from "../../services/self-build/coDevGateway";

export const selfBuildRouter = router({
  // ========================================
  // Self-Build Engine APIs
  // ========================================

  /**
   * 自己構築計画を生成
   */
  generateBuildPlan: protectedProcedure
    .input(
      z.object({
        goal: z.string(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await generateBuildPlan(ctx.user.id, input.goal, input.context);
      return plan;
    }),

  /**
   * 自己構築計画を承認
   */
  approveBuildPlan: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 天聞（admin）のみ承認可能
      if (ctx.user.role !== "admin") {
        throw new Error("Only admin can approve build plans");
      }

      const plan = await approveBuildPlan(input.planId, ctx.user.id);
      return plan;
    }),

  /**
   * 自己構築計画を実行
   */
  executeBuildPlan: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await executeBuildPlan(input.planId);
      return { success: true };
    }),

  // ========================================
  // Self-Heal Engine APIs
  // ========================================

  /**
   * エラーを自動検知
   */
  detectErrors: protectedProcedure
    .input(
      z.object({
        systemState: z.unknown().optional(),
        recentLogs: z.array(z.string()).optional(),
        metrics: z.record(z.string(), z.number()).optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await detectErrors({
        systemState: input.systemState,
        recentLogs: input.recentLogs,
        metrics: input.metrics,
      });
      return result;
    }),

  /**
   * 自動修復を試行
   */
  attemptAutoRepair: protectedProcedure
    .input(
      z.object({
        errorType: z.enum(["runtime", "logic", "data", "integration", "performance"]),
        errorMessage: z.string(),
        context: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await attemptAutoRepair(
        input.errorType,
        input.errorMessage,
        input.context
      );
      return result;
    }),

  /**
   * 修復履歴を取得
   */
  getRepairHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const history = await getRepairHistory(input.limit);
      return history;
    }),

  /**
   * Manus連携を要求
   */
  requestManusHelp: protectedProcedure
    .input(
      z.object({
        errorType: z.enum(["runtime", "logic", "data", "integration", "performance"]),
        errorMessage: z.string(),
        context: z.record(z.string(), z.unknown()),
        previousAttempts: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await requestManusHelp(
        input.errorType,
        input.errorMessage,
        input.context,
        input.previousAttempts
      );
      return { success: true };
    }),

  // ========================================
  // Self-Evolution Engine APIs
  // ========================================

  /**
   * ユーザー行動パターンを学習
   */
  learnUserBehavior: protectedProcedure
    .input(
      z.object({
        interactions: z.array(
          z.object({
            input: z.string(),
            output: z.string(),
            feedback: z.enum(["positive", "negative", "neutral"]).optional(),
            timestamp: z.string(),  // ISO string
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interactions = input.interactions.map(i => ({
        ...i,
        timestamp: new Date(i.timestamp),
      }));
      const result = await learnUserBehavior(ctx.user.id, interactions);
      return result;
    }),

  /**
   * 応答品質を改善
   */
  improveResponseQuality: protectedProcedure
    .input(
      z.object({
        recentResponses: z.array(
          z.object({
            input: z.string(),
            output: z.string(),
            feedback: z.enum(["positive", "negative", "neutral"]).optional(),
          })
        ),
        userPreferences: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await improveResponseQuality(ctx.user.id, {
        recentResponses: input.recentResponses,
        userPreferences: input.userPreferences,
      });
      return result;
    }),

  /**
   * Soul Sync統合（魂特性学習）
   */
  learnSoulCharacteristics: protectedProcedure
    .input(
      z.object({
        soulType: z.string().optional(),
        soulAttributes: z.record(z.string(), z.number()).optional(),
        soulResonance: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await learnSoulCharacteristics(ctx.user.id, {
        soulType: input.soulType,
        soulAttributes: input.soulAttributes,
        soulResonance: input.soulResonance,
      });
      return result;
    }),

  /**
   * 進化履歴を取得
   */
  getEvolutionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = await getEvolutionHistory(ctx.user.id, input.limit);
      return history;
    }),

  /**
   * 進化をロールバック
   */
  rollbackEvolution: protectedProcedure
    .input(
      z.object({
        evolutionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await rollbackEvolution(input.evolutionId);
      return { success: true };
    }),

  // ========================================
  // Co-Dev Gateway APIs
  // ========================================

  /**
   * Manus API連携基盤
   */
  connectToManus: protectedProcedure.query(async () => {
    const result = await connectToManus();
    return result;
  }),

  /**
   * 自動改善依頼を生成
   */
  generateImprovementRequest: protectedProcedure
    .input(
      z.object({
        currentIssue: z.string(),
        systemState: z.unknown().optional(),
        userFeedback: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateImprovementRequest({
        currentIssue: input.currentIssue,
        systemState: input.systemState,
        userFeedback: input.userFeedback,
        priority: input.priority,
      });
      return result;
    }),

  /**
   * Manus応答を自動適用
   */
  applyManusResponse: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        manusResponse: z.object({
          success: z.boolean(),
          changes: z
            .array(
              z.object({
                type: z.string(),
                description: z.string(),
                code: z.string().optional(),
              })
            )
            .optional(),
          message: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await applyManusResponse(input.requestId, input.manusResponse);
      return result;
    }),

  /**
   * 共同開発履歴を取得
   */
  getCoDevHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const history = await getCoDevHistory(input.limit);
      return history;
    }),

  /**
   * 緊急時のManus呼び出し
   */
  emergencyManusCall: protectedProcedure
    .input(
      z.object({
        issue: z.string(),
        context: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      await emergencyManusCall(input.issue, input.context);
      return { success: true };
    }),
});
