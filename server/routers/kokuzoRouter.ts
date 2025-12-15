/**
 * ============================================================
 *  KOKŪZŌ ROUTER — Kokūzō Server API Router
 * ============================================================
 * 
 * Kokūzō Server の API ルーター
 * ============================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getAllSemanticUnits, getAllFractalSeeds, getKzFile } from "../kokuzo/db/adapter";
import { getDb } from "../db";
import { kzFiles, semanticUnits, fractalSeeds } from "../../drizzle/kokuzoSchema";

export const kokuzoRouter = router({
  /**
   * 統計情報を取得
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const semanticUnitCount = await db.select().from(semanticUnits);
    const fractalSeedCount = await db.select().from(fractalSeeds);
    const kzFileCount = await db.select().from(kzFiles);
    
    return {
      semanticUnitCount: semanticUnitCount.length,
      fractalSeedCount: fractalSeedCount.length,
      kzFileCount: kzFileCount.length,
    };
  }),
  
  /**
   * SemanticUnit 一覧を取得
   */
  getSemanticUnits: protectedProcedure
    .input(z.object({
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      return await getAllSemanticUnits(input.limit);
    }),
  
  /**
   * FractalSeed 一覧を取得
   */
  getFractalSeeds: protectedProcedure
    .input(z.object({
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      return await getAllFractalSeeds(input.limit);
    }),
});

