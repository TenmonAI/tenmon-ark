import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLMStream } from "../_core/llm";
import { buildLpSoftPersonaPromptFromSiteInfo, filterLpSoftResponse, applyKyujiMapping } from "../lpHelpers";
import { observable } from "@trpc/server/observable";

/**
 * LP用Q&Aルーター（ストリーミング版）
 * 
 * 設計方針:
 * - GPT風の段階的な回答表示
 * - SSE (Server-Sent Events) を使用
 * - SiteInfo Memory を動的に参照
 * - セッションメモリ対応（後で追加）
 */
export const lpQaRouterStream = router({
  /**
   * ストリーミングチャット
   * tRPCのsubscriptionを使用してSSEを実現
   */
  chatStream: publicProcedure
    .input(
      z.object({
        question: z.string().min(1, "質問を入力してください"),
        sessionId: z.string().optional(), // セッションID（Phase 4で使用）
      })
    )
    .subscription(async ({ input }) => {
      return observable<{ type: "chunk" | "done"; content: string }>((emit) => {
        (async () => {
          try {
            // サイト情報から動的にシステムプロンプトを構築
            const systemPrompt = await buildLpSoftPersonaPromptFromSiteInfo();

            // ストリーミングLLM呼び出し
            const stream = invokeLLMStream({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input.question },
              ],
            });

            let fullContent = "";

            // チャンクを順次送信
            for await (const delta of stream) {
              if (delta) {
                fullContent += delta;
                emit.next({ type: "chunk", content: delta });
              }
            }

            // フィルター適用
            let filteredContent = filterLpSoftResponse(fullContent);
            
            // 旧字体マッピング適用
            filteredContent = await applyKyujiMapping(filteredContent);

            // 完了通知
            emit.next({ type: "done", content: filteredContent });
            emit.complete();
          } catch (error) {
            console.error("[LP-QA-STREAM] Error:", error);
            emit.error(new Error("回答の生成に失敗しました。もう一度お試しください。"));
          }
        })();
      });
    }),

  /**
   * 非ストリーミング版（後方互換性のため残す）
   */
  chat: publicProcedure
    .input(
      z.object({
        question: z.string().min(1, "質問を入力してください"),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = await buildLpSoftPersonaPromptFromSiteInfo();

        const stream = invokeLLMStream({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.question },
          ],
        });

        let fullContent = "";
        for await (const delta of stream) {
          if (delta) {
            fullContent += delta;
          }
        }

        let answer = filterLpSoftResponse(fullContent);
        answer = await applyKyujiMapping(answer);

        return { answer };
      } catch (error) {
        console.error("[LP-QA-STREAM] Error:", error);
        throw new Error("回答の生成に失敗しました。もう一度お試しください。");
      }
    }),
});
