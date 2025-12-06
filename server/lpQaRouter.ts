import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { 
  LP_QA_SYSTEM_PROMPT, 
  securityFilter, 
  isFounderQuestion,
  detectQuestionDepth,
  detectFireWaterBalance,
  FOUNDER_SPECIALIZED_PROMPT,
} from "./lpQaPrompt";

/**
 * LP-QA専用ルーター（Future UI Upgrade v1.0）
 * B層: 返答人格の最適化
 * - 質問深度判定（表層/中層/深層）
 * - 火水バランス判定（水=受容・優しい、火=明晰・構造）
 * - Founder質問への特化回答
 * - max_tokens拡張（300 → 600）
 */
export const lpQaRouter = router({
  /**
   * LP-QA専用チャットエンドポイント（Future UI Upgrade v1.0）
   * - 履歴なし
   * - 返答最大600文字（拡張）
   * - セキュリティフィルタ
   * - LP範囲外の質問は拒否
   * - 質問深度判定（表層/中層/深層）
   * - 火水バランス判定（水=受容・優しい、火=明晰・構造）
   * - Founder質問への特化回答
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      const { message } = input;

      // セキュリティフィルタ
      const filterResult = securityFilter(message);
      if (!filterResult.safe) {
        return {
          success: false,
          error: "申し訳ございませんが、TENMON-ARKの機能・特徴・価格に関する質問のみお答えできます。",
          response: null,
        };
      }

      try {
        // B層: 質問分析
        const isFounder = isFounderQuestion(message);
        const questionDepth = detectQuestionDepth(message);
        const fireWaterBalance = detectFireWaterBalance(message);

        // B層: 人格フィルター付与
        let personalityInstruction = "";
        
        if (fireWaterBalance === "water") {
          personalityInstruction = "\n\n【火水バランス指示】水（内集）モード: より優しく、受容的に、共感的に回答してください。";
        } else if (fireWaterBalance === "fire") {
          personalityInstruction = "\n\n【火水バランス指示】火（外発）モード: より明晰に、構造的に、本質的に回答してください。";
        } else {
          personalityInstruction = "\n\n【火水バランス指示】中庸モード: 火と水のバランスを保ちながら回答してください。";
        }

        if (questionDepth === "deep") {
          personalityInstruction += "\n【深度指示】深層回答: Twin-Core構文・霊核レベルの意味を含めて回答してください。";
        } else if (questionDepth === "middle") {
          personalityInstruction += "\n【深度指示】中層回答: 具体例・構造の説明を含めて回答してください。";
        } else {
          personalityInstruction += "\n【深度指示】表層回答: 優しく平易な説明で回答してください。";
        }

        if (isFounder) {
          personalityInstruction += `\n【Founder特化】この質問はFounder's Editionに関するものです。以下の要素を統合して回答してください:\n${FOUNDER_SPECIALIZED_PROMPT}`;
        }

        // LLM呼び出し（人格フィルター付与）
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: LP_QA_SYSTEM_PROMPT + personalityInstruction },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 600, // B層: 拡張（300 → 600）
        });

        const responseContent = llmResponse.choices[0]?.message?.content || "";
        const responseText = typeof responseContent === "string" ? responseContent : JSON.stringify(responseContent);

        // 返答が600文字を超える場合は切り詰める
        const truncatedResponse =
          responseText.length > 600
            ? responseText.substring(0, 597) + "..."
            : responseText;

        return {
          success: true,
          error: null,
          response: truncatedResponse,
        };
      } catch (error) {
        console.error("[LP-QA] Error:", error);
        return {
          success: false,
          error: "エラーが発生しました。もう一度お試しください。",
          response: null,
        };
      }
    }),

  /**
   * LP-QA統計情報取得
   * - 総質問数
   * - 成功率
   * - 平均応答時間
   */
  getStats: publicProcedure.query(async () => {
    // 統計情報は将来的に実装（現在はモック）
    return {
      totalQuestions: 0,
      successRate: 100,
      averageResponseTime: 0,
    };
  }),
});
