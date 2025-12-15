import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { uploadedFiles } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { bulkIngest } from "../kokuzo/ingest/bulkIngestEngine";
import { createKzFile } from "../kokuzo/db/schema/kzFile";
import { saveKzFile } from "../kokuzo/db/adapter";
import { createHash } from "crypto";

/**
 * File Upload Router
 * Handles file uploads, parsing, and memory integration
 */

// Helper function to determine file type from MIME type
function getFileType(mimeType: string): "pdf" | "word" | "excel" | "zip" | "image" | "video" | "audio" | "other" {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("word") || mimeType.includes("document")) return "word";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "excel";
  if (mimeType.includes("zip")) return "zip";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

// Helper function to generate random suffix for file keys
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const fileUploadRouter = router({
  /**
   * Upload a file to S3 and save metadata to database
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
        conversationId: z.number().optional(),
        projectId: z.number().nullable().optional(), // プロジェクトID（メタデータ）
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

      // Check file size limit (16MB for now)
      const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
      if (input.fileSize > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File size exceeds 16MB limit",
        });
      }

      // TODO: Check user plan and file upload limits
      // For now, allow all uploads

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.fileData, "base64");

      // Generate S3 key with random suffix to prevent enumeration
      const fileKey = `${ctx.user.id}-files/${input.fileName}-${randomSuffix()}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Determine file type
      const fileType = getFileType(input.mimeType);

      // projectId が未指定の場合は自動分類
      let finalProjectId = input.projectId;
      if (!finalProjectId) {
        const { autoClassifyProject } = await import("../project/autoClassifier");
        const { getRecentChatMessages } = await import("../chat/chatDb");
        
        // 会話履歴を取得（直近5件）
        const conversationHistory: string[] = [];
        if (input.conversationId) {
          // conversationId から roomId を取得する必要がある場合
          // 現時点では簡易的にファイル名のみで分類
        }
        
        const classification = await autoClassifyProject({
          text: input.fileName, // ファイル名をテキストとして使用
          files: [{
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileType,
          }],
          conversationHistory,
          userId: ctx.user.id,
          conversationId: input.conversationId,
          roomId: undefined,
        });
        
        finalProjectId = classification.projectId;
      }

      // Save metadata to database（projectIdをメタデータに付与）
      const metadata = finalProjectId ? JSON.stringify({ projectId: finalProjectId }) : null;
      
      const result = await db.insert(uploadedFiles).values({
        userId: ctx.user.id,
        conversationId: input.conversationId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileKey,
        fileUrl: url,
        fileType,
        metadata, // projectIdをメタデータに付与
        isProcessed: 0,
        isIntegratedToMemory: 0,
      });

      // Get the inserted file ID
      const insertedId = (result as any).insertId || 0;

      return {
        success: true,
        fileId: Number(insertedId),
        fileUrl: url,
        fileType,
      };
    }),

  /**
   * Get list of uploaded files for current user
   */
  listFiles: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const conditions = [eq(uploadedFiles.userId, ctx.user.id)];
      if (input.conversationId) {
        conditions.push(eq(uploadedFiles.conversationId, input.conversationId));
      }

      const files = await db
        .select()
        .from(uploadedFiles)
        .where(and(...conditions))
        .orderBy(desc(uploadedFiles.createdAt))
        .limit(input.limit);

      return files;
    }),

  /**
   * Get file details by ID
   */
  getFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const file = await db
        .select()
        .from(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.id, input.fileId),
            eq(uploadedFiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (file.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return file[0];
    }),

  /**
   * Delete a file
   */
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Check if file belongs to user
      const file = await db
        .select()
        .from(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.id, input.fileId),
            eq(uploadedFiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (file.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // TODO: Delete from S3
      // For now, just mark as deleted in database by removing the record
      await db
        .delete(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.id, input.fileId),
            eq(uploadedFiles.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Process a file (extract text, integrate to memory)
   */
  processFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get file details
      const file = await db
        .select()
        .from(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.id, input.fileId),
            eq(uploadedFiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (file.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const fileData = file[0];

      // TODO: Implement file parsing based on file type
      // For now, just mark as processed
      let extractedText = "";

      switch (fileData.fileType) {
        case "pdf":
          // TODO: Extract text from PDF
          extractedText = "PDF text extraction not yet implemented";
          break;
        case "word":
          // TODO: Extract text from Word
          extractedText = "Word text extraction not yet implemented";
          break;
        case "excel":
          // TODO: Extract data from Excel
          extractedText = "Excel data extraction not yet implemented";
          break;
        case "image":
          // TODO: OCR for images
          extractedText = "Image OCR not yet implemented";
          break;
        case "audio":
          // TODO: Speech-to-text for audio
          extractedText = "Audio transcription not yet implemented";
          break;
        case "video":
          // TODO: Extract subtitles or transcribe video
          extractedText = "Video transcription not yet implemented";
          break;
        default:
          extractedText = "File type not supported for text extraction";
      }

      // Update file record
      await db
        .update(uploadedFiles)
        .set({
          extractedText,
          isProcessed: 1,
          updatedAt: new Date(),
        })
        .where(eq(uploadedFiles.id, input.fileId));

      // Kokūzō ingest 接続（最重要）
      try {
        // Convert uploadedFile to KzFile
        const fileHash = createHash("sha256")
          .update(`${fileData.fileKey}-${fileData.fileSize}`)
          .digest("hex");

        // Map fileType to KzFile type
        const kzFileType = (() => {
          switch (fileData.fileType) {
            case "pdf":
              return "pdf" as const;
            case "image":
              return "image" as const;
            case "video":
              return "video" as const;
            case "audio":
              return "audio" as const;
            default:
              return "text" as const;
          }
        })();

        const kzFile = createKzFile({
          id: `file-${input.fileId}`,
          name: fileData.fileName,
          path: fileData.fileKey,
          type: kzFileType,
          size: fileData.fileSize,
          mimeType: fileData.mimeType,
          hash: fileHash,
        });

        // Save KzFile to Kokūzō
        await saveKzFile(kzFile as any);

        // Ingest file to Kokūzō (SemanticUnit, FractalSeed)
        // metadataからprojectIdを取得
        let projectId: number | null = null;
        if (fileData.metadata) {
          try {
            const metadata = typeof fileData.metadata === 'string' ? JSON.parse(fileData.metadata) : fileData.metadata;
            projectId = metadata.projectId || null;
          } catch (e) {
            // パースエラーは無視
          }
        }
        
        const ingestResult = await bulkIngest([kzFile], {
          enableFractalSeed: true,
          enableReishoSignature: true,
          conversationId: fileData.conversationId || undefined,
          projectId: projectId, // プロジェクトIDをメタデータとして付与
        });

        // Update file record with integration status
        await db
          .update(uploadedFiles)
          .set({
            isIntegratedToMemory: 1,
            updatedAt: new Date(),
          })
          .where(eq(uploadedFiles.id, input.fileId));

          return {
            success: true,
            extractedText,
            ingestResult: ingestResult.success ? {
              semanticUnits: ingestResult.result?.semanticUnits || 0,
              fractalSeeds: ingestResult.result?.fractalSeeds || 0,
            } : {
              semanticUnits: 0,
              fractalSeeds: 0,
              error: ingestResult.error,
            },
          };
      } catch (error) {
        console.error("[FileUpload] Kokūzō ingest error:", error);
        // Ingest失敗時も処理済みとしてマーク（後で再試行可能）
        await db
          .update(uploadedFiles)
          .set({
            isProcessed: 1,
            updatedAt: new Date(),
          })
          .where(eq(uploadedFiles.id, input.fileId));

        return {
          success: true,
          extractedText,
          ingestError: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Get upload statistics for current user
   */
  getUploadStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const files = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.userId, ctx.user.id));

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const filesByType = files.reduce((acc, file) => {
      acc[file.fileType] = (acc[file.fileType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles,
      totalSize,
      filesByType,
    };
  }),
});
