import { and, desc, eq } from "drizzle-orm";
import {
  conversations,
  developerKnowledge,
  developerUsers,
  InsertConversation,
  InsertDeveloperKnowledge,
  InsertDeveloperUser,
  InsertKnowledgeEntry,
  InsertLongTermMemory,
  InsertMediumTermMemory,
  InsertMessage,
  InsertPlan,
  InsertSubscription,
  InsertUser,
  katakamuna,
  knowledgeEntries,
  longTermMemories,
  mediumTermMemories,
  messages,
  plans,
  subscriptions,
  sukuyoSecrets,
  tenshinKinokiData,
  tscalpPatterns,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { db } from "./dbPool";

// コネクションプールを使用（既存コード互換性維持）
export async function getDb() {
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========================================
// PUBLIC LAYER QUERIES
// ========================================

// Plans
export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans);
}

export async function getPlanByName(name: "free" | "basic" | "pro" | "founder") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.name, name)).limit(1);
  return result[0];
}

// Subscriptions
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0];
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data);
}

export async function updateSubscription(userId: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(data).where(eq(subscriptions.userId, userId));
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result[0];
}

// Conversations & Messages
export async function getUserConversations(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.lastMessageAt)).limit(limit);
}

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}

export async function getConversationMessages(conversationId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt).limit(limit);
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
}

export async function deleteConversation(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // メッセージを先に削除
  await db.delete(messages).where(eq(messages.conversationId, conversationId));
  
  // 会話を削除
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

export async function updateConversationLastMessage(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

// Long-term Memory
export async function getUserLongTermMemories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(longTermMemories).where(eq(longTermMemories.userId, userId));
}

export async function createLongTermMemory(data: InsertLongTermMemory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(longTermMemories).values(data);
}

// Medium-term Memory
export async function getUserMediumTermMemories(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediumTermMemories).where(eq(mediumTermMemories.userId, userId)).orderBy(desc(mediumTermMemories.createdAt)).limit(limit);
}

export async function createMediumTermMemory(data: InsertMediumTermMemory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(mediumTermMemories).values(data);
}

// Knowledge Base
export async function searchKnowledgeBase(query: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  // Simple text search for now, can be enhanced with vector search later
  return db.select().from(knowledgeEntries).limit(limit);
}

export async function createKnowledgeEntry(data: InsertKnowledgeEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(knowledgeEntries).values(data);
}

// ========================================
// DEVELOPER LAYER QUERIES (完全分離)
// ========================================

export async function getDeveloperUserByApiKey(apiKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(developerUsers).where(eq(developerUsers.apiKey, apiKey)).limit(1);
  return result[0];
}

export async function createDeveloperUser(data: InsertDeveloperUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(developerUsers).values(data);
}

export async function getTenshinKinokiStructure(structureId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenshinKinokiData).where(eq(tenshinKinokiData.structureId, structureId)).limit(1);
  return result[0];
}

export async function getAllTenshinKinokiStructures() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenshinKinokiData).orderBy(tenshinKinokiData.structureId);
}

export async function getKatakamuna(utaNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(katakamuna).where(eq(katakamuna.utaNumber, utaNumber)).limit(1);
  return result[0];
}

export async function getSukuyoSecret(nakshatra: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sukuyoSecrets).where(eq(sukuyoSecrets.nakshatra, nakshatra)).limit(1);
  return result[0];
}

export async function getTscalpPatterns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tscalpPatterns).orderBy(desc(tscalpPatterns.updatedAt));
}

export async function searchDeveloperKnowledge(query: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(developerKnowledge).limit(limit);
}

export async function createDeveloperKnowledge(data: InsertDeveloperKnowledge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(developerKnowledge).values(data);
}


// ========================================
// SITE INFO MEMORY FUNCTIONS
// ========================================

/**
 * Get site info value by key
 */
export async function getSiteInfo(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get site info: database not available");
    return null;
  }

  try {
    const { siteInfo } = await import("../drizzle/schema");
    const result = await db.select().from(siteInfo).where(eq(siteInfo.key, key)).limit(1);
    return result.length > 0 ? result[0].value : null;
  } catch (error) {
    console.error("[Database] Failed to get site info:", error);
    return null;
  }
}

/**
 * Upsert site info
 */
export async function upsertSiteInfo(data: {
  key: string;
  value: string;
  description?: string;
  updatedBy?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert site info: database not available");
    return;
  }

  try {
    const { siteInfo } = await import("../drizzle/schema");
    await db
      .insert(siteInfo)
      .values({
        key: data.key,
        value: data.value,
        description: data.description,
        updatedBy: data.updatedBy,
      })
      .onDuplicateKeyUpdate({
        set: {
          value: data.value,
          description: data.description,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert site info:", error);
    throw error;
  }
}

/**
 * Get all site info
 */
export async function getAllSiteInfo(): Promise<Array<{ key: string; value: string; description: string | null }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all site info: database not available");
    return [];
  }

  try {
    const { siteInfo } = await import("../drizzle/schema");
    return await db.select().from(siteInfo);
  } catch (error) {
    console.error("[Database] Failed to get all site info:", error);
    return [];
  }
}

// ========================================
// CUSTOM ARK QUERIES
// ========================================

/**
 * Create a new Custom Ark
 */
export async function createCustomArk(data: {
  userId: number;
  name: string;
  description?: string;
  systemPrompt: string;
  knowledgeBase?: string;
  isPublic?: boolean;
  shareUrl?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const result = await db.insert(customArks).values({
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      systemPrompt: data.systemPrompt,
      knowledgeBase: data.knowledgeBase || null,
      isPublic: data.isPublic ? 1 : 0,
      shareUrl: data.shareUrl || null,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to create custom ark:", error);
    throw error;
  }
}

/**
 * Get user's Custom Arks
 */
export async function getUserCustomArks(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return await db.select().from(customArks).where(eq(customArks.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get user custom arks:", error);
    return [];
  }
}

/**
 * Get Custom Ark by ID
 */
export async function getCustomArkById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.select().from(customArks).where(eq(customArks.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get custom ark:", error);
    return undefined;
  }
}

/**
 * Delete Custom Ark
 */
/**
 * Update Custom Ark
 */
export async function updateCustomArk(id: number, data: {
  name?: string;
  description?: string;
  systemPrompt?: string;
  knowledgeBase?: string;
  isPublic?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.knowledgeBase !== undefined) updateData.knowledgeBase = data.knowledgeBase;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic ? 1 : 0;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(customArks).set(updateData).where(eq(customArks.id, id));
    }
  } catch (error) {
    console.error("[Database] Failed to update custom ark:", error);
    throw error;
  }
}

/**
 * Get public Custom Arks
 */
export async function getPublicCustomArks() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return await db.select().from(customArks).where(eq(customArks.isPublic, 1));
  } catch (error) {
    console.error("[Database] Failed to get public custom arks:", error);
    return [];
  }
}

export async function deleteCustomArk(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { customArks } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.delete(customArks).where(and(eq(customArks.id, id), eq(customArks.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to delete custom ark:", error);
    throw error;
  }
}

// ========================================
// FOUNDER FEEDBACK QUERIES
// ========================================

/**
 * Create Founder Feedback
 */
export async function createFounderFeedback(data: {
  userId: number;
  category: "feature_request" | "bug_report" | "improvement";
  title: string;
  message: string;
  priority?: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { founderFeedback } = await import("../drizzle/schema");
    const result = await db.insert(founderFeedback).values({
      userId: data.userId,
      category: data.category,
      title: data.title,
      message: data.message,
      priority: data.priority || 3,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to create founder feedback:", error);
    throw error;
  }
}

/**
 * Get user's Founder Feedback
 */
export async function getUserFounderFeedback(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const { founderFeedback } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return await db.select().from(founderFeedback).where(eq(founderFeedback.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get user founder feedback:", error);
    return [];
  }
}

/**
 * Get all Founder Feedback (Admin only)
 */
export async function getAllFounderFeedback() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const { founderFeedback } = await import("../drizzle/schema");
    return await db.select().from(founderFeedback);
  } catch (error) {
    console.error("[Database] Failed to get all founder feedback:", error);
    return [];
  }
}

/**
 * Get Founder Feedback by ID
 */
export async function getFounderFeedbackById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  try {
    const { founderFeedback } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.select().from(founderFeedback).where(eq(founderFeedback.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get founder feedback by id:", error);
    return undefined;
  }
}

/**
 * Update Founder Feedback Status
 */
export async function updateFounderFeedbackStatus(
  id: number,
  status: "pending" | "approved" | "implemented" | "rejected",
  adminResponse?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { founderFeedback } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    const updateData: any = { status };
    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse;
    }
    
    await db.update(founderFeedback).set(updateData).where(eq(founderFeedback.id, id));
  } catch (error) {
    console.error("[Database] Failed to update founder feedback status:", error);
    throw error;
  }
}
