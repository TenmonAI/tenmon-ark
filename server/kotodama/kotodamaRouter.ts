/**
 * Kotodama Router
 * 言灵OS機能のtRPC API
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  convertToKotodama,
  convertToModernKanji,
  calculateFireWaterBalance,
  countOldKanji,
  calculateSpiritualScore,
} from "./kotodamaJapaneseCorrectorEngine";
import {
  restoreOriginalKanji,
  detectContextType,
  autoRestoreOriginalKanji,
  getRestorableKanji,
  type ContextType,
} from "./originalKanjiRestorationEngine";
import {
  getGojuonElement,
  analyzeSpiritualMeaning,
  getGojuonChart,
  visualizeFireWaterBalance,
  getRowFireWaterBalance,
} from "./ancientGojuonRestorationEngine";

/**
 * Kotodama Router
 */
export const kotodamaRouter = router({
  /**
   * KJCE: 言灵→言灵変換
   */
  convertToKotodama: publicProcedure
    .input(
      z.object({
        text: z.string(),
        useOldKanji: z.boolean().optional().default(true),
        balanceFireWater: z.boolean().optional().default(false),
        priorityThreshold: z.number().optional().default(0),
      })
    )
    .mutation(({ input }) => {
      const converted = convertToKotodama(input.text, {
        useOldKanji: input.useOldKanji,
        balanceFireWater: input.balanceFireWater,
        priorityThreshold: input.priorityThreshold,
      });

      const fireWaterBalance = calculateFireWaterBalance(converted);
      const oldKanjiCount = countOldKanji(converted);
      const spiritualScore = calculateSpiritualScore(converted);

      return {
        original: input.text,
        converted,
        fireWaterBalance,
        oldKanjiCount,
        spiritualScore,
      };
    }),

  /**
   * KJCE: 言灵→言灵変換（逆変換）
   */
  convertToModernKanji: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .mutation(({ input }) => {
      const converted = convertToModernKanji(input.text);

      return {
        original: input.text,
        converted,
      };
    }),

  /**
   * KJCE: 火水バランス計算
   */
  calculateFireWaterBalance: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return calculateFireWaterBalance(input.text);
    }),

  /**
   * OKRE: 旧字体復元
   */
  restoreOriginalKanji: publicProcedure
    .input(
      z.object({
        text: z.string(),
        contextType: z.enum(["spiritual", "academic", "formal", "casual", "modern"]).optional(),
        preserveModern: z.array(z.string()).optional(),
        forceRestore: z.array(z.string()).optional(),
        balanceFireWater: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      return restoreOriginalKanji(input.text, {
        contextType: input.contextType as ContextType | undefined,
        preserveModern: input.preserveModern,
        forceRestore: input.forceRestore,
        balanceFireWater: input.balanceFireWater,
      });
    }),

  /**
   * OKRE: 自動文脈判定による旧字体復元
   */
  autoRestoreOriginalKanji: publicProcedure
    .input(
      z.object({
        text: z.string(),
        preserveModern: z.array(z.string()).optional(),
        forceRestore: z.array(z.string()).optional(),
        balanceFireWater: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      return autoRestoreOriginalKanji(input.text, {
        preserveModern: input.preserveModern,
        forceRestore: input.forceRestore,
        balanceFireWater: input.balanceFireWater,
      });
    }),

  /**
   * OKRE: 文脈タイプ判定
   */
  detectContextType: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        contextType: detectContextType(input.text),
      };
    }),

  /**
   * OKRE: 復元可能な漢字リスト取得
   */
  getRestorableKanji: publicProcedure
    .input(
      z.object({
        text: z.string(),
        contextType: z.enum(["spiritual", "academic", "formal", "casual", "modern"]).optional().default("spiritual"),
      })
    )
    .query(({ input }) => {
      return getRestorableKanji(input.text, input.contextType as ContextType);
    }),

  /**
   * 古五十音: 五十音要素取得
   */
  getGojuonElement: publicProcedure
    .input(
      z.object({
        char: z.string(),
      })
    )
    .query(({ input }) => {
      return getGojuonElement(input.char);
    }),

  /**
   * 古五十音: 靈的意味解析
   */
  analyzeSpiritualMeaning: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return analyzeSpiritualMeaning(input.text);
    }),

  /**
   * 古五十音: 五十音図取得
   */
  getGojuonChart: publicProcedure.query(() => {
    return getGojuonChart();
  }),

  /**
   * 古五十音: 火水バランス可視化
   */
  visualizeFireWaterBalance: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        visualization: visualizeFireWaterBalance(input.text),
      };
    }),

  /**
   * 古五十音: 行別火水バランス取得
   */
  getRowFireWaterBalance: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return getRowFireWaterBalance(input.text);
    }),
});
