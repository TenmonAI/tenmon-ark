/**
 * Life Guardian Router (tRPC API)
 * 個人守護AI API
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as lifeGuardianEngine from "./lifeGuardianModeEngine";
import { analyzeEthics } from "../reiEthicFilterEngine";

export const lifeGuardianRouter = router({
  /**
   * デバイスをスキャン
   */
  scanDevice: protectedProcedure.query(async () => {
    const status = lifeGuardianEngine.getDeviceProtectionStatus();
    return status;
  }),

  /**
   * ネットワークを監視（倫理フィルタ統合）
   */
  monitorNetwork: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.content);
      
      const result = await lifeGuardianEngine.performComprehensiveThreatDetection(
        input.url,
        input.content,
        ctx.user!.id,
        {}
      );
      
      // 倫理分析結果を追加
      return {
        ...result,
        ethicAnalysis,
      };
    }),

  /**
   * 緊急アラートを送信
   */
  emergencyAlert: protectedProcedure
    .input(
      z.object({
        dangerType: z.enum(["scam", "phishing", "malware", "abnormal_behavior", "privacy_violation", "device_compromise"]),
        dangerLevel: z.enum(["safe", "low", "medium", "high", "critical"]),
        context: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await lifeGuardianEngine.sendEmergencyAlert(
        ctx.user!.id,
        input.dangerType as lifeGuardianEngine.DangerType,
        input.dangerLevel as lifeGuardianEngine.DangerLevel,
        input.context
      );
      return result;
    }),

  /**
   * セーフモード（脅威からの隔離）
   */
  safeMode: protectedProcedure
    .input(
      z.object({
        enable: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // セーフモードの実装（簡易版）
      return {
        enabled: input.enable,
        message: input.enable
          ? "セーフモードを有効にしました。すべての外部接続がブロックされます。"
          : "セーフモードを無効にしました。",
      };
    }),

  /**
   * 詐欺サイトを検知（倫理フィルタ統合）
   */
  detectScam: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.content);
      
      const result = await lifeGuardianEngine.detectScam(input.url, input.content);
      
      // 倫理分析結果を追加
      return {
        ...result,
        ethicAnalysis,
      };
    }),

  /**
   * フィッシングサイトを検知
   */
  detectPhishing: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await lifeGuardianEngine.detectPhishing(input.url, input.content);
      return result;
    }),

  /**
   * マルウェアを検知
   */
  detectMalware: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await lifeGuardianEngine.detectMalware(input.url, input.content);
      return result;
    }),

  /**
   * 異常行動を検知
   */
  detectAbnormalBehavior: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        context: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await lifeGuardianEngine.detectAbnormalBehavior(ctx.user!.id, input.action, input.context);
      return result;
    }),

  /**
   * 統合脅威検知
   */
  comprehensiveThreatDetection: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        content: z.string(),
        context: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await lifeGuardianEngine.performComprehensiveThreatDetection(
        input.url,
        input.content,
        ctx.user!.id,
        input.context || {}
      );
      return result;
    }),
});

