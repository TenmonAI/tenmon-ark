import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";

/**
 * ASR (Automatic Speech Recognition) Router
 * Whisper Large-v3 を使用した音声→テキスト変換
 * 将来的には言灵・天津金木解析も統合可能
 */
export const asrRouter = router({
  /**
   * 音声をテキストに変換
   */
  transcribe: publicProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        language: z.string().optional().default("ja"),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: input.prompt,
      });

      // エラーチェック
      if ('error' in result) {
        console.error("[ASR] Transcription failed:", result);
        throw new Error(result.error);
      }

      // 将来的にはここで言灵・天津金木解析を追加
      // const kotodamaAnalysis = await analyzeKotodama(result.text);
      // const twinCoreAnalysis = await analyzeTwinCore(result.text);

      return {
        text: result.text,
        language: result.language,
        segments: result.segments,
      };
    }),
});
