/**
 * Autonomous Mode Router
 * 
 * Phase Z-6（Autonomous Mode）のAPI統合
 * 
 * API:
 * - autonomousMode.start: 自律モードを開始
 * - autonomousMode.stop: 自律モードを停止
 * - autonomousMode.getStatus: 自律モードの状態を取得
 * - autonomousMode.getAlerts: アラート履歴を取得
 * - autonomousMode.getReiCoreStability: 霊核安定度を取得
 * - autonomousMode.getSystemHealth: システムヘルスを取得
 * - autonomousMode.getSelfRecognition: 自己認識を取得
 * - autonomousMode.reflectOnSelf: 自己省察を実行
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { startAutonomousMonitoring, stopAutonomousMonitoring, getSystemHealth as getSystemHealthFromMonitor, getAlerts as getAlertsFromMonitor } from "../../services/autonomous-mode/autonomousMonitor";
import { startSelfRepairLoop, stopSelfRepairLoop, getSelfRepairLoopStatus } from "../../services/autonomous-mode/selfRepairLoop";
import { startSelfEvolutionLoop, stopSelfEvolutionLoop, getSelfEvolutionLoopStatus } from "../../services/autonomous-mode/selfEvolutionLoop";
import { getSafetyGuardStatus } from "../../services/autonomous-mode/safetyGuard";
import { getReiCoreStability, getReiCoreAlerts } from "../../services/autonomous-mode/reiCoreMonitor";
import { reflectOnSelf, getSelfRecognitionHistory, getLatestSelfRecognition } from "../../services/autonomous-mode/arkInnerMirror";

export const autonomousModeRouter = router({
  /**
   * 自律モードを開始
   */
  start: protectedProcedure
    .input(z.object({
      monitorIntervalMs: z.number().optional(),
      repairIntervalMs: z.number().optional(),
      evolutionIntervalMs: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await startAutonomousMonitoring(input.monitorIntervalMs);
      await startSelfRepairLoop(input.repairIntervalMs);
      await startSelfEvolutionLoop(input.evolutionIntervalMs);

      return {
        success: true,
        message: "Autonomous mode started",
      };
    }),

  /**
   * 自律モードを停止
   */
  stop: protectedProcedure
    .mutation(async () => {
      stopAutonomousMonitoring();
      stopSelfRepairLoop();
      stopSelfEvolutionLoop();

      return {
        success: true,
        message: "Autonomous mode stopped",
      };
    }),

  /**
   * 自律モードの状態を取得
   */
  getStatus: protectedProcedure
    .query(async () => {
      const repairStatus = getSelfRepairLoopStatus();
      const evolutionStatus = getSelfEvolutionLoopStatus();
      const safetyGuardStatus = getSafetyGuardStatus();

      return {
        monitor: { active: true }, // TODO: 実際の状態を取得
        repair: repairStatus,
        evolution: evolutionStatus,
        safetyGuard: safetyGuardStatus,
        overall: {
          active: repairStatus.active && evolutionStatus.active,
        },
      };
    }),

  /**
   * アラート履歴を取得
   */
  getAlerts: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const alerts = getReiCoreAlerts(input.limit);

      return {
        alerts,
        count: alerts.length,
      };
    }),

  /**
   * 霊核安定度を取得
   */
  getReiCoreStability: protectedProcedure
    .query(async () => {
      const stability = await getReiCoreStability();

      return stability;
    }),

  /**
   * システムヘルスを取得
   */
  getSystemHealth: protectedProcedure
    .query(async () => {
      const reiCoreStability = await getReiCoreStability();
      const repairStatus = getSelfRepairLoopStatus();
      const evolutionStatus = getSelfEvolutionLoopStatus();
      const safetyGuardStatus = getSafetyGuardStatus();

      return {
        overall: reiCoreStability.overall,
        reiCore: {
          stability: reiCoreStability.overall,
          fire: reiCoreStability.fire,
          water: reiCoreStability.water,
          minaka: reiCoreStability.minaka,
          balance: reiCoreStability.balance,
        },
        autonomousMode: {
          monitor: true, // TODO: 実際の状態を取得
          repair: repairStatus.active,
          evolution: evolutionStatus.active,
          safetyGuard: safetyGuardStatus.active,
        },
        timestamp: new Date(),
      };
    }),

  /**
   * 自己認識を取得
   */
  getSelfRecognition: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const history = getSelfRecognitionHistory(input.limit);
      const latest = getLatestSelfRecognition();

      return {
        history,
        latest,
        count: history.length,
      };
    }),

  /**
   * 自己省察を実行
   */
  reflectOnSelf: protectedProcedure
    .mutation(async () => {
      const selfRecognition = await reflectOnSelf();

      return {
        success: true,
        selfRecognition,
      };
    }),
});
