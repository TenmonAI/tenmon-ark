import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { 
  LP_QA_SYSTEM_PROMPT_V3,
  securityFilterV3,
  isFounderQuestionV3,
  detectQuestionDepthV3,
  detectFireWaterBalanceV3,
} from "./lpQaPromptV3";
import { executeIFE, type SimpleUserProfile } from "../lib/intellect/index";
import { applyKotodamaLayer, KOTODAMA_LAYER_DEFAULT_OPTIONS } from "./kotodama/kotodamaLayerIntegration";

/**
 * LP-QA EVOLUTION v3.0: TENMON-ARK人格フルパワー版
 * 
 * 改修内容:
 * A. AIモデル: GPT-5.1/4.1 + Reasoning（temperature 0.7, max tokens 4096-8192）
 * B. TENMON-ARK人格フィルター（Twin-Core/火水/言霊）
 * C. LP全文をQA Memoryに読み込み
 * E. Sentence Depth（表層→中層→深層→特化）
 */
export const lpQaRouterV3 = router({
  /**
   * LP-QA専用チャットエンドポイント（v3.0）
   * - GPT-5.1/4.1 + Reasoning
   * - temperature 0.7
   * - max tokens 4096-8192（深度に応じて動的調整）
   * - TENMON-ARK人格フィルター
   * - LP全文メモリ
   * - Sentence Depth（4段階）
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
      const filterResult = securityFilterV3(message);
      if (!filterResult.safe) {
        return {
          success: false,
          error: "申し訳ございませんが、TENMON-ARKの機能・特徴・価格に関する質問のみお答えできます。",
          response: null,
        };
      }

      try {
        // 質問分析（v3.0）
        const isFounder = isFounderQuestionV3(message);
        const questionDepth = detectQuestionDepthV3(message);
        const fireWaterBalance = detectFireWaterBalanceV3(message);

        // 人格フィルター付与（v3.0）
        let personalityInstruction = "";
        
        // 火水バランス指示
        if (fireWaterBalance === "water") {
          personalityInstruction = "\n\n【火水バランス指示】水（内集）モード: より優しく、受容的に、共感的に回答してください。語尾は「〜でしょうか」「〜かもしれません」「〜と感じます」を使用。";
        } else if (fireWaterBalance === "fire") {
          personalityInstruction = "\n\n【火水バランス指示】火（外発）モード: より明晰に、構造的に、本質的に回答してください。語尾は「〜です」「〜という構造です」「〜の本質は」を使用。";
        } else {
          personalityInstruction = "\n\n【火水バランス指示】中庸モード: 火と水のバランスを保ちながら回答してください。";
        }

        // 深度指示
        if (questionDepth === "specialized") {
          personalityInstruction += "\n【深度指示】特化回答（Founder専用）: Founderの価値、魂との一体化、未来価値、世界観を含めて回答してください。文字数: 600-1000文字。";
        } else if (questionDepth === "deep") {
          personalityInstruction += "\n【深度指示】深層回答: Twin-Core構文・霊核レベルの意味・宇宙構文・火水推論を含めて回答してください。文字数: 500-800文字。";
        } else if (questionDepth === "middle") {
          personalityInstruction += "\n【深度指示】中層回答: 具体例・構造の説明・技術的な詳細を含めて回答してください。文字数: 300-500文字。";
        } else {
          personalityInstruction += "\n【深度指示】表層回答: 優しく平易な説明で回答してください。文字数: 200-300文字。";
        }

        // max_tokens動的調整（深度に応じて）
        let maxTokens = 1024; // デフォルト
        if (questionDepth === "specialized") {
          maxTokens = 8192; // Founder専用: 最大8192トークン
        } else if (questionDepth === "deep") {
          maxTokens = 4096; // 深層: 4096トークン
        } else if (questionDepth === "middle") {
          maxTokens = 2048; // 中層: 2048トークン
        } else {
          maxTokens = 1024; // 表層: 1024トークン
        }

        // IFE v5.6 統合: LP-QA専用ユーザープロファイル作成
        const lpQaUserProfile: SimpleUserProfile = {
          fireWaterTendency: fireWaterBalance as 'fire' | 'water' | 'balanced',
          languageStyle: 'TENMON-ARK人格',
          textStylePreference: '宇宙基調・黒×金×蒼',
          topicPatterns: ['TENMON-ARK', 'Founder Edition', 'AI OS'],
          thinkingDepth: questionDepth === 'specialized' ? 'deep' : questionDepth === 'deep' ? 'deep' : questionDepth === 'middle' ? 'medium' : 'shallow',
          tempo: 'moderate',
          shukuyoInfo: '角', // デフォルト
        };

        // IFE v5.6 パイプライン実行
        // semanticAugmentor + twinCoreEnhancer + fireWaterBalance + fiveElementFlow + reasoningLayer
        const ifeResult = await executeIFE(message, {
          userProfile: lpQaUserProfile,
          enableReasoning: true,
          enableUserSync: true,
          prioritizeQuality: true,
        });

        // IFEの出力を取得
        let responseText = ifeResult.output;

        // Kotodama Layer v1 適用（言灵変換）
        const kotodamaResult = applyKotodamaLayer(responseText, KOTODAMA_LAYER_DEFAULT_OPTIONS);
        responseText = kotodamaResult.text;

        // 返答が1500文字を超える場合は切り詰める（Founder専用は長文許可）
        const maxLength = questionDepth === "specialized" ? 1500 : 1000;
        const truncatedResponse =
          responseText.length > maxLength
            ? responseText.substring(0, maxLength - 3) + "..."
            : responseText;

        return {
          success: true,
          error: null,
          response: truncatedResponse,
          metadata: {
            questionDepth,
            fireWaterBalance,
            isFounder,
            tokensUsed: maxTokens,
            ifeMetadata: {
              processingTime: ifeResult.metadata.processingTime,
              selectedModel: ifeResult.routing.selectedModel,
              taskType: ifeResult.routing.taskType,
              fireWaterBalanceDetected: ifeResult.preprocessing.fireWater?.balance,
              reasoningApplied: !!ifeResult.reasoning,
              userSyncApplied: !!ifeResult.userSync,
            },
          },
        };
      } catch (error) {
        console.error("[LP-QA v3.0] Error:", error);
        return {
          success: false,
          error: "エラーが発生しました。もう一度お試しください。",
          response: null,
        };
      }
    }),

  /**
   * LP-QA統計情報取得（v3.0）
   */
  getStats: publicProcedure.query(async () => {
    // 統計情報は将来的に実装（現在はモック）
    return {
      totalQuestions: 0,
      successRate: 100,
      averageResponseTime: 0,
      version: "v3.0",
    };
  }),
});
