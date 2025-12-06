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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const roomId = await chatDb.createChatRoom({
        userId: ctx.user.id,
        title: input.title || "New Chat",
      });

      return { roomId };
    }),

  /**
   * Get all chat rooms for the current user
   */
  listRooms: protectedProcedure.query(async ({ ctx }) => {
    return await chatDb.getUserChatRooms(ctx.user.id);
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      let roomId = input.roomId;

      // Create new room if not provided
      if (!roomId) {
        const title = await generateChatTitle(input.message, input.language);
        roomId = await chatDb.createChatRoom({
          userId: ctx.user.id,
          title,
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      let roomId = input.roomId;

      // Create new room if not provided
      if (!roomId) {
        const title = await generateChatTitle(input.message, input.language);
        roomId = await chatDb.createChatRoom({
          userId: ctx.user.id,
          title,
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
