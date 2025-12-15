/**
 * ============================================================
 *  ADMIN TRADE ROUTER — 管理者トレードダッシュボード用 tRPC Router
 * ============================================================
 * 
 * 天聞専用（TENMON_ADMIN のみ）
 * 
 * 設計原則:
 * - READ / CONTROL 明確分離
 * - 緊急停止は最上位（他APIより優先）
 * - すべての操作はログ化（不可逆）
 * - T-3 は API レベルでも二重確認
 * ============================================================
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getPhase, setPhase, generateConfirmToken } from "../trade/phaseController";
import { getEmergencyStop, setEmergencyStop } from "../trade/emergencyStop";
import { getLotStatus, overrideLotConfig } from "../trade/lotManager";
import { getSystemStatus } from "../trade/systemStatus";
import { getLatest as getDecisionLogs } from "../trade/decisionLog";
import { getRecentBlocked } from "../trade/kokuzoMemoryView";

export const adminTradeRouter = router({
  // ============================================================
  // READ API
  // ============================================================

  /**
   * 現在のフェーズを取得
   */
  getPhase: adminProcedure.query(async () => {
    return getPhase();
  }),

  /**
   * 市場状態を取得
   */
  getMarketState: adminProcedure.query(async () => {
    // TODO: 実際の市場状態を取得（XAUUSD Trade Engine から）
    // 現時点ではダミーデータ
    return {
      timeRegime: "HIGH_EXPECTANCY",
      atr: 0.42,
      volClass: "VOL_IDEAL",
      marketState: "STATE_VALID",
      lossQuality: "HEALTHY",
      saturationCount: 2,
      saturationMax: 3,
      lockRemainingMinutes: 0,
    };
  }),

  /**
   * 決定ログを取得（READ ONLY）
   * 削除・編集不可
   */
  getDecisionLogs: adminProcedure.query(async () => {
    return getDecisionLogs(100);
  }),

  /**
   * Kokūzō Memory の禁止構文を取得（READ ONLY）
   * 編集・削除禁止
   */
  getKokuzoBlockedPatterns: adminProcedure.query(async () => {
    return getRecentBlocked(50);
  }),

  /**
   * ロット状態を取得
   */
  getLotStatus: adminProcedure.query(async () => {
    return getLotStatus();
  }),

  /**
   * システム状態を取得
   */
  getSystemStatus: adminProcedure.query(async () => {
    return getSystemStatus();
  }),

  /**
   * 緊急停止状態を取得
   */
  getEmergencyStop: adminProcedure.query(async () => {
    return getEmergencyStop();
  }),

  // ============================================================
  // CONTROL API
  // ============================================================

  /**
   * フェーズを設定（⚠️最重要）
   * T-3 は UI と API 両方で二重確認
   */
  setPhase: adminProcedure
    .input(
      z.object({
        phase: z.enum(["T-1", "T-2", "T-3"]),
        confirmToken: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.openId || "TENMON";
      const ipAddress = ctx.req.ip || (ctx.req.headers["x-forwarded-for"] as string);

      setPhase(input.phase, input.confirmToken, userId, ipAddress);

      return { ok: true, phase: input.phase };
    }),

  /**
   * T-3 用確認トークンを生成
   */
  generateConfirmToken: adminProcedure
    .input(
      z.object({
        phase: z.enum(["T-1", "T-2", "T-3"]),
      })
    )
    .mutation(async ({ input }) => {
      if (input.phase !== "T-3") {
        throw new Error("確認トークンは T-3 のみ必要です");
      }
      const token = generateConfirmToken(input.phase);
      return { token };
    }),

  /**
   * 緊急停止を設定（最優先）
   * Decision Engine より上位
   */
  setEmergencyStop: adminProcedure
    .input(
      z.object({
        mode: z.enum(["ALL", "BUY", "SELL", "OFF"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.openId || "TENMON";
      const ipAddress = ctx.req.ip || (ctx.req.headers["x-forwarded-for"] as string);

      await setEmergencyStop(input.mode, userId, ipAddress);

      return { ok: true, emergencyStop: getEmergencyStop() };
    }),

  /**
   * ロット設定を手動で上書き
   */
  overrideLotConfig: adminProcedure
    .input(
      z.object({
        maxLot: z.number().optional(),
        mode: z.enum(["AGGRESSIVE", "SAFE"]).optional(),
        riskPerTrade: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.openId || "TENMON";
      const ipAddress = ctx.req.ip || (ctx.req.headers["x-forwarded-for"] as string);

      overrideLotConfig(input, userId, ipAddress);

      return { ok: true, lotStatus: getLotStatus() };
    }),
});
