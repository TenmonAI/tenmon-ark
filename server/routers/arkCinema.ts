/**
 * Ark Cinema Router
 * アニメ映画生成API
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { generateAnimeMovie } from "../lib/arkCinema";

export const arkCinemaRouter = router({
  /**
   * アニメ映画を生成
   */
  generateMovie: protectedProcedure
    .input(z.object({
      topic: z.string(),
      genre: z.enum(["action", "comedy", "drama", "fantasy", "sci-fi"]).default("fantasy"),
      duration: z.number().default(300),
      targetLanguage: z.string().default("ja"),
    }))
    .mutation(async ({ input }) => {
      const result = await generateAnimeMovie(input);
      return result;
    }),

  /**
   * 生成履歴を取得
   */
  getGenerationHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: データベースから取得
      return [];
    }),
});
