import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { chatRooms, chatMessages, InsertChatRoom, InsertChatMessage } from "../../drizzle/schema";

/**
 * Create a new chat room
 */
export async function createChatRoom(data: InsertChatRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatRooms).values(data);
  return result[0].insertId;
}

/**
 * Get all chat rooms for a user
 */
export async function getUserChatRooms(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.userId, userId))
    .orderBy(desc(chatRooms.updatedAt));
}

/**
 * Get a specific chat room
 */
export async function getChatRoom(roomId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update chat room title
 */
export async function updateChatRoomTitle(roomId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(chatRooms)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatRooms.id, roomId));
}

/**
 * Delete a chat room and all its messages
 */
export async function deleteChatRoom(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete messages first
  await db.delete(chatMessages).where(eq(chatMessages.roomId, roomId));
  
  // Delete room
  await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
}

/**
 * Add a message to a chat room
 */
export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(data);
  
  // Update room's updatedAt timestamp
  await db
    .update(chatRooms)
    .set({ updatedAt: new Date() })
    .where(eq(chatRooms.id, data.roomId));

  return result[0].insertId;
}

/**
 * Get all messages in a chat room
 */
export async function getChatMessages(roomId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(chatMessages.createdAt);
}

/**
 * Get recent messages for context (last N messages)
 */
export async function getRecentChatMessages(roomId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  // Reverse to get chronological order
  return messages.reverse();
}
