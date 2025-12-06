/**
 * Distributed Soul Cloud Router (tRPC API)
 * 分散靈核クラウド API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as cloudEngine from "./distributedSoulCloudEngine";
import { analyzeEthics } from "../reiEthicFilterEngine";

export const distributedCloudRouter = router({
  /**
   * ノードを登録
   */
  registerNode: protectedProcedure
    .input(
      z.object({
        deviceType: z.enum(["mobile", "desktop", "server"]),
        cpuContribution: z.number().min(0).max(5),
        memoryContribution: z.number().min(0).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const node = cloudEngine.registerNode(
        ctx.user!.id,
        input.deviceType,
        input.cpuContribution,
        input.memoryContribution
      );
      return node;
    }),

  /**
   * タスクを実行（倫理フィルタ統合）
   */
  executeTask: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        priority: z.number(),
        data: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      // 倫理フィルタ適用（タスクデータが文字列の場合）
      let ethicAnalysis;
      if (typeof input.data === "string") {
        ethicAnalysis = analyzeEthics(input.data);
        // 中和が必要な場合はタスクを拒否
        if (ethicAnalysis.needsNeutralization && ethicAnalysis.ethicScore < 30) {
          throw new Error("不適切なタスクデータが検知されました。タスクを実行できません。");
        }
      }
      
      const task = await cloudEngine.scheduleTask(input.type, input.priority, input.data);
      
      return {
        ...task,
        ethicAnalysis,
      };
    }),

  /**
   * 負荷分散
   */
  balanceLoad: protectedProcedure.query(async () => {
    const node = cloudEngine.selectOptimalNode();
    return node;
  }),

  /**
   * ノードの健全性を取得
   */
  nodeHealth: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const health = cloudEngine.checkNodeHealth(input.nodeId);
      return health;
    }),

  /**
   * アクティブノードを取得
   */
  activeNodes: protectedProcedure.query(async () => {
    const nodes = cloudEngine.getActiveNodes();
    return nodes;
  }),

  /**
   * クラウド統計を取得
   */
  statistics: protectedProcedure.query(async () => {
    const stats = cloudEngine.getCloudStatistics();
    return stats;
  }),

  /**
   * ユーザーの貢献度を取得
   */
  contribution: protectedProcedure.query(async ({ ctx }) => {
    const contribution = cloudEngine.getUserContribution(ctx.user!.id);
    return contribution;
  }),
});
