/**
 * Self-Knowledge Router (Phase Z-3)
 * 自己理解レイヤー API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  understandCode,
  generateImprovementPlan,
  submitPlanForApproval,
  executePlan,
  getSelfKnowledgeStats,
  type CodeUnderstanding,
  type ImprovementPlan,
} from "../engines/selfEvolution/selfKnowledgeLayer";

// メモリ内ストレージ（本番環境ではDBを使用）
const understandingsStore: CodeUnderstanding[] = [];
const plansStore: ImprovementPlan[] = [];

export const selfKnowledgeRouter = router({
  /**
   * コード自己理解を実行
   */
  understandCode: protectedProcedure
    .input(
      z.object({
        targetTypes: z.array(
          z.enum(['syntax', 'reicore_os', 'api', 'module', 'system_integration'])
        ),
      })
    )
    .mutation(async ({ input }) => {
      const understandings = await understandCode(input.targetTypes);

      // 理解結果を保存
      understandings.forEach(understanding => understandingsStore.push(understanding));

      return {
        success: true,
        understandings,
        total: understandings.length,
      };
    }),

  /**
   * 理解結果一覧を取得
   */
  getUnderstandings: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        elementType: z.enum(['syntax', 'reicore_os', 'api', 'module', 'system_integration']).optional(),
        minComplexity: z.number().optional(),
        minImportance: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let understandings = understandingsStore;

      // 要素種別でフィルタ
      if (input.elementType) {
        understandings = understandings.filter(u => u.elementType === input.elementType);
      }

      // 複雑度でフィルタ
      if (input.minComplexity !== undefined) {
        understandings = understandings.filter(u => u.complexity >= input.minComplexity!);
      }

      // 重要度でフィルタ
      if (input.minImportance !== undefined) {
        understandings = understandings.filter(u => u.importance >= input.minImportance!);
      }

      // 制限
      if (input.limit) {
        understandings = understandings.slice(0, input.limit);
      }

      return {
        success: true,
        understandings,
        total: understandingsStore.length,
      };
    }),

  /**
   * 改善計画を生成
   */
  generatePlan: protectedProcedure
    .input(
      z.object({
        understandingIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      let understandings = understandingsStore;

      // 特定の理解結果のみを対象とする場合
      if (input.understandingIds && input.understandingIds.length > 0) {
        understandings = understandings.filter(u => input.understandingIds!.includes(u.understandingId));
      }

      const plan = await generateImprovementPlan(understandings);

      // 計画を保存
      plansStore.push(plan);

      return {
        success: true,
        plan,
      };
    }),

  /**
   * 改善計画一覧を取得
   */
  getPlans: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        status: z.enum(['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'failed']).optional(),
        minPriority: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let plans = plansStore;

      // ステータスでフィルタ
      if (input.status) {
        plans = plans.filter(p => p.status === input.status);
      }

      // 優先度でフィルタ
      if (input.minPriority !== undefined) {
        plans = plans.filter(p => p.priority >= input.minPriority!);
      }

      // 制限
      if (input.limit) {
        plans = plans.slice(0, input.limit);
      }

      return {
        success: true,
        plans,
        total: plansStore.length,
      };
    }),

  /**
   * 改善計画を承認待ちにする
   */
  submitPlanForApproval: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const plan = plansStore.find(p => p.planId === input.planId);

      if (!plan) {
        throw new Error('改善計画が見つかりません');
      }

      const result = await submitPlanForApproval(input.planId);

      // 計画のステータスを更新
      plan.status = 'pending_approval';
      plan.stage = 3; // 承認段階

      return {
        success: true,
        result,
      };
    }),

  /**
   * 改善計画を承認
   */
  approvePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const plan = plansStore.find(p => p.planId === input.planId);

      if (!plan) {
        throw new Error('改善計画が見つかりません');
      }

      if (plan.status !== 'pending_approval') {
        throw new Error('この計画は承認待ちではありません');
      }

      // 計画のステータスを更新
      plan.status = 'approved';

      return {
        success: true,
        message: '改善計画が承認されました。',
      };
    }),

  /**
   * 改善計画を実行
   */
  executePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const plan = plansStore.find(p => p.planId === input.planId);

      if (!plan) {
        throw new Error('改善計画が見つかりません');
      }

      if (plan.status !== 'approved') {
        throw new Error('この計画は承認されていません');
      }

      // 計画のステータスを更新
      plan.status = 'in_progress';
      plan.stage = 4; // 実行段階

      const result = await executePlan(input.planId);

      // 計画のステータスを更新
      if (result.success) {
        plan.status = 'completed';
        plan.steps.forEach(step => step.completed = true);
      } else {
        plan.status = 'failed';
      }

      return {
        success: true,
        result,
      };
    }),

  /**
   * 統計情報を取得
   */
  getStats: protectedProcedure
    .query(async () => {
      const stats = await getSelfKnowledgeStats();

      return {
        success: true,
        stats,
      };
    }),
});
