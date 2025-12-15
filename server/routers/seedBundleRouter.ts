/**
 * ============================================================
 *  SEED BUNDLE ROUTER — Seed Bundle API
 * ============================================================
 * 
 * Seed Bundle の生成・取得 API
 * ============================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { generateSeedBundle } from "../kokuzo/offline/seedBundle";
import { getAllFractalSeeds } from "../kokuzo/db/adapter";

const generateSeedBundleSchema = z.object({
  deviceId: z.string(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  expiresAt: z.number().optional(),
  tags: z.array(z.string()).optional(),
  seedLimit: z.number().default(100),
});

export const seedBundleRouter = router({
  /**
   * Seed Bundle を生成
   */
  generateSeedBundle: protectedProcedure
    .input(generateSeedBundleSchema)
    .mutation(async ({ ctx, input }) => {
      // グローバルシードを取得
      const globalSeeds = await getAllFractalSeeds(input.seedLimit);
      
      // 優先度に応じてシードをフィルタリング
      let selectedSeeds = globalSeeds;
      if (input.priority === "high") {
        // 重要度の高いシードのみ
        selectedSeeds = globalSeeds
          .filter((s: any) => (s.compressedRepresentation?.seedWeight || 0) > 0.7)
          .slice(0, input.seedLimit);
      }

      // Seed Bundle を生成
      const bundle = await generateSeedBundle(
        ctx.user.id.toString(),
        input.deviceId,
        selectedSeeds as any[],
        {
          priority: input.priority,
          expiresAt: input.expiresAt,
          tags: input.tags,
        }
      );

      return {
        success: true,
        bundle,
      };
    }),

  /**
   * ユーザーの Seed Bundle 一覧を取得
   */
  getUserSeedBundles: protectedProcedure.query(async ({ ctx }) => {
    // 実際の実装では、データベースから Seed Bundle を取得
    return {
      bundles: [],
    };
  }),
});

