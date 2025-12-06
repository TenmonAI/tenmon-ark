/**
 * LP-QA Memory Sync Engine
 * 
 * 🌕 MEMORY UNITY vΦ Phase 7 実装
 * 
 * LP-QA V4 での会話を Synaptic Memory（STM/MTM/LTM）に保存し、
 * ChatOS での会話と同期する機能を提供します。
 * 
 * 仕様:
 * 1. LP-QA での会話が ChatOS の userMemoryContext に保存される
 * 2. ChatOS での会話も LP へ同期
 * 3. Pro/Founder のみ無制限記憶
 * 4. Free/Basic は制限
 * 5. Universal Memory Router vΦ 前提の設計
 */

import { getDb } from '../db';
import { 
  ImportanceLevel, 
  MemoryCategory,
  MemoryContext
} from '../synapticMemory';
import {
  getUniversalMemoryContext,
  saveUniversalMemory,
  mapConversationId,
} from './universalMemoryRouter';
import { eq } from 'drizzle-orm';
import { users, subscriptions } from '../../drizzle/schema';

/**
 * ユーザーのプラン情報を取得
 */
async function getUserPlan(userId: number): Promise<'free' | 'basic' | 'pro' | 'founder'> {
  const db = await getDb();
  if (!db) return 'free';

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) return 'free';

  // Founder は Pro として扱う（無制限記憶）
  if (subscription.planName === 'pro') return 'founder';
  
  return subscription.planName as 'free' | 'basic' | 'pro';
}

/**
 * プランに応じた記憶制限を取得
 */
function getMemoryLimitByPlan(plan: 'free' | 'basic' | 'pro' | 'founder'): {
  stmLimit: number;
  mtmLimit: number;
  ltmLimit: number;
  canSaveLpQa: boolean;
} {
  switch (plan) {
    case 'founder':
    case 'pro':
      return {
        stmLimit: -1, // 無制限
        mtmLimit: -1, // 無制限
        ltmLimit: -1, // 無制限
        canSaveLpQa: true,
      };
    case 'basic':
      return {
        stmLimit: 50, // 50件
        mtmLimit: 20, // 20件
        ltmLimit: 5, // 5件
        canSaveLpQa: true,
      };
    case 'free':
    default:
      return {
        stmLimit: 10, // 10件
        mtmLimit: 5, // 5件
        ltmLimit: 0, // LTMなし
        canSaveLpQa: false, // LP-QA記憶保存不可
      };
  }
}

/**
 * LP-QA での会話を Synaptic Memory に保存
 * 
 * @param userId ユーザーID（0の場合は匿名ユーザー）
 * @param question ユーザーの質問
 * @param response TENMON-ARK の応答
 * @param importance 重要度（デフォルト: neutral）
 * @param category カテゴリー（デフォルト: conversation_recent）
 */
export async function saveLpQaToMemory(
  userId: number,
  question: string,
  response: string,
  importance: ImportanceLevel = 'neutral',
  category: MemoryCategory = 'conversation_recent'
): Promise<{ success: boolean; reason?: string }> {
  // 匿名ユーザー（userId=0）の場合は保存しない
  if (userId === 0) {
    return { success: false, reason: 'Anonymous user' };
  }

  // ユーザープランを取得
  const plan = await getUserPlan(userId);
  const limits = getMemoryLimitByPlan(plan);

  // プランに応じた保存可否チェック
  if (!limits.canSaveLpQa) {
    return { success: false, reason: 'Plan does not support LP-QA memory' };
  }

  // 会話内容を保存
  const conversationContent = `[LP-QA] User: ${question}\nTENMON-ARK: ${response}`;

  try {
    const success = await saveUniversalMemory(userId, 'lp-qa', conversationContent, importance, category);
    return { success, reason: success ? undefined : 'Failed to save memory' };
  } catch (error) {
    console.error('[LP-QA Memory Sync] Failed to save memory:', error);
    return { success: false, reason: 'Failed to save memory' };
  }
}

/**
 * LP-QA 用のメモリコンテキストを取得
 * 
 * ChatOS の Synaptic Memory から関連する記憶を取得し、
 * LP-QA の応答生成に使用します。
 * 
 * @param userId ユーザーID（0の場合は匿名ユーザー）
 * @param conversationHistory 会話履歴
 * @returns メモリコンテキスト
 */
export async function getLpQaMemoryContext(
  userId: number,
  conversationHistory: string[] = []
): Promise<MemoryContext> {
  // 匿名ユーザー（userId=0）の場合は空のコンテキストを返す
  if (userId === 0) {
    return {
      ltm: [],
      mtm: [],
      stm: conversationHistory,
    };
  }

  // ユーザープランを取得
  const plan = await getUserPlan(userId);
  const limits = getMemoryLimitByPlan(plan);

  // プランに応じた記憶取得制限
  if (!limits.canSaveLpQa) {
    return {
      ltm: [],
      mtm: [],
      stm: conversationHistory,
    };
  }

  try {
    // Universal Memory Router から記憶を取得
    const conversationId = mapConversationId(userId, 'lp-qa', 0);
    const universalContext = await getUniversalMemoryContext(userId, 'lp-qa', conversationId);
    const memoryContext = universalContext.memoryContext;

    // プランに応じた制限を適用
    return {
      ltm: limits.ltmLimit === -1 ? memoryContext.ltm : memoryContext.ltm.slice(0, limits.ltmLimit),
      mtm: limits.mtmLimit === -1 ? memoryContext.mtm : memoryContext.mtm.slice(0, limits.mtmLimit),
      stm: [...conversationHistory, ...memoryContext.stm],
    };
  } catch (error) {
    console.error('[LP-QA Memory Sync] Failed to get memory context:', error);
    return {
      ltm: [],
      mtm: [],
      stm: conversationHistory,
    };
  }
}

/**
 * LP-QA 記憶統計情報を取得
 * 
 * @param userId ユーザーID
 * @returns 統計情報
 */
export async function getLpQaMemoryStats(userId: number): Promise<{
  plan: string;
  stmCount: number;
  mtmCount: number;
  ltmCount: number;
  stmLimit: number;
  mtmLimit: number;
  ltmLimit: number;
  canSaveLpQa: boolean;
}> {
  if (userId === 0) {
    return {
      plan: 'anonymous',
      stmCount: 0,
      mtmCount: 0,
      ltmCount: 0,
      stmLimit: 0,
      mtmLimit: 0,
      ltmLimit: 0,
      canSaveLpQa: false,
    };
  }

  const plan = await getUserPlan(userId);
  const limits = getMemoryLimitByPlan(plan);

  try {
    const conversationId = mapConversationId(userId, 'lp-qa', 0);
    const universalContext = await getUniversalMemoryContext(userId, 'lp-qa', conversationId);
    const memoryContext = universalContext.memoryContext;

    return {
      plan,
      stmCount: memoryContext.stm.length,
      mtmCount: memoryContext.mtm.length,
      ltmCount: memoryContext.ltm.length,
      stmLimit: limits.stmLimit,
      mtmLimit: limits.mtmLimit,
      ltmLimit: limits.ltmLimit,
      canSaveLpQa: limits.canSaveLpQa,
    };
  } catch (error) {
    console.error('[LP-QA Memory Sync] Failed to get memory stats:', error);
    return {
      plan,
      stmCount: 0,
      mtmCount: 0,
      ltmCount: 0,
      stmLimit: limits.stmLimit,
      mtmLimit: limits.mtmLimit,
      ltmLimit: limits.ltmLimit,
      canSaveLpQa: limits.canSaveLpQa,
    };
  }
}
