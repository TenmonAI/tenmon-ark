/**
 * Universal Language Router (tRPC API)
 * 多言語靈性変換API
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  calculateUniversalFireWaterBalance,
  getLanguageFireWater,
  getPhonemeType,
} from "./universalFireWaterClassification";
import {
  convertToSpiritualLanguage,
  calculateSpiritualScore,
  convertBetweenLanguages,
  ALL_SPIRITUAL_MAPPING,
  CROSS_LANGUAGE_SPIRITUAL_MAPPING,
} from "./universalLanguageCorrectorEngine";

export const universalLanguageRouter = router({
  /**
   * 多言語火水分類を取得
   */
  getFireWaterClassification: publicProcedure
    .input(
      z.object({
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .query(({ input }) => {
      const classifications = getLanguageFireWater(input.language);
      return {
        language: input.language,
        classifications,
        count: classifications.length,
      };
    }),

  /**
   * 音素の火水タイプを取得
   */
  getPhonemeType: publicProcedure
    .input(
      z.object({
        phoneme: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .query(({ input }) => {
      const type = getPhonemeType(input.phoneme, input.language);
      return {
        phoneme: input.phoneme,
        language: input.language,
        type,
      };
    }),

  /**
   * テキストの火水バランスを計算
   */
  calculateFireWaterBalance: publicProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .query(({ input }) => {
      const balance = calculateUniversalFireWaterBalance(input.text, input.language);
      return {
        text: input.text,
        language: input.language,
        ...balance,
      };
    }),

  /**
   * テキストを靈性的な表現に変換
   */
  convertToSpiritual: publicProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
        balanceFireWater: z.boolean().optional(),
        priorityThreshold: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      const result = convertToSpiritualLanguage(input.text, input.language, {
        balanceFireWater: input.balanceFireWater,
        priorityThreshold: input.priorityThreshold,
      });
      return result;
    }),

  /**
   * 靈性スコアを計算
   */
  calculateSpiritualScore: publicProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
        mappingCount: z.number(),
      })
    )
    .query(({ input }) => {
      const score = calculateSpiritualScore(input.text, input.language, input.mappingCount);
      return {
        text: input.text,
        language: input.language,
        score,
      };
    }),

  /**
   * 言語間で靈性を保持した変換
   */
  convertBetweenLanguages: publicProcedure
    .input(
      z.object({
        text: z.string(),
        sourceLanguage: z.enum(["ja", "en", "ko", "zh", "ar", "hi", "sa", "la"]),
        targetLanguage: z.enum(["ja", "en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .mutation(({ input }) => {
      const result = convertBetweenLanguages(
        input.text,
        input.sourceLanguage,
        input.targetLanguage
      );
      return result;
    }),

  /**
   * 靈性マッピング辞書を取得
   */
  getSpiritualMapping: publicProcedure
    .input(
      z.object({
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .query(({ input }) => {
      const mapping = ALL_SPIRITUAL_MAPPING[input.language];
      return {
        language: input.language,
        mapping,
        count: Object.keys(mapping).length,
      };
    }),

  /**
   * 言語間靈性マッピングを取得
   */
  getCrossLanguageMapping: publicProcedure
    .input(
      z.object({
        sourceLanguage: z.enum(["ja", "en", "ko", "zh", "ar", "hi", "sa", "la"]).optional(),
        targetLanguage: z.enum(["ja", "en", "ko", "zh", "ar", "hi", "sa", "la"]).optional(),
      })
    )
    .query(({ input }) => {
      let mappings = CROSS_LANGUAGE_SPIRITUAL_MAPPING;

      if (input.sourceLanguage) {
        mappings = mappings.filter((m) => m.sourceLanguage === input.sourceLanguage);
      }

      if (input.targetLanguage) {
        mappings = mappings.filter((m) => m.targetLanguage === input.targetLanguage);
      }

      return {
        mappings,
        count: mappings.length,
      };
    }),

  /**
   * サポートされている言語のリストを取得
   */
  getSupportedLanguages: publicProcedure.query(() => {
    return {
      languages: [
        { code: "ja", name: "日本語", nativeName: "日本語" },
        { code: "en", name: "English", nativeName: "English" },
        { code: "ko", name: "Korean", nativeName: "한국어" },
        { code: "zh", name: "Chinese", nativeName: "中文" },
        { code: "ar", name: "Arabic", nativeName: "العربية" },
        { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
        { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
        { code: "la", name: "Latin", nativeName: "Latina" },
      ],
    };
  }),

  /**
   * 霊的距離（ミナカからの距離）を計算
   */
  calculateSpiritualDistance: publicProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
      })
    )
    .query(({ input }) => {
      // 火水バランスを計算
      const balance = calculateUniversalFireWaterBalance(input.text, input.language);
      
      // ミナカ（中心）からの距離を計算
      // 火水バランスが0.5（完全バランス）に近いほど距離が近い
      const distanceFromCenter = Math.abs(balance.balance - 0.5) * 2; // 0-1の範囲
      
      // 霊的距離スコア（0-100、0が中心、100が最遠）
      const spiritualDistance = Math.round(distanceFromCenter * 100);
      
      return {
        text: input.text,
        language: input.language,
        fireWaterBalance: balance.balance,
        distanceFromCenter,
        spiritualDistance,
        interpretation: spiritualDistance < 20 
          ? "ミナカ（中心）に非常に近い"
          : spiritualDistance < 50
          ? "ミナカ（中心）からやや離れている"
          : "ミナカ（中心）から遠い",
      };
    }),

  /**
   * チャット応答に世界言語火水OSを統合
   */
  integrateIntoChatResponse: publicProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.enum(["en", "ko", "zh", "ar", "hi", "sa", "la"]),
        responseText: z.string(),
      })
    )
    .mutation(({ input }) => {
      // 入力テキストの火水バランスを計算
      const inputBalance = calculateUniversalFireWaterBalance(input.text, input.language);
      
      // 応答テキストの火水バランスを計算
      const responseBalance = calculateUniversalFireWaterBalance(input.responseText, input.language);
      
      // バランスの差を計算
      const balanceDiff = Math.abs(inputBalance.balance - responseBalance.balance);
      
      // バランス調整が必要かどうかを判定（差が0.1以上の場合）
      const needsAdjustment = balanceDiff > 0.1;
      
      // 調整された応答（簡易版：バランス情報を追加）
      let adjustedResponse = input.responseText;
      if (needsAdjustment) {
        const adjustmentNote = `\n\n【火水バランス調整】\n入力: ${(inputBalance.balance * 100).toFixed(1)}% 火性\n応答: ${(responseBalance.balance * 100).toFixed(1)}% 火性\nバランス差: ${(balanceDiff * 100).toFixed(1)}%`;
        adjustedResponse = input.responseText + adjustmentNote;
      }
      
      return {
        originalResponse: input.responseText,
        adjustedResponse,
        inputBalance: inputBalance.balance,
        responseBalance: responseBalance.balance,
        adjustmentApplied: needsAdjustment,
        balanceDiff,
      };
    }),

  /**
   * 統計情報を取得
   */
  getStatistics: publicProcedure.query(() => {
    const enCount = Object.keys(ALL_SPIRITUAL_MAPPING.en).length;
    const koCount = Object.keys(ALL_SPIRITUAL_MAPPING.ko).length;
    const zhCount = Object.keys(ALL_SPIRITUAL_MAPPING.zh).length;
    const arCount = Object.keys(ALL_SPIRITUAL_MAPPING.ar).length;
    const hiCount = Object.keys(ALL_SPIRITUAL_MAPPING.hi).length;

    return {
      totalMappings: enCount + koCount + zhCount + arCount + hiCount,
      crossLanguageMappings: CROSS_LANGUAGE_SPIRITUAL_MAPPING.length,
      supportedLanguages: 8, // サンスクリット語・ラテン語を追加
      phonemeClassifications: {
        en: getLanguageFireWater("en").length,
        ko: getLanguageFireWater("ko").length,
        zh: getLanguageFireWater("zh").length,
        ar: getLanguageFireWater("ar").length,
        hi: getLanguageFireWater("hi").length,
        sa: getLanguageFireWater("sa").length,
        la: getLanguageFireWater("la").length,
      },
    };
  }),
});
