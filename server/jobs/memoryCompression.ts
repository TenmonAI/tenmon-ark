/**
 * Memory Compression Job (週1の記憶凝縮ジョブ)
 * 
 * MTMのsuper_fire/fire記憶を週1で凝縮・昇華し、LTMへ移行させる自動ジョブ
 * 
 * 実行頻度: 毎週日曜日 午前3時（UTC）
 * 
 * 処理内容:
 * 1. 全ユーザーのMTM記憶を取得
 * 2. super_fireとfireの記憶のみを凝縮対象とする
 * 3. カテゴリーごとにグループ化
 * 4. 3件以上の記憶があるカテゴリーをLTMに昇格
 * 5. 期限切れ記憶を削除（natural decay）
 */

import * as synapticMemory from "../synapticMemory";
import * as db from "../db";

export async function runMemoryCompressionJob(): Promise<void> {
  console.log("[Memory Compression Job] Starting...");

  try {
    // Get all users
    const allUsers = await getAllUsers();
    console.log(`[Memory Compression Job] Processing ${allUsers.length} users`);

    let totalCompressed = 0;
    let totalCleaned = 0;

    for (const user of allUsers) {
      try {
        // Compress memories (MTM → LTM)
        const compressedCount = await synapticMemory.compressMemories(user.id);
        totalCompressed += compressedCount;

        // Clean expired memories (natural decay)
        const cleanedCount = await synapticMemory.cleanExpiredMemories(user.id);
        totalCleaned += cleanedCount;

        console.log(
          `[Memory Compression Job] User ${user.id}: compressed ${compressedCount}, cleaned ${cleanedCount}`
        );
      } catch (error) {
        console.error(
          `[Memory Compression Job] Error processing user ${user.id}:`,
          error
        );
      }
    }

    console.log(
      `[Memory Compression Job] Completed: compressed ${totalCompressed}, cleaned ${totalCleaned}`
    );
  } catch (error) {
    console.error("[Memory Compression Job] Fatal error:", error);
    throw error;
  }
}

/**
 * Get all users from the database
 */
async function getAllUsers(): Promise<Array<{ id: number }>> {
  const database = await db.getDb();
  if (!database) {
    console.warn("[Memory Compression Job] Database not available");
    return [];
  }

  const { users } = await import("../../drizzle/schema");
  const result = await database.select({ id: users.id }).from(users);
  return result;
}

/**
 * Manual trigger for testing
 */
export async function triggerMemoryCompressionManually(): Promise<void> {
  console.log("[Memory Compression Job] Manual trigger");
  await runMemoryCompressionJob();
}
