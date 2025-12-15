/**
 * ============================================================
 *  PROJECT ROUTER — プロジェクト管理
 * ============================================================
 * 
 * プロジェクト単位で会話を整理（記憶は分断しない）
 * ============================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projects, conversations, chatRooms } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * デフォルトプロジェクトを取得または作成
 */
async function getOrCreateDefaultProject(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  // 既存のデフォルトプロジェクトを検索
  const existingDefault = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.name, "デフォルト")
      )
    )
    .limit(1);

  if (existingDefault.length > 0) {
    return existingDefault[0].id;
  }

  // デフォルトプロジェクトを作成
  const [newProject] = await db
    .insert(projects)
    .values({
      userId,
      name: "デフォルト",
    });

  return newProject.insertId;
}

export const projectRouter = router({
  /**
   * プロジェクト一覧取得
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.updatedAt));

    return userProjects;
  }),

  /**
   * プロジェクト作成
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [newProject] = await db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          name: input.name,
        });

      return { projectId: newProject.insertId };
    }),

  /**
   * プロジェクト更新
   */
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(200),
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

      // 所有権確認
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (project.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await db
        .update(projects)
        .set({ name: input.name })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  /**
   * プロジェクト名変更（update のエイリアス）
   */
  renameProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // update と同じロジックを使用
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 所有権確認
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (project.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await db
        .update(projects)
        .set({ name: input.name })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  /**
   * プロジェクト削除（論理削除のみ、Event/Seed は残す）
   */
  delete: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 所有権確認
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (project.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // プロジェクトに紐づく会話のprojectIdをnullに設定（会話は削除しない、Event/Seed は残す）
      await db
        .update(conversations)
        .set({ projectId: null })
        .where(eq(conversations.projectId, input.projectId));

      await db
        .update(chatRooms)
        .set({ projectId: null })
        .where(eq(chatRooms.projectId, input.projectId));

      // プロジェクトを削除
      await db.delete(projects).where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  /**
   * プロジェクトに紐づく会話一覧取得
   */
  getConversations: protectedProcedure
    .input(z.object({ projectId: z.number().nullable() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const conditions = [eq(conversations.userId, ctx.user.id)];
      
      if (input.projectId === null) {
        // projectIdがnullの会話（プロジェクト未設定）
        conditions.push(eq(conversations.projectId, null));
      } else {
        conditions.push(eq(conversations.projectId, input.projectId));
      }

      const projectConversations = await db
        .select()
        .from(conversations)
        .where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt));

      return projectConversations;
    }),

  /**
   * デフォルトプロジェクトを取得または作成
   */
  getOrCreateDefault: protectedProcedure.query(async ({ ctx }) => {
    const projectId = await getOrCreateDefaultProject(ctx.user.id);
    return { projectId };
  }),

  /**
   * チャットルームのプロジェクトを手動で変更（固定）
   */
  lockProjectForRoom: protectedProcedure
    .input(
      z.object({
        roomId: z.number(),
        projectId: z.number().nullable(),
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

      // 所有権確認
      const room = await db
        .select()
        .from(chatRooms)
        .where(
          and(
            eq(chatRooms.id, input.roomId),
            eq(chatRooms.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (room.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      // プロジェクトを手動固定（projectLocked = "manual"）
      await db
        .update(chatRooms)
        .set({
          projectId: input.projectId,
          projectLocked: "manual",
        })
        .where(eq(chatRooms.id, input.roomId));

      return { success: true };
    }),
});

// getOrCreateDefaultProject をエクスポート（他のルーターから使用可能）
export { getOrCreateDefaultProject };
