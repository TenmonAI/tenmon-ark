/**
 * Natural Presence Router
 * Natural Presence Engine tRPC API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { NaturalPresenceEngine } from "../engines/presence/naturalPresenceEngine";

// グローバルエンジンインスタンス（ユーザーごとに管理する場合はMapを使用）
const presenceEngines = new Map<number, NaturalPresenceEngine>();

function getPresenceEngine(userId: number): NaturalPresenceEngine {
  if (!presenceEngines.has(userId)) {
    presenceEngines.set(userId, new NaturalPresenceEngine());
  }
  return presenceEngines.get(userId)!;
}

export const naturalPresenceRouter = router({
  /**
   * 存在感を分析
   */
  analyzePresence: protectedProcedure
    .input(
      z.object({
        volumeLevel: z.number().min(0).max(100),
        frequency: z.number().min(0),
        tremor: z.number().min(0).max(100),
        speed: z.number().min(0),
        vibration: z.number().min(0).max(100),
        pitchVariation: z.number().min(0).max(100),
        durationMs: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const engine = getPresenceEngine(ctx.user.id);
      const state = engine.analyzePresence(input);
      
      return {
        breath: state.breath,
        emotion: state.emotion,
        direction: state.direction,
        timestamp: state.timestamp,
      };
    }),

  /**
   * 完全な存在感分析を実行
   */
  executeFullAnalysis: protectedProcedure
    .input(
      z.object({
        audioInput: z.object({
          volumeLevel: z.number().min(0).max(100),
          frequency: z.number().min(0),
          tremor: z.number().min(0).max(100),
          speed: z.number().min(0),
          vibration: z.number().min(0).max(100),
          pitchVariation: z.number().min(0).max(100),
          durationMs: z.number().min(0),
        }),
        arkState: z.object({
          emotion: z.object({
            emotion: z.enum(["joy", "sadness", "anger", "fear", "calm", "neutral"]),
            intensity: z.number().min(0).max(100),
            stability: z.number().min(0).max(100),
            direction: z.enum(["positive", "negative", "neutral"]),
            depth: z.number().min(0).max(100),
          }),
          direction: z.object({
            fireDirection: z.number().min(0).max(100),
            waterDirection: z.number().min(0).max(100),
            neutrality: z.number().min(0).max(100),
            primaryDirection: z.enum(["fire", "water", "neutral"]),
            willStrength: z.number().min(0).max(100),
            receptivityDepth: z.number().min(0).max(100),
          }),
        }),
        conversationDepth: z.number().min(0).max(100),
        conversationContent: z
          .object({
            userMessage: z.string(),
            arkResponse: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const engine = getPresenceEngine(ctx.user.id);
      const result = engine.executeFullPresenceAnalysis(
        input.audioInput,
        input.arkState,
        input.conversationDepth,
        input.conversationContent
      );
      
      return result;
    }),

  /**
   * 寄り添い設定を更新
   */
  updateAccompanimentSettings: protectedProcedure
    .input(
      z.object({
        strength: z.number().min(0).max(100).optional(),
        syncSpeed: z.number().min(0).max(100).optional(),
        distance: z.number().min(0).max(100).optional(),
        mode: z.enum(["mirror", "complement", "lead", "follow"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const engine = getPresenceEngine(ctx.user.id);
      engine.updateAccompanimentSettings(input);
      
      return {
        success: true,
        settings: engine.getAccompanimentSettings(),
      };
    }),

  /**
   * 寄り添い設定を取得
   */
  getAccompanimentSettings: protectedProcedure.query(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    return engine.getAccompanimentSettings();
  }),

  /**
   * 呼吸リズムの変化傾向を取得
   */
  getBreathTrend: protectedProcedure.query(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    return engine.getBreathTrend();
  }),

  /**
   * 感情の変化傾向を取得
   */
  getEmotionTrend: protectedProcedure.query(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    return engine.getEmotionTrend();
  }),

  /**
   * 気配の方向性変化傾向を取得
   */
  getDirectionTrend: protectedProcedure.query(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    return engine.getDirectionTrend();
  }),

  /**
   * 会話空間フィールドを保存
   */
  saveConversationField: protectedProcedure.mutation(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    const field = engine.saveConversationField();
    
    return field;
  }),

  /**
   * 会話空間フィールドを取得
   */
  getConversationField: protectedProcedure
    .input(z.object({ fieldId: z.string() }))
    .query(async ({ ctx, input }) => {
      const engine = getPresenceEngine(ctx.user.id);
      const field = engine.getConversationField(input.fieldId);
      
      if (!field) {
        throw new Error("Conversation field not found");
      }
      
      return field;
    }),

  /**
   * すべての会話空間フィールドを取得
   */
  getAllConversationFields: protectedProcedure.query(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    return engine.getAllConversationFields();
  }),

  /**
   * 履歴をクリア
   */
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const engine = getPresenceEngine(ctx.user.id);
    engine.clearHistory();
    
    return { success: true };
  }),
});
