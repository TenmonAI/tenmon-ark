/**
 * User-Sync Evolution Store
 * 
 * User-Syncデータをデータベースに保存し、ユーザーごとに継続学習させる
 * 
 * 保存対象:
 * - 火水傾向
 * - 言語癖
 * - 文体の好み
 * - 話題パターン
 * - 思考深度
 * - テンポ
 * - 宿曜情報
 */

import { getDb } from '../../server/db';
import { longTermMemories } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SimpleUserProfile as UserProfile } from './userSync';

/**
 * User-Syncプロファイルをデータベースに保存
 */
export async function saveUserSyncProfile(
  userId: number,
  profile: UserProfile
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return;
  }

  try {
    // 既存のUser-Syncプロファイルを削除
    await db
      .delete(longTermMemories)
      .where(
        and(
          eq(longTermMemories.userId, userId),
          eq(longTermMemories.category, 'user_profile'),
          eq(longTermMemories.memoryType, 'user_profile')
        )
      );

    // 新しいUser-Syncプロファイルを保存
    await db.insert(longTermMemories).values({
      userId,
      content: JSON.stringify(profile),
      memoryType: 'user_profile',
      category: 'user_profile',
      metadata: JSON.stringify({
        savedAt: new Date().toISOString(),
        version: '1.0',
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[UserSyncStore] User-Sync profile saved for user ${userId}`);
  } catch (error) {
    console.error('[UserSyncStore] Failed to save User-Sync profile:', error);
    throw error;
  }
}

/**
 * User-Syncプロファイルをデータベースから取得
 */
export async function loadUserSyncProfile(
  userId: number
): Promise<UserProfile | null> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return null;
  }

  try {
    const result = await db
      .select()
      .from(longTermMemories)
      .where(
        and(
          eq(longTermMemories.userId, userId),
          eq(longTermMemories.category, 'user_profile'),
          eq(longTermMemories.memoryType, 'user_profile')
        )
      )
      .orderBy(desc(longTermMemories.createdAt))
      .limit(1);

    if (result.length === 0) {
      console.log(`[UserSyncStore] No User-Sync profile found for user ${userId}`);
      return null;
    }

    const profile = JSON.parse(result[0]!.content) as UserProfile;
    console.log(`[UserSyncStore] User-Sync profile loaded for user ${userId}`);
    return profile;
  } catch (error) {
    console.error('[UserSyncStore] Failed to load User-Sync profile:', error);
    return null;
  }
}

/**
 * User-Syncプロファイルを更新（部分更新）
 */
export async function updateUserSyncProfile(
  userId: number,
  updates: Partial<UserProfile>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return;
  }

  try {
    // 既存のプロファイルを取得
    const existingProfile = await loadUserSyncProfile(userId);
    if (!existingProfile) {
      console.warn(`[UserSyncStore] No existing profile found for user ${userId}, creating new one`);
      await saveUserSyncProfile(userId, updates as UserProfile);
      return;
    }

    // プロファイルを更新
    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
    };

    // 保存
    await saveUserSyncProfile(userId, updatedProfile);
    console.log(`[UserSyncStore] User-Sync profile updated for user ${userId}`);
  } catch (error) {
    console.error('[UserSyncStore] Failed to update User-Sync profile:', error);
    throw error;
  }
}

/**
 * 会話履歴からUser-Syncプロファイルを学習
 */
export async function learnFromConversation(
  userId: number,
  userMessage: string,
  assistantMessage: string,
  metadata?: {
    fireWaterBalance?: 'fire' | 'water' | 'balanced';
    thinkingDepth?: 'shallow' | 'medium' | 'deep';
    topicPatterns?: string[];
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return;
  }

  try {
    // 既存のプロファイルを取得
    let profile = await loadUserSyncProfile(userId);
    if (!profile) {
      // 初期プロファイルを作成
      profile = {
        fireWaterTendency: metadata?.fireWaterBalance || 'balanced',
        languageStyle: '丁寧',
        textStylePreference: '金（理性）',
        topicPatterns: metadata?.topicPatterns || [],
        thinkingDepth: metadata?.thinkingDepth || 'medium',
        tempo: 'moderate',
        shukuyoInfo: '角',
      };
    }

    // 学習: 火水傾向
    if (metadata?.fireWaterBalance) {
      profile.fireWaterTendency = metadata.fireWaterBalance;
    }

    // 学習: 思考深度
    if (metadata?.thinkingDepth) {
      profile.thinkingDepth = metadata.thinkingDepth;
    }

    // 学習: 話題パターン
    if (metadata?.topicPatterns && metadata.topicPatterns.length > 0) {
      const combined = profile.topicPatterns.concat(metadata.topicPatterns);
      profile.topicPatterns = Array.from(new Set(combined));
    }

    // 学習: 言語スタイル（メッセージの長さから推測）
    if (userMessage.length > 200) {
      profile.languageStyle = '詳細';
    } else if (userMessage.length < 50) {
      profile.languageStyle = '簡潔';
    }

    // 学習: テンポ（メッセージの頻度から推測、ここでは簡易実装）
    // 実際には会話履歴から計算する必要がある

    // プロファイルを保存
    await saveUserSyncProfile(userId, profile);
    console.log(`[UserSyncStore] Learned from conversation for user ${userId}`);
  } catch (error) {
    console.error('[UserSyncStore] Failed to learn from conversation:', error);
    throw error;
  }
}

/**
 * User-Syncプロファイルを削除
 */
export async function deleteUserSyncProfile(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return;
  }

  try {
    await db
      .delete(longTermMemories)
      .where(
        and(
          eq(longTermMemories.userId, userId),
          eq(longTermMemories.category, 'user_profile'),
          eq(longTermMemories.memoryType, 'user_profile')
        )
      );

    console.log(`[UserSyncStore] User-Sync profile deleted for user ${userId}`);
  } catch (error) {
    console.error('[UserSyncStore] Failed to delete User-Sync profile:', error);
    throw error;
  }
}

/**
 * 全ユーザーのUser-Syncプロファイル数を取得
 */
export async function getUserSyncProfileCount(): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn('[UserSyncStore] Database not available');
    return 0;
  }

  try {
    const result = await db
      .select()
      .from(longTermMemories)
      .where(
        and(
          eq(longTermMemories.category, 'user_profile'),
          eq(longTermMemories.memoryType, 'user_profile')
        )
      );

    return result.length;
  } catch (error) {
    console.error('[UserSyncStore] Failed to get User-Sync profile count:', error);
    return 0;
  }
}
