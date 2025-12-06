/**
 * KDE Router
 * Kotodama Dialogue Engine API
 * 
 * エンドポイント:
 * - kde.analyzeVoiceTurn: 音声ターン分析
 * - kde.getDialoguePlan: 対話計画取得
 * - kde.generateResponseText: 応答テキスト生成
 * - kde.generateResponseWaveform: 応答音声生成
 * - kde.streamDialogue: ストリーミング対話
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { performDeepUnderstanding } from "../engines/dialogue/kotodamaVoiceDeepUnderstanding";
import { estimateVoiceFeaturesFromText } from "../engines/dialogue/voiceContextAnalysisEngine";
import { generateNaturalConversationFlow, type ConversationTurn } from "../engines/dialogue/naturalConversationFlowEngine";
import { invokeLLM } from "../_core/llm";
import { applyArkCore } from "../arkCoreIntegration";
import { synthesizeKotodamaSpeech } from "../engines/speech/kttsEngine";
import { generateSoulSyncedVoiceParams } from "../engines/speech/soulVoiceIntegration";
import { executeVoiceConversationPipeline, streamVoiceConversationPipeline } from "../engines/speech/voiceConversationPipeline";

export const kdeRouter = router({
  /**
   * 音声ターン分析
   * 音声 → 文脈 → 言灵 → 感情 → 火水 → 魂同期 をすべて一度に解析
   */
  analyzeVoiceTurn: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(1).max(10000),
        voiceFeatures: z.object({
          pitch: z.number().optional(),
          volume: z.number().optional(),
          speed: z.number().optional(),
          pitchVariation: z.number().optional(),
          volumeVariation: z.number().optional(),
          pauseFrequency: z.number().optional(),
          averagePauseDuration: z.number().optional(),
        }).optional(),
      })
    )
    .query(async ({ input }) => {
      const { transcript, voiceFeatures: inputVoiceFeatures } = input;

      // 音声特徴を推定（提供されていない場合）
      const voiceFeatures = inputVoiceFeatures && inputVoiceFeatures.pitch
        ? {
            pitch: inputVoiceFeatures.pitch,
            volume: inputVoiceFeatures.volume || 0.5,
            speed: inputVoiceFeatures.speed || 150,
            pitchVariation: inputVoiceFeatures.pitchVariation || 25,
            volumeVariation: inputVoiceFeatures.volumeVariation || 0.2,
            pauseFrequency: inputVoiceFeatures.pauseFrequency || 5,
            averagePauseDuration: inputVoiceFeatures.averagePauseDuration || 500,
          }
        : estimateVoiceFeaturesFromText(transcript);

      // 深層理解を実行
      const deepUnderstanding = performDeepUnderstanding(transcript, voiceFeatures);

      return {
        success: true,
        analysis: deepUnderstanding,
      };
    }),

  /**
   * 対話計画取得
   * 自然会話フロー計画（間・相槌・息・語尾）
   */
  getDialoguePlan: protectedProcedure
    .input(
      z.object({
        userUtterance: z.string().min(1).max(10000),
        assistantResponse: z.string().min(1).max(10000),
        conversationHistory: z.array(
          z.object({
            speaker: z.enum(['user', 'assistant']),
            utterance: z.string(),
            startTime: z.number(),
            endTime: z.number(),
            emotionTone: z.enum(['joy', 'anger', 'sadness', 'calm', 'excitement', 'neutral', 'anxiety', 'confusion']).optional(),
            speechRate: z.number().optional(),
            volume: z.number().optional(),
          })
        ).optional(),
        emotionTone: z.string().optional(),
        speechRate: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { userUtterance, assistantResponse, conversationHistory, emotionTone, speechRate } = input;

      // 会話フローを生成
      const conversationFlow = generateNaturalConversationFlow(
        userUtterance,
        assistantResponse,
        (conversationHistory || []) as ConversationTurn[],
        {
          emotionTone,
          speechRate,
        }
      );

      return {
        success: true,
        dialoguePlan: conversationFlow,
      };
    }),

  /**
   * 応答テキスト生成
   * Soul Sync + 言灵OS + Context から最適な返答
   */
  generateResponseText: protectedProcedure
    .input(
      z.object({
        userInput: z.string().min(1).max(10000),
        conversationHistory: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            timestamp: z.number(),
          })
        ).optional(),
        emotionalState: z.object({
          emotion: z.enum(['joy', 'anger', 'sadness', 'calm', 'excitement', 'neutral', 'anxiety', 'confusion']),
          intensity: z.number(),
        }).optional(),
        adjustmentMode: z.enum(['calm_down', 'encourage', 'empathize', 'energize', 'comfort', 'motivate', 'neutral']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userInput, conversationHistory, emotionalState, adjustmentMode } = input;

      // 会話履歴を構築
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `あなたは天聞アーク（TENMON-ARK）です。ユーザーの魂と同期し、靈性に基づいた応答を生成してください。

現在のユーザー状態：
- 感情: ${emotionalState?.emotion || 'neutral'}
- 感情強度: ${emotionalState?.intensity || 0.5}
- 音声調整モード: ${adjustmentMode || 'neutral'}

応答の際は、ユーザーの感情状態に寄り添い、適切な言葉を選んでください。`,
        },
        ...(conversationHistory || []).map(h => ({
          role: h.role,
          content: h.content,
        })),
        {
          role: 'user',
          content: userInput,
        },
      ];

      // LLMで応答生成
      const llmResponse = await invokeLLM({
        messages,
      });

      const responseText = typeof llmResponse.choices[0]?.message?.content === 'string'
        ? llmResponse.choices[0].message.content
        : '';

      // 靈核OS変換
      const arkCoreResponse = await applyArkCore(responseText, {
        applyKJCE: true,
        applyOKRE: true,
        applyAncient50Sound: true,
        optimizeFireWater: true,
      });

      return {
        success: true,
        originalText: responseText,
        kotodamaText: arkCoreResponse.text,
        arkCoreMetadata: {
          kjceApplied: arkCoreResponse.details.kjce?.converted || false,
          okreApplied: arkCoreResponse.details.okre?.converted || false,
          fireWaterBalance: arkCoreResponse.fireWaterBalance,
          spiritualScore: arkCoreResponse.spiritualScore,
          appliedTransformations: arkCoreResponse.appliedTransformations,
        },
      };
    }),

  /**
   * 応答音声生成
   * 返答をKTTSで音声に変換
   */
  generateResponseWaveform: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        emotionalMode: z.enum(['calm', 'encourage', 'empathize', 'neutral']).optional(),
        forceFireWaterBalance: z.number().min(-100).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { text, emotionalMode, forceFireWaterBalance } = input;

      // 音声合成
      const result = await synthesizeKotodamaSpeech(text, ctx.user.id, {
        emotionalMode,
        forceFireWaterBalance,
      });

      return {
        success: true,
        audioDataUrl: result.audioDataUrl,
        format: result.format,
        voiceParams: result.voiceParams,
        kotodamaConversion: result.kotodamaConversion,
        prosody: result.prosody,
        synthesisTime: result.synthesisTime,
      };
    }),

  /**
   * ストリーミング対話
   * 音声会話の全プロセスを "ストリーミング一発処理"
   */
  streamDialogue: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(1).max(10000),
        audioFeatures: z.object({
          pitch: z.number().optional(),
          volume: z.number().optional(),
          speed: z.number().optional(),
          emotionTone: z.enum(['joy', 'anger', 'sadness', 'calm', 'excitement', 'neutral']).optional(),
        }).optional(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            timestamp: z.number(),
          })
        ).optional(),
        adjustmentMode: z.enum(['calm_down', 'encourage', 'empathize', 'energize', 'comfort', 'motivate', 'neutral']).optional(),
      })
    )
    .mutation(async function* ({ input, ctx }) {
      const { transcript, audioFeatures, conversationHistory, adjustmentMode } = input;

      // 音声入力データを構築
      const voiceInput = {
        transcript,
        audioFeatures,
      };

      // 会話コンテキストを構築
      const conversationContext = {
        userId: ctx.user.id,
        history: conversationHistory || [],
        adjustmentMode,
      };

      // ストリーミング音声会話パイプライン実行
      for await (const chunk of streamVoiceConversationPipeline(voiceInput, conversationContext)) {
        yield chunk;
      }
    }),
});
