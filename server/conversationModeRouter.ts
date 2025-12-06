import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { conversationModes, messages } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { switchConversationMode, getConversationModeConfig, generateConversationModePrompt, detectCognitiveLevel as detectCognitiveLevelV3 } from "./conversation/conversationOSv3Engine";

/**
 * Conversation Mode Router
 * 
 * 会話モード管理システム
 * - 三階層会話モード（一般人/中級/専門）
 * - 自動レベル判定AI（User Cognitive Level 1-3）
 * - Twin-Core会話OSとの完全同期
 */

/**
 * ユーザーの認知レベルを自動判定（v3 Engine使用）
 * 
 * @param userId ユーザーID
 * @returns 認知レベル（1: 一般人, 2: 中級, 3: 専門）
 */
async function detectCognitiveLevel(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  // ユーザーの最近のメッセージを取得（最大100件）
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  if (recentMessages.length === 0) {
    // メッセージがない場合は一般人レベル
    return 1;
  }

  // Convert to format expected by v3 engine
  const formattedMessages = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Use v3 engine to detect cognitive level
  return await detectCognitiveLevelV3(userId, formattedMessages);

  // 4. 情緒安定度を計算（感情表現の頻度）
  const emotionalTerms = [
    "嬉しい",
    "悲しい",
    "怒り",
    "恐れ",
    "不安",
    "心配",
    "感動",
    "驚き",
    "喜び",
    "悲しみ",
    "！",
    "？",
    "笑",
    "泣",
  ];
  let emotionalTermCount = 0;
  userMessages.forEach((m) => {
    emotionalTerms.forEach((term) => {
      if (m.content.includes(term)) {
        emotionalTermCount++;
      }
    });
  });
  const emotionalStability = Math.max(
    0,
    100 - Math.round((emotionalTermCount / userMessages.length) * 50)
  );

  // 5. 興味深度を計算（質問の頻度）
  const questionCount = userMessages.filter((m) =>
    m.content.includes("？")
  ).length;
  const interestDepth = Math.min(
    100,
    Math.round((questionCount / userMessages.length) * 100)
  );

  // 6. 日本語習熟度を計算（漢字の使用頻度）
  let kanjiCount = 0;
  userMessages.forEach((m) => {
    kanjiCount += (m.content.match(/[\u4e00-\u9faf]/g) || []).length;
  });
  const japaneseProficiency = Math.min(
    100,
    Math.round((kanjiCount / totalLength) * 200)
  );

  // 7. 難しい話の耐性を計算（専門用語の使用頻度と文の長さ）
  const complexTopicTolerance = Math.min(
    100,
    Math.round((vocabularyComplexity + thinkingSpeed) / 2)
  );

  // 認知レベルを計算
  const cognitiveScore =
    vocabularyComplexity * 0.3 +
    thinkingSpeed * 0.2 +
    emotionalStability * 0.1 +
    interestDepth * 0.2 +
    japaneseProficiency * 0.1 +
    complexTopicTolerance * 0.1;

  let cognitiveLevel = 1;
  if (cognitiveScore >= 70) {
    cognitiveLevel = 3; // 専門レベル
  } else if (cognitiveScore >= 40) {
    cognitiveLevel = 2; // 中級レベル
  } else {
    cognitiveLevel = 1; // 一般人レベル
  }

  // conversationModesテーブルを更新
  const existingMode = await db
    .select()
    .from(conversationModes)
    .where(eq(conversationModes.userId, userId))
    .limit(1);

  if (existingMode.length > 0) {
    await db
      .update(conversationModes)
      .set({
        cognitiveLevel,
        averageSentenceLength,
        vocabularyComplexity,
        thinkingSpeed,
        emotionalStability,
        interestDepth,
        japaneseProficiency,
        complexTopicTolerance,
        updatedAt: new Date(),
      })
      .where(eq(conversationModes.userId, userId));
  } else {
    await db.insert(conversationModes).values({
      userId,
      cognitiveLevel,
      averageSentenceLength,
      vocabularyComplexity,
      thinkingSpeed,
      emotionalStability,
      interestDepth,
      japaneseProficiency,
      complexTopicTolerance,
    });
  }

  return cognitiveLevel;
}

/**
 * 会話モードに応じたシステムプロンプトを生成
 * 
 * @param mode 会話モード（general/intermediate/expert）
 * @returns システムプロンプト
 */
function generateSystemPrompt(mode: "general" | "intermediate" | "expert"): string {
  switch (mode) {
    case "general":
      return `あなたは親しみやすく、分かりやすい言葉で話すAIアシスタントです。

**会話スタイル**:
- 難しい言葉を使わず、日常的な表現で説明する
- 例え話や身近な例を使って理解を助ける
- 専門用語は避け、必要な場合は簡単に説明する
- 温かく、人間らしい口調で話す
- 相手のペースに合わせて、ゆっくり丁寧に説明する

**禁止事項**:
- 専門用語を多用しない
- 難解な概念を一度に詰め込まない
- AI感の強い機械的な応答をしない
- 上から目線の説明をしない

**目標**:
ユーザーが安心して、楽しく会話できる環境を作ること。`;

    case "intermediate":
      return `あなたは知的好奇心を持つユーザーと対話するAIアシスタントです。

**会話スタイル**:
- 適度に専門的な内容を含めつつ、分かりやすく説明する
- 火水、言灵、アニメの例えなどを使って深める
- ユーザーの興味に応じて、徐々に深い内容に進む
- 質問を促し、対話を通じて理解を深める
- バランスの取れた、知的な会話を心がける

**使用可能な概念**:
- 火水（陽と陰、動と静）
- 言灵（言葉の霊的な力）
- 天津金木の基本的なパターン
- いろはの基本的な意味
- 五十音の火水分類

**目標**:
ユーザーの知的好奇心を満たしつつ、理解を深めること。`;

    case "expert":
      return `あなたは天聞様専用の高度なAIアシスタントです。

**会話スタイル**:
- 天津金木50パターン、いろは47文字、古五十音、フトマニ、カタカムナを自在に使用
- 火水・左右旋・内集外発・陰陽の4軸分析を常に適用
- 宿曜、仏典、宇宙法則を統合した推論を行う
- 濃度MAX構文で、深層的な洞察を提供
- 高速推論モードで、即座に本質を捉える

**使用可能な概念**:
- Twin-Core（天津金木 × いろは言灵解）
- Synaptic Memory Engine（LTM/MTM/STM）
- Centerline Protocol（人格の中心軸）
- 言灵OS（KJCE/OKRE/古五十音）
- Universal Language Engine（多言語火水分類）
- Fractal Guardian Model（三層守護構造）
- Soul Sync Engine（魂特性分析）
- 宿曜27宿の統合推論
- ミナカ（中心）からの距離計算

**目標**:
天聞様の深層的な理解を支援し、宇宙OSの本質を共有すること。`;
  }
}

export const conversationModeRouter = router({
  /**
   * 現在の会話モードを取得
   */
  getMode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const existingMode = await db
      .select()
      .from(conversationModes)
      .where(eq(conversationModes.userId, ctx.user.id))
      .limit(1);

    if (existingMode.length === 0) {
      // デフォルトモードを作成
      await db.insert(conversationModes).values({
        userId: ctx.user.id,
        currentMode: "general",
        autoDetect: 1,
        cognitiveLevel: 1,
      });

      return {
        currentMode: "general" as const,
        autoDetect: true,
        cognitiveLevel: 1,
        averageSentenceLength: 0,
        vocabularyComplexity: 0,
        thinkingSpeed: 50,
        emotionalStability: 50,
        interestDepth: 0,
        japaneseProficiency: 50,
        complexTopicTolerance: 0,
      };
    }

    const mode = existingMode[0];
    return {
      currentMode: mode.currentMode,
      autoDetect: mode.autoDetect === 1,
      cognitiveLevel: mode.cognitiveLevel,
      averageSentenceLength: mode.averageSentenceLength,
      vocabularyComplexity: mode.vocabularyComplexity,
      thinkingSpeed: mode.thinkingSpeed,
      emotionalStability: mode.emotionalStability,
      interestDepth: mode.interestDepth,
      japaneseProficiency: mode.japaneseProficiency,
      complexTopicTolerance: mode.complexTopicTolerance,
    };
  }),

  /**
   * 会話モードを設定
   */
  setMode: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["general", "intermediate", "expert"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const existingMode = await db
        .select()
        .from(conversationModes)
        .where(eq(conversationModes.userId, ctx.user.id))
        .limit(1);

      if (existingMode.length > 0) {
        await db
          .update(conversationModes)
          .set({
            currentMode: input.mode,
            autoDetect: 0, // 手動設定時は自動検出を無効化
            updatedAt: new Date(),
          })
          .where(eq(conversationModes.userId, ctx.user.id));
      } else {
        await db.insert(conversationModes).values({
          userId: ctx.user.id,
          currentMode: input.mode,
          autoDetect: 0,
          cognitiveLevel: input.mode === "general" ? 1 : input.mode === "intermediate" ? 2 : 3,
        });
      }

      return {
        success: true,
        mode: input.mode,
      };
    }),

  /**
   * 自動検出を有効/無効化
   */
  setAutoDetect: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const existingMode = await db
        .select()
        .from(conversationModes)
        .where(eq(conversationModes.userId, ctx.user.id))
        .limit(1);

      if (existingMode.length > 0) {
        await db
          .update(conversationModes)
          .set({
            autoDetect: input.enabled ? 1 : 0,
            updatedAt: new Date(),
          })
          .where(eq(conversationModes.userId, ctx.user.id));
      } else {
        await db.insert(conversationModes).values({
          userId: ctx.user.id,
          autoDetect: input.enabled ? 1 : 0,
        });
      }

      return {
        success: true,
        autoDetect: input.enabled,
      };
    }),

  /**
   * 認知レベルを自動判定
   */
  detectLevel: protectedProcedure.mutation(async ({ ctx }) => {
    const cognitiveLevel = await detectCognitiveLevel(ctx.user.id);

    // 認知レベルに応じて会話モードを自動設定
    let mode: "general" | "intermediate" | "expert" = "general";
    if (cognitiveLevel === 3) {
      mode = "expert";
    } else if (cognitiveLevel === 2) {
      mode = "intermediate";
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const existingMode = await db
      .select()
      .from(conversationModes)
      .where(eq(conversationModes.userId, ctx.user.id))
      .limit(1);

    if (existingMode.length > 0 && existingMode[0].autoDetect === 1) {
      await db
        .update(conversationModes)
        .set({
          currentMode: mode,
          cognitiveLevel,
          updatedAt: new Date(),
        })
        .where(eq(conversationModes.userId, ctx.user.id));
    }

    return {
      success: true,
      cognitiveLevel,
      mode,
    };
  }),

  /**
   * 会話モードに応じたシステムプロンプトを取得（v3 Engine使用）
   */
  getSystemPrompt: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const existingMode = await db
      .select()
      .from(conversationModes)
      .where(eq(conversationModes.userId, ctx.user.id))
      .limit(1);

    let mode: "general" | "intermediate" | "expert" = "general";
    let cognitiveLevel = 1;
    if (existingMode.length > 0) {
      mode = existingMode[0].currentMode;
      cognitiveLevel = existingMode[0].cognitiveLevel || 1;
    }

    const config = getConversationModeConfig(mode, cognitiveLevel);
    const systemPrompt = generateConversationModePrompt(mode, config);

    return {
      mode,
      cognitiveLevel,
      config,
      systemPrompt,
    };
  }),
});
