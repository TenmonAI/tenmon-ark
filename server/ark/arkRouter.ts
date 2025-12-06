/**
 * TENMON-ARK API Router
 * 
 * 動画制作OS V1のAPIエンドポイント
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { videoProjects, videoFiles, transcriptions, kotodamaAnalysis, editTasks, processingQueue } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { 
  createVideoProject, 
  uploadVideoFile, 
  transcribeVideo, 
  refineTranscription,
  enqueueTask 
} from "./inputService";
import { analyzeKotodama } from "./kotodamaEngine";
import { createAutoCutTask, createAutoSubtitleTask, generateSRT } from "./editEngine";

export const arkRouter = router({
  /**
   * 動画プロジェクト一覧を取得
   */
  listProjects: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const projects = await db.select()
      .from(videoProjects)
      .where(eq(videoProjects.userId, ctx.user.id))
      .orderBy(desc(videoProjects.createdAt));

    return projects;
  }),

  /**
   * 動画プロジェクトを作成
   */
  createProject: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      sourceType: z.enum(["upload", "youtube", "vimeo"]),
      sourceUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const projectId = await createVideoProject({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
      });

      return { projectId };
    }),

  /**
   * 動画ファイルをアップロード
   */
  uploadVideo: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      fileData: z.string(), // Base64 encoded
      mimeType: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Base64デコード
      const fileBuffer = Buffer.from(input.fileData, "base64");

      const { fileId, url } = await uploadVideoFile({
        projectId: input.projectId,
        fileBuffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });

      // 文字起こしタスクをキューに追加
      await enqueueTask({
        projectId: input.projectId,
        queueType: "transcription",
        priority: 8,
      });

      return { fileId, url };
    }),

  /**
   * 文字起こしを実行
   */
  transcribe: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      audioUrl: z.string(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { transcriptionId, text, segments } = await transcribeVideo({
        projectId: input.projectId,
        audioUrl: input.audioUrl,
        language: input.language,
      });

      // 言灵整形
      await refineTranscription({
        transcriptionId,
        rawText: text,
      });

      // 言灵解析タスクをキューに追加
      await enqueueTask({
        projectId: input.projectId,
        queueType: "analysis",
        priority: 7,
      });

      return { transcriptionId, text, segments };
    }),

  /**
   * 言灵解析を実行
   */
  analyze: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      transcriptionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 文字起こしデータを取得
      const [transcription] = await db.select()
        .from(transcriptions)
        .where(eq(transcriptions.id, input.transcriptionId))
        .limit(1);

      if (!transcription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
      }

      const segments = JSON.parse(transcription.segments);

      // 言灵解析を実行
      const analysis = await analyzeKotodama({
        projectId: input.projectId,
        transcriptionId: input.transcriptionId,
        text: transcription.refinedText || transcription.rawText,
        segments,
      });

      // 編集タスクをキューに追加
      await enqueueTask({
        projectId: input.projectId,
        queueType: "edit",
        priority: 6,
      });

      return analysis;
    }),

  /**
   * 自動編集を実行
   */
  autoEdit: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      analysisId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 解析データを取得
      const [analysis] = await db.select()
        .from(kotodamaAnalysis)
        .where(eq(kotodamaAnalysis.id, input.analysisId))
        .limit(1);

      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // 文字起こしデータを取得
      const [transcription] = await db.select()
        .from(transcriptions)
        .where(eq(transcriptions.id, analysis.transcriptionId))
        .limit(1);

      if (!transcription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
      }

      const segments = JSON.parse(transcription.segments);
      const breathPoints = JSON.parse(analysis.breathPoints || "[]");

      // 自動カット
      const cutResult = await createAutoCutTask({
        projectId: input.projectId,
        analysisId: input.analysisId,
        segments,
        breathPoints,
      });

      // 自動字幕
      const subtitleResult = await createAutoSubtitleTask({
        projectId: input.projectId,
        analysisId: input.analysisId,
        segments,
        breathPoints,
        refinedText: transcription.refinedText || undefined,
      });

      return {
        cutPoints: cutResult.cutPoints,
        subtitles: subtitleResult.subtitles,
      };
    }),

  /**
   * プロジェクトの詳細を取得
   */
  getProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // プロジェクトを取得
      const [project] = await db.select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // 関連データを取得
      const files = await db.select()
        .from(videoFiles)
        .where(eq(videoFiles.projectId, input.projectId));

      const [transcription] = await db.select()
        .from(transcriptions)
        .where(eq(transcriptions.projectId, input.projectId))
        .limit(1);

      const [analysis] = await db.select()
        .from(kotodamaAnalysis)
        .where(eq(kotodamaAnalysis.projectId, input.projectId))
        .limit(1);

      const tasks = await db.select()
        .from(editTasks)
        .where(eq(editTasks.projectId, input.projectId));

      return {
        project,
        files,
        transcription,
        analysis,
        tasks,
      };
    }),

  /**
   * 編集結果を取得
   */
  getEditResult: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // プロジェクトを取得
      const [project] = await db.select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // 編集タスクを取得
      const tasks = await db.select()
        .from(editTasks)
        .where(eq(editTasks.projectId, input.projectId))
        .orderBy(desc(editTasks.createdAt));

      if (tasks.length === 0) {
        return null;
      }

      // 最新の編集タスクから結果を取得
      const latestTask = tasks[0];

      return {
        id: latestTask.id,
        projectId: latestTask.projectId,
        taskType: latestTask.taskType,
        status: latestTask.status,
        cutPointData: latestTask.parameters, // カット点データ
        subtitleData: latestTask.result, // 字幕データ
        analysisData: latestTask.parameters, // 解析データ
        createdAt: latestTask.createdAt,
        completedAt: latestTask.updatedAt,
      };
    }),

  /**
   * 処理キューの状況を取得
   */
  getQueueStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const queue = await db.select()
      .from(processingQueue)
      .orderBy(desc(processingQueue.priority), desc(processingQueue.createdAt))
      .limit(50);

    return queue;
  }),

  /**
   * SRT字幕ファイルをダウンロード
   */
  downloadSRT: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // プロジェクトを取得
      const [project] = await db.select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // 字幕データを取得
      const [analysis] = await db.select()
        .from(kotodamaAnalysis)
        .where(eq(kotodamaAnalysis.projectId, input.projectId))
        .limit(1);

      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // 文字起こしデータを取得
      const [transcription] = await db.select()
        .from(transcriptions)
        .where(eq(transcriptions.id, analysis.transcriptionId))
        .limit(1);

      if (!transcription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
      }

      const segments = JSON.parse(transcription.segments);

      // SRT生成
      const srt = generateSRT(segments);

      return { srt, fileName: `${project.title}.srt` };
    }),

  /**
   * プロジェクトを削除
   */
  deleteProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // プロジェクトを取得
      const [project] = await db.select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // 関連データを削除（外部キー制約により自動削除されるが、明示的に削除）
      await db.delete(editTasks).where(eq(editTasks.projectId, input.projectId));
      await db.delete(kotodamaAnalysis).where(eq(kotodamaAnalysis.projectId, input.projectId));
      await db.delete(transcriptions).where(eq(transcriptions.projectId, input.projectId));
      await db.delete(videoFiles).where(eq(videoFiles.projectId, input.projectId));
      await db.delete(processingQueue).where(eq(processingQueue.projectId, input.projectId));

      // プロジェクトを削除
      await db.delete(videoProjects).where(eq(videoProjects.id, input.projectId));

      return { success: true };
    }),

  /**
   * プロジェクトステータスを更新
   */
  updateProjectStatus: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      status: z.enum(["pending", "processing", "completed", "failed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // プロジェクトを取得
      const [project] = await db.select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.projectId))
        .limit(1);

      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // ステータスを更新
      await db.update(videoProjects)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(videoProjects.id, input.projectId));

      return { success: true };
    }),
});
