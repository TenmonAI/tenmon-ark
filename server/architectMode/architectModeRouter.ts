/**
 * TENMON-ARK Architect Mode vΩ Router
 * 
 * TENMON-ARK自身が構築状態を解析・診断・提案するAPI
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { architectModeCore } from "./architectModeCore";
import { tenmonToManusLink } from "./tenmonToManusLink";
import { manusToTenmonLink } from "./manusToTenmonLink";
import { selfHealLoop } from "./selfHealLoop";
import { autonomousSuggestionEngine } from "./autonomousSuggestionEngine";

export const architectModeRouter = router({
  /**
   * システム全体の解析を実行
   */
  analyzeSystem: protectedProcedure.mutation(async () => {
    const report = await architectModeCore.analyzeSystem();
    return report;
  }),

  /**
   * 最後のスキャン時刻を取得
   */
  getLastScanTime: protectedProcedure.query(() => {
    return {
      lastScanTime: architectModeCore.getLastScanTime(),
    };
  }),

  /**
   * 問題一覧を取得
   */
  getIssues: protectedProcedure
    .input(
      z.object({
        layer: z
          .enum([
            "UI/UX",
            "API/LLM",
            "Persona Engine",
            "ChatOS",
            "LP-QA",
            "Security",
            "CORS",
            "Deploy",
            "DNS/SSL",
          ])
          .optional(),
        type: z
          .enum(["bug", "performance", "security", "ux", "persona", "architecture", "improvement"])
          .optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
    )
    .query(({ input }) => {
      let issues = architectModeCore.getIssues();

      if (input.layer) {
        issues = issues.filter((i) => i.layer === input.layer);
      }

      if (input.type) {
        issues = issues.filter((i) => i.type === input.type);
      }

      if (input.severity) {
        issues = issues.filter((i) => i.severity === input.severity);
      }

      return issues;
    }),

  /**
   * Manusへ分析レポートを送信
   */
  sendDiagnosticsReport: protectedProcedure.mutation(async () => {
    const report = await architectModeCore.analyzeSystem();
    const success = await tenmonToManusLink.sendDiagnosticsReport(report);
    return { success, report };
  }),

  /**
   * Manusへ修正依頼を送信
   */
  sendFixRequest: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const issues = architectModeCore.getIssues();
      const issue = issues.find((i) => i.id === input.issueId);

      if (!issue) {
        throw new Error(`Issue not found: ${input.issueId}`);
      }

      const success = await tenmonToManusLink.sendFixRequest(issue);
      return { success, issue };
    }),

  /**
   * 送信済みレポート一覧を取得
   */
  getSentReports: protectedProcedure.query(() => {
    const reports = tenmonToManusLink.getSentReports();
    return Array.from(reports.entries()).map(([reportId, sentAt]) => ({
      reportId,
      sentAt,
    }));
  }),

  /**
   * 修正依頼一覧を取得
   */
  getFixRequests: protectedProcedure.query(() => {
    return tenmonToManusLink.getFixRequests();
  }),

  /**
   * Manusからの修正指示を受信
   */
  receiveFixInstruction: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        action: z.enum(["fix", "ignore", "defer", "clarify"]),
        message: z.string(),
        appliedChanges: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await manusToTenmonLink.receiveFixInstruction(input);
      return { success };
    }),

  /**
   * 修正結果を検証
   */
  verifyFix: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        action: z.enum(["fix", "ignore", "defer", "clarify"]),
        message: z.string(),
        appliedChanges: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const instruction = {
        issueId: input.issueId,
        action: input.action,
        message: input.message,
        appliedChanges: input.appliedChanges,
      };

      const verification = await manusToTenmonLink.verifyFix({
        ...instruction,
        timestamp: new Date(),
      });

      return verification;
    }),

  /**
   * 受信済み修正指示一覧を取得
   */
  getReceivedInstructions: protectedProcedure.query(() => {
    return manusToTenmonLink.getReceivedInstructions();
  }),

  /**
   * 検証結果一覧を取得
   */
  getVerifications: protectedProcedure.query(() => {
    return manusToTenmonLink.getVerifications();
  }),

  /**
   * 再評価レポート一覧を取得
   */
  getReEvaluationReports: protectedProcedure.query(() => {
    return manusToTenmonLink.getReEvaluationReports();
  }),

  /**
   * 最新の再評価レポートを取得
   */
  getLatestReEvaluationReport: protectedProcedure.query(() => {
    return manusToTenmonLink.getLatestReEvaluationReport();
  }),

  /**
   * Self-Heal Loopを開始
   */
  startSelfHealLoop: protectedProcedure
    .input(
      z.object({
        intervalMs: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      selfHealLoop.start(input.intervalMs);
      return { success: true, status: selfHealLoop.getStatus() };
    }),

  /**
   * Self-Heal Loopを停止
   */
  stopSelfHealLoop: protectedProcedure.mutation(() => {
    selfHealLoop.stop();
    return { success: true, status: selfHealLoop.getStatus() };
  }),

  /**
   * Self-Heal Loopの状態を取得
   */
  getSelfHealLoopStatus: protectedProcedure.query(() => {
    return selfHealLoop.getStatus();
  }),

  /**
   * 健全性履歴を取得
   */
  getHealthHistory: protectedProcedure.query(() => {
    return selfHealLoop.getHealthHistory();
  }),

  /**
   * 自律提案を生成
   */
  generateSuggestions: protectedProcedure.mutation(async () => {
    const suggestions = await autonomousSuggestionEngine.generateSuggestions();
    return suggestions;
  }),

  /**
   * 提案一覧を取得
   */
  getSuggestions: protectedProcedure.query(() => {
    return autonomousSuggestionEngine.getSuggestions();
  }),

  /**
   * 優先度別に提案を取得
   */
  getSuggestionsByPriority: protectedProcedure
    .input(
      z.object({
        priority: z.enum(["low", "medium", "high", "critical"]),
      })
    )
    .query(({ input }) => {
      return autonomousSuggestionEngine.getSuggestionsByPriority(input.priority);
    }),

  /**
   * 種類別に提案を取得
   */
  getSuggestionsByType: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "ux_improvement",
          "persona_alignment",
          "error_prevention",
          "model_optimization",
          "evolution_opportunity",
        ]),
      })
    )
    .query(({ input }) => {
      return autonomousSuggestionEngine.getSuggestionsByType(input.type);
    }),
});
