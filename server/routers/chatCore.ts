import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { conversations, messages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { generateTwinCorePersonaProfile, adjustTextStyleByTwinCorePersona, generateTwinCoreBreathing } from "../twinCorePersonaEngine";
import { applyKotodamaLayer, KOTODAMA_LAYER_DEFAULT_OPTIONS } from "../kotodama/kotodamaLayerIntegration";
import { executeIFE, type SimpleUserProfile } from "../../lib/intellect/index";
import { loadUserSyncProfile, saveUserSyncProfile, learnFromConversation } from "../../lib/intellect/userSyncStore";

/**
 * Chat Core Router
 * 
 * TENMON-ARK Chat Coreの会話OS機能を提供するtRPCルーター
 * Twin-Core人格統合、メッセージ送受信、会話履歴管理を実装
 */

export const chatCoreRouter = router({
  /**
   * 会話一覧取得
   */
  getConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, ctx.user.id))
        .orderBy(desc(conversations.lastMessageAt));

      return userConversations;
    }),

  /**
   * 会話作成
   */
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      shukuyo: z.string().optional(),
      conversationMode: z.enum(["general", "intermediate", "expert"]).default("general"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [newConversation] = await db.insert(conversations).values({
        userId: ctx.user.id,
        title: input.title || "新しい会話",
        shukuyo: input.shukuyo,
        conversationMode: input.conversationMode,
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });

      return newConversation;
    }),

  /**
   * メッセージ履歴取得
   */
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 会話の所有権確認
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found");
      }

      if (conversation[0]!.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // メッセージ取得
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt)
        .limit(input.limit);

      return conversationMessages;
    }),

  /**
   * メッセージ送信
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 会話の所有権確認
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found");
      }

      if (conversation[0]!.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // ユーザーメッセージを保存
      await db.insert(messages).values({
        conversationId: input.conversationId,
        role: "user" as const,
        content: input.content,
        createdAt: new Date(),
      });

      // Twin-Core人格プロファイル生成
      const shukuyo = conversation[0]!.shukuyo || "角";
      const conversationMode = conversation[0]!.conversationMode || "general";
      const personaProfile = generateTwinCorePersonaProfile(shukuyo, conversationMode);

      // メッセージ履歴取得（コンテキスト用）
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt)
        .limit(10);

      // Twin-Core推論の"呼吸"を生成
      const breathing = generateTwinCoreBreathing(personaProfile);

      // User-SyncプロファイルをDBから読み込み（永続化）
      let userProfile: SimpleUserProfile | undefined = await loadUserSyncProfile(ctx.user.id) ?? undefined;
      
      if (!userProfile) {
        // 初回の場合はデフォルトプロファイルを作成
        userProfile = {
          fireWaterTendency: personaProfile.fireWaterBalance > 0.5 ? 'fire' : personaProfile.fireWaterBalance < -0.5 ? 'water' : 'balanced',
          languageStyle: personaProfile.communicationStyle,
          textStylePreference: String(personaProfile.amatsuKanagiPattern),
          topicPatterns: [],
          thinkingDepth: conversationMode === 'expert' ? 'deep' : conversationMode === 'intermediate' ? 'medium' : 'shallow',
          tempo: 'moderate',
          shukuyoInfo: shukuyo,
        };
        
        // DBに保存
        if (userProfile) {
          await saveUserSyncProfile(ctx.user.id, userProfile);
        }
      }

      // IFE v5.6 パイプライン実行
      // preprocessTwinCore → multiModelRouter → semanticAugmentor → postprocessTwinCore
      const ifeResult = await executeIFE(input.content, {
        userProfile,
        enableReasoning: true,
        enableUserSync: true,
        prioritizeQuality: true,
      });

      // IFEの出力を取得
      let assistantContent = ifeResult.output;

      // Twin-Core人格に基づいて文体を最終調整
      assistantContent = adjustTextStyleByTwinCorePersona(assistantContent, personaProfile);

      // Activation-Centering Hybrid Engine を適用
      const { generateChatResponseWithActivationCentering } = await import("../chat/activationCenteringHybridEngine");
      assistantContent = await generateChatResponseWithActivationCentering(
        input.content,
        assistantContent,
        {
          priority: "awakening", // デフォルト: 覚醒を最優先
          targetCoherence: 80,
          structuralLayer: 5,
        }
      );

      // Kotodama Layer v1 適用（言灵変換）
      const kotodamaResult = applyKotodamaLayer(assistantContent, KOTODAMA_LAYER_DEFAULT_OPTIONS);
      assistantContent = kotodamaResult.text;

      // アシスタントメッセージを保存（IFEメタデータを含む）
      await db.insert(messages).values({
        conversationId: input.conversationId,
        role: "assistant" as const,
        content: assistantContent,
        metadata: JSON.stringify({
          personaProfile,
          breathing,
          ifeMetadata: {
            processingTime: ifeResult.metadata.processingTime,
            selectedModel: ifeResult.routing.selectedModel,
            taskType: ifeResult.routing.taskType,
            fireWaterBalance: ifeResult.preprocessing.fireWater?.balance,
            reasoningApplied: !!ifeResult.reasoning,
            userSyncApplied: !!ifeResult.userSync,
          },
        }),
        createdAt: new Date(),
      });

      // 会話の最終メッセージ時刻を更新
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, input.conversationId));

      // User-Sync学習（会話履歴から学習）
      await learnFromConversation(
        ctx.user.id,
        input.content,
        assistantContent,
        {
          fireWaterBalance: ifeResult.preprocessing.fireWater?.balance as 'fire' | 'water' | 'balanced',
          thinkingDepth: conversationMode === 'expert' ? 'deep' : conversationMode === 'intermediate' ? 'medium' : 'shallow',
          topicPatterns: [],
        }
      );

      return {
        content: assistantContent,
        personaProfile,
        breathing,
      };
    }),

  /**
   * 会話削除
   */
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 会話の所有権確認
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found");
      }

      if (conversation[0]!.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // メッセージ削除
      await db
        .delete(messages)
        .where(eq(messages.conversationId, input.conversationId));

      // 会話削除
      await db
        .delete(conversations)
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * 会話タイトル更新
   */
  updateConversationTitle: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      title: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 会話の所有権確認
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found");
      }

      if (conversation[0]!.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // タイトル更新
      await db
        .update(conversations)
        .set({ title: input.title })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * 会話設定更新（宿曜・会話モード）
   */
  updateConversationSettings: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      shukuyo: z.string().optional(),
      conversationMode: z.enum(["general", "intermediate", "expert"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 会話の所有権確認
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error("Conversation not found");
      }

      if (conversation[0]!.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // 設定更新
      const updateData: any = {};
      if (input.shukuyo) updateData.shukuyo = input.shukuyo;
      if (input.conversationMode) updateData.conversationMode = input.conversationMode;

      await db
        .update(conversations)
        .set(updateData)
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),
});
