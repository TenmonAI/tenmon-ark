/**
 * KSRE (Kotodama Speech Recognition Engine) Router
 * 音声認識API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recognizeSpeech,
  classifyYabai,
  classifyAh,
  analyzeCredibility,
} from "./kotodamaSpeechRecognitionEngine";

export const kotodamaSpeechRecognitionRouter = router({
  /**
   * 音声認識を実行
   */
  recognize: protectedProcedure
    .input(
      z.object({
        audioText: z.string().describe("音声認識されたテキスト"),
        config: z
          .object({
            language: z.string().optional(),
            continuous: z.boolean().optional(),
            interimResults: z.boolean().optional(),
            maxAlternatives: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await recognizeSpeech(input.audioText, input.config);
      return result;
    }),

  /**
   * 「やばい」の15種類分類
   */
  classifyYabai: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        emotion: z.string(),
        fireWaterBalance: z.number(),
      })
    )
    .query(({ input }) => {
      const classification = classifyYabai(input.text, input.emotion, input.fireWaterBalance);
      return { classification };
    }),

  /**
   * 「あ…」の語感識別
   */
  classifyAh: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        pauseDuration: z.number(),
        fireWaterBalance: z.number(),
      })
    )
    .query(({ input }) => {
      const classification = classifyAh(input.text, input.pauseDuration, input.fireWaterBalance);
      return { classification };
    }),

  /**
   * 「えっ、ほんと？」の信憑性判断
   */
  analyzeCredibility: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        pauseDuration: z.number(),
      })
    )
    .query(({ input }) => {
      const result = analyzeCredibility(input.text, input.pauseDuration);
      return result;
    }),
});
