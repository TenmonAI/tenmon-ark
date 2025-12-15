import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as chatDb from "./chatDb";
import { generateChatResponse, generateChatTitle } from "./chatAI";
import { analyzeEthics } from "../reiEthicFilterEngine";

export const chatRouter = router({
  /**
   * Create a new chat room
   */
  createRoom: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        language: z.string().default("ja"),
        projectId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // projectId が未指定の場合はデフォルトプロジェクトを取得または作成
      let projectId = input.projectId;
      if (!projectId) {
        const { getOrCreateDefaultProject } = await import("../routers/projectRouter");
        projectId = await getOrCreateDefaultProject(ctx.user.id);
      }
      
      const roomId = await chatDb.createChatRoom({
        userId: ctx.user.id,
        title: input.title || "New Chat",
        projectId: projectId || null,
        projectLocked: "auto", // 自動分類
      });

      return { roomId };
    }),

  /**
   * Get all chat rooms for the current user
   */
  listRooms: protectedProcedure
    .input(
      z.object({
        projectId: z.number().nullable().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return await chatDb.getUserChatRooms(ctx.user.id, input?.projectId);
    }),

  /**
   * Get a specific chat room
   */
  getRoom: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await chatDb.getChatRoom(input.roomId);
      
      // Verify ownership
      if (!room || room.userId !== ctx.user.id) {
        throw new Error("Room not found or access denied");
      }

      return room;
    }),

  /**
   * Get all messages in a chat room
   */
  getMessages: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const room = await chatDb.getChatRoom(input.roomId);
      if (!room || room.userId !== ctx.user.id) {
        throw new Error("Room not found or access denied");
      }

      return await chatDb.getChatMessages(input.roomId);
    }),

  /**
   * Send a message and get AI response
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        roomId: z.number().optional(),
        message: z.string().min(1),
        language: z.string().default("ja"),
        projectId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let roomId = input.roomId;

      // Create new room if not provided
      if (!roomId) {
        const title = await generateChatTitle(input.message, input.language);
        
        // projectId が未指定の場合は自動分類
        let finalProjectId = input.projectId;
        if (!finalProjectId) {
          const { autoClassifyProject } = await import("../project/autoClassifier");
          const { getRecentChatMessages } = await import("../chat/chatDb");
          
          // 会話履歴を取得（直近5件）
          const conversationHistory: string[] = [];
          if (input.roomId) {
            const recentMessages = await getRecentChatMessages(input.roomId, 5);
            conversationHistory.push(...recentMessages.map((m) => m.content));
          }
          
          const classification = await autoClassifyProject({
            text: input.message,
            files: [],
            conversationHistory,
            userId: ctx.user.id,
            conversationId: undefined,
            roomId: input.roomId,
          });
          
          finalProjectId = classification.projectId;
          
          // 分類結果を保存（GAP-E）
          const { isTemporaryProject } = await import("../project/reclassificationManager");
          const isTemporary = isTemporaryProject(classification.confidence) ? 1 : 0;
          
          roomId = await chatDb.createChatRoom({
            userId: ctx.user.id,
            title,
            projectId: finalProjectId || null,
            projectLocked: "auto", // 自動分類
            classificationConfidence: Math.round(classification.confidence * 100), // 0-100 に変換
            classificationLastUpdated: new Date(),
            isTemporaryProject: isTemporary,
          });
        } else {
          roomId = await chatDb.createChatRoom({
            userId: ctx.user.id,
            title,
            projectId: finalProjectId || null,
            projectLocked: "auto", // 自動分類
          });
        }
      } else {
        // Verify ownership
        const room = await chatDb.getChatRoom(roomId);
        if (!room || room.userId !== ctx.user.id) {
          throw new Error("Room not found or access denied");
        }
      }

      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.message);
      
      // 中和が必要な場合は中和後のテキストを使用
      const messageToSave = ethicAnalysis.needsNeutralization && ethicAnalysis.neutralizedText
        ? ethicAnalysis.neutralizedText
        : input.message;
      
      // Save user message
      await chatDb.addChatMessage({
        roomId,
        role: "user",
        content: messageToSave,
      });

      // Get conversation history
      const messages = await chatDb.getRecentChatMessages(roomId, 20);

      // Generate AI response
      const aiResponse = await generateChatResponse({
        userId: ctx.user.id,
        roomId,
        messages,
        language: input.language,
      });

      // Save AI response
      await chatDb.addChatMessage({
        roomId,
        role: "assistant",
        content: aiResponse,
      });

      return {
        roomId,
        message: aiResponse,
      };
    }),

  /**
   * Update chat room title
   */
  updateRoomTitle: protectedProcedure
    .input(
      z.object({
        roomId: z.number(),
        title: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const room = await chatDb.getChatRoom(input.roomId);
      if (!room || room.userId !== ctx.user.id) {
        throw new Error("Room not found or access denied");
      }

      await chatDb.updateChatRoomTitle(input.roomId, input.title);

      return { success: true };
    }),

  /**
   * Delete a chat room
   */
  deleteRoom: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const room = await chatDb.getChatRoom(input.roomId);
      if (!room || room.userId !== ctx.user.id) {
        throw new Error("Room not found or access denied");
      }

      await chatDb.deleteChatRoom(input.roomId);

      return { success: true };
    }),

  /**
   * Send a message and get AI response with streaming
   * Returns the full response after streaming completes
   */
  sendMessageStreaming: protectedProcedure
    .input(
      z.object({
        roomId: z.number().optional(),
        message: z.string().min(1),
        language: z.string().default("ja"),
        projectId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let roomId = input.roomId;

      // Create new room if not provided
      if (!roomId) {
        const title = await generateChatTitle(input.message, input.language);
        
        // projectId が未指定の場合はデフォルトプロジェクトを取得または作成
        let finalProjectId = input.projectId;
        if (!finalProjectId) {
          const { getOrCreateDefaultProject } = await import("../routers/projectRouter");
          finalProjectId = await getOrCreateDefaultProject(ctx.user.id);
        }
        
        roomId = await chatDb.createChatRoom({
          userId: ctx.user.id,
          title,
          projectId: finalProjectId || null,
          projectLocked: "auto", // 自動分類
        });
      } else {
        // Verify ownership
        const room = await chatDb.getChatRoom(roomId);
        if (!room || room.userId !== ctx.user.id) {
          throw new Error("Room not found or access denied");
        }
      }

      // 倫理フィルタ適用
      const ethicAnalysis = analyzeEthics(input.message);
      
      // 中和が必要な場合は中和後のテキストを使用
      const messageToSave = ethicAnalysis.needsNeutralization && ethicAnalysis.neutralizedText
        ? ethicAnalysis.neutralizedText
        : input.message;
      
      // Save user message
      await chatDb.addChatMessage({
        roomId,
        role: "user",
        content: messageToSave,
      });

      // Get conversation history
      const messages = await chatDb.getRecentChatMessages(roomId, 20);

      // Generate AI response with streaming
      const { generateChatResponseStream } = await import("./chatAI");
      let fullResponse = "";

      for await (const chunk of generateChatResponseStream({
        userId: ctx.user.id,
        roomId,
        messages,
        language: input.language,
      })) {
        fullResponse += chunk;
      }

      // Save AI response
      await chatDb.addChatMessage({
        roomId,
        role: "assistant",
        content: fullResponse,
      });

      return {
        roomId,
        message: fullResponse,
      };
    }),
});
