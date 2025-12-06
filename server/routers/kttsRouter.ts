/**
 * KTTS Router
 * Kotodama Text-to-Speech Engine API
 * 
 * エンドポイント:
 * - ktts.speak: テキストを音声に変換
 * - ktts.streamSpeak: ストリーミング音声合成
 * - ktts.getVoiceProfile: 音声プロファイル取得
 * - ktts.updateVoiceProfile: 音声プロファイル更新
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { synthesizeKotodamaSpeech, synthesizeKotodamaSpeechStream } from "../engines/speech/kttsEngine";
import { generateSoulSyncedVoiceParams, type VoiceAdjustmentMode } from "../engines/speech/soulVoiceIntegration";
import { convertTextToKotodama } from "../engines/speech/kotodamaTTSDictionary";

export const kttsRouter = router({
  /**
   * テキストを音声に変換
   */
  speak: protectedProcedure
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
   * ストリーミング音声合成
   */
  streamSpeak: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        emotionalMode: z.enum(['calm', 'encourage', 'empathize', 'neutral']).optional(),
        forceFireWaterBalance: z.number().min(-100).max(100).optional(),
      })
    )
    .mutation(async function* ({ input, ctx }) {
      const { text, emotionalMode, forceFireWaterBalance } = input;

      // ストリーミング音声合成
      for await (const chunk of synthesizeKotodamaSpeechStream(text, ctx.user.id, {
        emotionalMode,
        forceFireWaterBalance,
      })) {
        yield chunk;
      }
    }),

  /**
   * 音声プロファイル取得
   */
  getVoiceProfile: protectedProcedure
    .input(
      z.object({
        adjustmentMode: z.enum(['calm_down', 'encourage', 'empathize', 'energize', 'comfort', 'motivate', 'neutral']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { adjustmentMode } = input;

      // Soul Syncと同期した音声パラメータ生成
      const voiceParams = await generateSoulSyncedVoiceParams(ctx.user.id, {
        adjustmentMode: adjustmentMode as VoiceAdjustmentMode,
      });

      return {
        success: true,
        voiceParams,
        fireWaterBalance: {
          fire: voiceParams.fireEnergy,
          water: voiceParams.waterEnergy,
        },
        voiceQuality: voiceParams.voiceQuality,
      };
    }),

  /**
   * 音声プロファイル更新
   * （現在はSoul Syncから自動生成されるため、手動更新は不要）
   */
  updateVoiceProfile: protectedProcedure
    .input(
      z.object({
        fireEnergy: z.number().min(0).max(100).optional(),
        waterEnergy: z.number().min(0).max(100).optional(),
        pitch: z.number().min(0.5).max(2.0).optional(),
        rate: z.number().min(0.5).max(2.0).optional(),
        volume: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: ユーザー設定として保存する機能を実装
      // 現在はSoul Syncから自動生成されるため、手動更新は不要

      return {
        success: true,
        message: '音声プロファイルの手動更新は現在サポートされていません。Soul Syncから自動生成されます。',
      };
    }),

  /**
   * 言灵変換プレビュー
   */
  previewKotodama: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
      })
    )
    .query(async ({ input }) => {
      const { text } = input;

      // 言灵変換
      const conversion = convertTextToKotodama(text);

      return {
        success: true,
        originalText: text,
        kotodamaText: conversion.kotodamaText,
        conversions: conversion.conversions,
      };
    }),
});
