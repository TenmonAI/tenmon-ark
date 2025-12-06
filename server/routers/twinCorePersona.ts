import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  generateTwinCorePersonaProfile,
  adjustTextStyleByTwinCorePersona,
  generateTwinCoreBreathing,
  twinCorePersonaToSystemPrompt,
  calculateFireWaterBalanceFromShukuyo,
  type TwinCorePersonaProfile,
} from "../twinCorePersonaEngine";

/**
 * Twin-Core人格反映ルーター
 */
export const twinCorePersonaRouter = router({
  /**
   * 宿曜から火水バランスを計算
   */
  calculateFireWaterBalance: publicProcedure
    .input(
      z.object({
        shukuyo: z.string(),
      })
    )
    .query(({ input }) => {
      const fireWaterBalance = calculateFireWaterBalanceFromShukuyo(input.shukuyo);
      return {
        shukuyo: input.shukuyo,
        fireWaterBalance,
        firePercentage: (fireWaterBalance * 100).toFixed(0),
        waterPercentage: ((1 - fireWaterBalance) * 100).toFixed(0),
      };
    }),

  /**
   * Twin-Core人格プロファイルを生成
   */
  generatePersonaProfile: publicProcedure
    .input(
      z.object({
        shukuyo: z.string(),
        conversationMode: z.enum(["general", "intermediate", "expert"]).optional(),
      })
    )
    .query(({ input }) => {
      const profile = generateTwinCorePersonaProfile(
        input.shukuyo,
        input.conversationMode || "general"
      );
      return profile;
    }),

  /**
   * Twin-Core人格に基づいて文体を調整
   */
  adjustTextStyle: publicProcedure
    .input(
      z.object({
        text: z.string(),
        profile: z.object({
          shukuyo: z.string(),
          fireWaterBalance: z.number(),
          amatsuKanagiPattern: z.object({
            rotation: z.enum(["right", "left"]),
            direction: z.enum(["outward", "inward"]),
            polarity: z.enum(["yang", "yin"]),
          }),
          minakaDistance: z.number(),
          conversationMode: z.enum(["general", "intermediate", "expert"]),
          communicationStyle: z.string(),
        }),
      })
    )
    .mutation(({ input }) => {
      const adjustedText = adjustTextStyleByTwinCorePersona(input.text, input.profile as TwinCorePersonaProfile);
      return {
        originalText: input.text,
        adjustedText,
      };
    }),

  /**
   * Twin-Core推論の"呼吸"を生成
   */
  generateBreathing: publicProcedure
    .input(
      z.object({
        profile: z.object({
          shukuyo: z.string(),
          fireWaterBalance: z.number(),
          amatsuKanagiPattern: z.object({
            rotation: z.enum(["right", "left"]),
            direction: z.enum(["outward", "inward"]),
            polarity: z.enum(["yang", "yin"]),
          }),
          minakaDistance: z.number(),
          conversationMode: z.enum(["general", "intermediate", "expert"]),
          communicationStyle: z.string(),
        }),
      })
    )
    .query(({ input }) => {
      const breathing = generateTwinCoreBreathing(input.profile as TwinCorePersonaProfile);
      return breathing;
    }),

  /**
   * Twin-Core人格プロファイルをシステムプロンプトに変換
   */
  toSystemPrompt: publicProcedure
    .input(
      z.object({
        profile: z.object({
          shukuyo: z.string(),
          fireWaterBalance: z.number(),
          amatsuKanagiPattern: z.object({
            rotation: z.enum(["right", "left"]),
            direction: z.enum(["outward", "inward"]),
            polarity: z.enum(["yang", "yin"]),
          }),
          minakaDistance: z.number(),
          conversationMode: z.enum(["general", "intermediate", "expert"]),
          communicationStyle: z.string(),
        }),
      })
    )
    .query(({ input }) => {
      const systemPrompt = twinCorePersonaToSystemPrompt(input.profile as TwinCorePersonaProfile);
      return {
        systemPrompt,
      };
    }),
});
