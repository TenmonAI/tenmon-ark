import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { buildLpSoftPersonaPromptFromSiteInfo, filterLpSoftResponse, applyKyujiMapping } from "../lpHelpers";

/**
 * LP用Q&Aルーター（シンプル版）
 * 
 * 設計方針:
 * - IMEガード一切なし
 * - conversationHistory なし（単発Q&A）
 * - SiteInfo Memory を動的に参照
 * - 超シンプルな実装でバグを最小化
 */
export const lpQaRouterSimple = router({
  chat: publicProcedure
    .input(
      z.object({
        question: z.string().min(1, "質問を入力してください"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // サイト情報から動的にシステムプロンプトを構築
        const systemPrompt = await buildLpSoftPersonaPromptFromSiteInfo();

        // LLM呼び出し（シンプルな2メッセージ構造）
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.question },
          ],
        });

        // レスポンステキストを取得
        const rawContent = result.choices[0]?.message?.content ?? "";
        let answer = typeof rawContent === "string" ? rawContent : "";

        // フィルター適用（セールス文、HTMLタグなどを除去）
        answer = filterLpSoftResponse(answer);

        // 旧字体マッピング適用
        answer = await applyKyujiMapping(answer);

        return { answer };
      } catch (error) {
        console.error("[LP-QA-SIMPLE] Error:", error);
        throw new Error("回答の生成に失敗しました。もう一度お試しください。");
      }
    }),
});
