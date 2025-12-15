import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  calculateSukuyoMansion,
  getSukuyoMansionById,
  SUKUYO_MANSIONS,
} from "./sukuyoData";
import { executeSukuyoPersonalAI } from "./sukuyo/sukuyoPersonalAIEngine";

/**
 * Sukuyo Personal AI Router
 * 
 * 宿曜パーソナルAIシステム
 * - 生年月日登録
 * - 宿曜27宿解析
 * - 天津金木 × いろは言灵解 × 宿曜の統合推論
 * - ユーザー専用人格生成
 */

/**
 * ユーザー専用人格を生成（7層システムを使用）
 * 
 * @param userId ユーザーID
 * @param birthDate 生年月日
 * @returns ユーザー専用人格データ
 */
async function generatePersonalPersonality(
  userId: number,
  birthDate: Date
): Promise<{
  personalityCore: string;
  personalityTraits: string;
  communicationStyle: string;
  sukuyoMansion: string;
  amatsuKanagiPattern: number;
  irohaCharacter: string;
  fireWaterBalance: number;
  spiritualDistance: number;
}> {
  // Execute 7-layer Sukuyo Personal AI
  const result = await executeSukuyoPersonalAI(userId, birthDate);

  return {
    personalityCore: result.personalPersonality.personalityCore,
    personalityTraits: JSON.stringify(result.personalPersonality.personalityTraits),
    communicationStyle: result.personalPersonality.communicationStyle,
    sukuyoMansion: result.sukuyoMansion.name,
    amatsuKanagiPattern: result.amatsuKanagi.pattern,
    irohaCharacter: result.iroha.character,
    fireWaterBalance: Math.round((result.fireWaterBalance.balance + 1) * 50), // Convert -1~+1 to 0~100
    spiritualDistance: result.spiritualDistance.distanceFromCenter,
  };
}

export const sukuyoPersonalRouter = router({
  /**
   * ユーザープロファイルを取得
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, ctx.user.id))
      .limit(1);

    if (profile.length === 0) {
      return null;
    }

    const p = profile[0];
    return {
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      gender: p.gender,
      sukuyoMansion: p.sukuyoMansion,
      sukuyoDay: p.sukuyoDay,
      sukuyoMonth: p.sukuyoMonth,
      sukuyoYear: p.sukuyoYear,
      kuyoElement: p.kuyoElement,
      fireWaterBalance: p.fireWaterBalance,
      spiritualDistance: p.spiritualDistance,
      amatsuKanagiPattern: p.amatsuKanagiPattern,
      irohaCharacter: p.irohaCharacter,
      personalityCore: p.personalityCore
        ? JSON.parse(p.personalityCore)
        : null,
      personalityTraits: p.personalityTraits
        ? JSON.parse(p.personalityTraits)
        : null,
      communicationStyle: p.communicationStyle
        ? JSON.parse(p.communicationStyle)
        : null,
    };
  }),

  /**
   * 生年月日を登録してプロファイルを作成
   */
  createProfile: protectedProcedure
    .input(
      z.object({
        birthDate: z.string(), // ISO 8601 format (YYYY-MM-DD)
        birthTime: z.string().optional(), // HH:MM format
        gender: z.enum(["male", "female", "other"]).optional(),
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

      // 既存のプロファイルを確認
      const existingProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);

      if (existingProfile.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Profile already exists. Use updateProfile instead.",
        });
      }

      // 生年月日をパース
      const birthDate = new Date(input.birthDate);

      // ユーザー専用人格を生成
      const personality = await generatePersonalPersonality(
        ctx.user.id,
        birthDate
      );

      // プロファイルを作成
      await db.insert(userProfiles).values({
        userId: ctx.user.id,
        birthDate,
        birthTime: input.birthTime || null,
        gender: input.gender || null,
        sukuyoMansion: personality.sukuyoMansion,
        amatsuKanagiPattern: personality.amatsuKanagiPattern,
        irohaCharacter: personality.irohaCharacter,
        fireWaterBalance: personality.fireWaterBalance,
        spiritualDistance: personality.spiritualDistance,
        personalityCore: personality.personalityCore,
        personalityTraits: personality.personalityTraits,
        communicationStyle: personality.communicationStyle,
      });

      return {
        success: true,
        profile: {
          birthDate,
          birthTime: input.birthTime,
          gender: input.gender,
          sukuyoMansion: personality.sukuyoMansion,
          amatsuKanagiPattern: personality.amatsuKanagiPattern,
          irohaCharacter: personality.irohaCharacter,
          fireWaterBalance: personality.fireWaterBalance,
          spiritualDistance: personality.spiritualDistance,
          personalityCore: JSON.parse(personality.personalityCore),
          personalityTraits: JSON.parse(personality.personalityTraits),
          communicationStyle: JSON.parse(personality.communicationStyle),
        },
      };
    }),

  /**
   * プロファイルを更新
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        birthDate: z.string().optional(), // ISO 8601 format (YYYY-MM-DD)
        birthTime: z.string().optional(), // HH:MM format
        gender: z.enum(["male", "female", "other"]).optional(),
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

      // 既存のプロファイルを確認
      const existingProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);

      if (existingProfile.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Profile not found. Use createProfile instead.",
        });
      }

      // 生年月日が変更された場合は再計算
      let personality = null;
      if (input.birthDate) {
        const birthDate = new Date(input.birthDate);
        personality = await generatePersonalPersonality(ctx.user.id, birthDate);
      }

      // プロファイルを更新
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.birthDate && personality) {
        updateData.birthDate = new Date(input.birthDate);
        updateData.sukuyoMansion = personality.sukuyoMansion;
        updateData.amatsuKanagiPattern = personality.amatsuKanagiPattern;
        updateData.irohaCharacter = personality.irohaCharacter;
        updateData.fireWaterBalance = personality.fireWaterBalance;
        updateData.spiritualDistance = personality.spiritualDistance;
        updateData.personalityCore = personality.personalityCore;
        updateData.personalityTraits = personality.personalityTraits;
        updateData.communicationStyle = personality.communicationStyle;
      }

      if (input.birthTime !== undefined) {
        updateData.birthTime = input.birthTime || null;
      }

      if (input.gender !== undefined) {
        updateData.gender = input.gender || null;
      }

      await db
        .update(userProfiles)
        .set(updateData)
        .where(eq(userProfiles.userId, ctx.user.id));

      return {
        success: true,
      };
    }),

  /**
   * 宿曜27宿の一覧を取得
   */
  listMansions: protectedProcedure.query(async () => {
    return SUKUYO_MANSIONS.map((m) => ({
      id: m.id,
      name: m.name,
      reading: m.reading,
      element: m.element,
      direction: m.direction,
      rotation: m.rotation,
      phase: m.phase,
      personality: m.personality,
      communication: m.communication,
      strengths: m.strengths,
      weaknesses: m.weaknesses,
      amatsuKanagiPattern: m.amatsuKanagiPattern,
      irohaCharacter: m.irohaCharacter,
      spiritualDistance: m.spiritualDistance,
    }));
  }),

  /**
   * 宿曜27宿の詳細を取得
   */
  getMansionDetail: protectedProcedure
    .input(
      z.object({
        mansionId: z.number().min(1).max(27),
      })
    )
    .query(async ({ input }) => {
      const mansion = getSukuyoMansionById(input.mansionId);
      if (!mansion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mansion not found",
        });
      }

      return mansion;
    }),
});
