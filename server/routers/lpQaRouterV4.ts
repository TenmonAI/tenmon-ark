/**
 * LP専用Q&Aルーター vΩ-ROLLBACK
 * 
 * Minimal Persona 完全固定版
 * - 動的プロンプト構築なし
 * - SiteInfo Memory参照なし
 * - LLM呼び出しは2メッセージ構造に統一
 * - conversationHistory完全削除
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { applyKyujiToLlmResponse } from "../kotodama/kyujiOutputFilter";
import { 
  LP_MINIMAL_PERSONA_SYSTEM_PROMPT,
  filterLpMinimalResponse 
} from "../prompts/lpMinimalPersona";

/**
 * LP専用Q&Aルーター
 * 
 * 【設計】
 * - Minimal Persona固定
 * - 2メッセージ構造: [system, user]
 * - 旧字体フィルター適用
 * - Minimal出力フィルター適用
 */
export const lpQaRouterV4 = router({
  /**
   * LP専用Q&A
   */
  chat: publicProcedure
    .input(
      z.object({
        question: z.string().min(1, "質問を入力してください"),
        apiKey: z.string().min(1), // API Key 必須
        conversationHistory: z.array(z.string()).optional(),
        depth: z.string().optional(),
        fireWaterBalance: z.string().optional(),
        userTemperature: z.string().optional(),
        enableIfe: z.boolean().optional(),
        enableGuidance: z.boolean().optional(),
        enableLinks: z.boolean().optional(),
        enableMemorySync: z.boolean().optional(),
        lpPublicMode: z.boolean().optional(),
        lpMinimalMode: z.boolean().optional(),
        language: z.string().optional(),
        userId: z.number().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // API認証チェック
        const expectedApiKey = process.env.ARK_PUBLIC_KEY;
        if (expectedApiKey && input.apiKey !== expectedApiKey) {
          throw new Error('Invalid API key');
        }

        // 1. システムプロンプトは固定
        const systemPrompt = LP_MINIMAL_PERSONA_SYSTEM_PROMPT;

        // 2. LLM呼び出し: 2メッセージ構造に統一
        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: input.question }
        ];

        console.log("[LP-DEBUG] systemPrompt:", systemPrompt);
        console.log("[LP-DEBUG] messages:", messages);

        const response = await invokeLLM({
          messages,
        });

        const content = response.choices[0]?.message?.content || "";
        
        // contentが文字列でない場合は変換
        let rawAnswer: string;
        if (typeof content === "string") {
          rawAnswer = content;
        } else {
          // contentが配列の場合、textコンテンツを抽出
          const textContent = content
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join("\n");
          rawAnswer = textContent || "";
        }

        // 3. 旧字体フィルター適用
        const kyujiFiltered = applyKyujiToLlmResponse(rawAnswer);

        // 4. Minimal出力フィルター適用
        const finalAnswer = filterLpMinimalResponse(kyujiFiltered);

        return {
          response: finalAnswer,
          depth: 'surface',
          fireWaterBalance: 'balanced',
          metadata: {
            model: "gpt-4o-mini",
            mode: "minimal",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        console.error("[LP-QA-ERROR]", error);
        throw new Error(
          error instanceof Error 
            ? error.message 
            : "回答の生成に失敗しました"
        );
      }
    }),

  /**
   * 質問分析（互換性のために残す）
   */
  analyzeQuestion: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        conversationHistory: z.array(z.string()).optional().default([]),
        apiKey: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      // API認証チェック
      const expectedApiKey = process.env.ARK_PUBLIC_KEY;
      if (expectedApiKey && input.apiKey !== expectedApiKey) {
        throw new Error('Invalid API key');
      }

      return {
        guidanceMode: undefined,
        lpLinks: [],
        metadata: {
          questionEnergy: 0,
          particleDensity: 0,
          minakaPulseSpeed: 0,
        },
      };
    }),

  /**
   * Memory Stats取得（互換性のために残す）
   */
  getMemoryStats: publicProcedure
    .input(
      z.object({
        userId: z.number().min(1),
        apiKey: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      // API認証チェック
      const expectedApiKey = process.env.ARK_PUBLIC_KEY;
      if (expectedApiKey && input.apiKey !== expectedApiKey) {
        throw new Error('Invalid API key');
      }

      return {
        stmCount: 0,
        mtmCount: 0,
        ltmCount: 0,
      };
    }),
});
