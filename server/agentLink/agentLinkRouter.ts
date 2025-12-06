/**
 * Agent-to-Agent Link Router
 * TENMON-ARK ⇄ Manus の双方向通信用API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  sharedMemory,
  reportToManus,
  processFeedbackFromManus,
  type SelfHealLogType,
  type ManusFeedback,
} from "./agentToAgentLink";

export const agentLinkRouter = router({
  /**
   * Self-Healログを取得
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        type: z.enum(["error", "warning", "anomaly", "improvement", "feedback"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        since: z.string().optional(), // ISO 8601 date string
      })
    )
    .query(({ input }) => {
      const filter = {
        type: input.type as SelfHealLogType | undefined,
        severity: input.severity,
        since: input.since ? new Date(input.since) : undefined,
      };

      return sharedMemory.getLogs(filter);
    }),

  /**
   * Self-Healログの統計を取得
   */
  getStats: protectedProcedure.query(() => {
    return sharedMemory.getStats();
  }),

  /**
   * TENMON-ARK → Manus: Self-Healログを報告
   */
  reportLog: protectedProcedure
    .input(
      z.object({
        type: z.enum(["error", "warning", "anomaly", "improvement", "feedback"]),
        title: z.string(),
        description: z.string(),
        location: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(({ input }) => {
      reportToManus({
        type: input.type,
        title: input.title,
        description: input.description,
        location: input.location,
        severity: input.severity,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      });
      return { success: true };
    }),

  /**
   * Manus → TENMON-ARK: フィードバックを受信
   */
  receiveFeedback: protectedProcedure
    .input(
      z.object({
        logId: z.string(),
        feedbackType: z.enum(["fix", "ignore", "defer", "clarify"]),
        message: z.string(),
        suggestedAction: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .mutation(({ input }) => {
      const feedback: ManusFeedback = input;
      processFeedbackFromManus(feedback);
      return { success: true };
    }),

  /**
   * ログをクリア（管理者のみ）
   */
  clearLogs: protectedProcedure.mutation(() => {
    sharedMemory.clearLogs();
    return { success: true };
  }),
});
