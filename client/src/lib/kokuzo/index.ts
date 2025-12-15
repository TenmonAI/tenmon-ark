/**
 * ============================================================
 *  KOKUZO NODE — 虚空蔵ノード中枢
 * ============================================================
 * 
 * 端末側の分散記憶システム
 * 記憶は端末にのみ存在
 * 中央APIには抽象データのみを送信
 * ============================================================
 */

import { saveMemory, loadMemory, getMemorySummary, type CompressedMemory } from './memory';
import { compressMemory } from './compress';

/**
 * 体験を記憶に保存
 * 
 * @param text ユーザーの入力テキスト
 */
export async function storeExperience(text: string): Promise<void> {
  try {
    // 記憶を不可逆圧縮
    const compressed = compressMemory(text);
    
    // 端末に保存（中央サーバーには送信しない）
    await saveMemory(compressed);
  } catch (error) {
    console.warn('[Kokuzo Node] Failed to store experience:', error);
  }
}

/**
 * 記憶を想起
 * 
 * @returns 保存された記憶エントリの配列
 */
export async function recallMemory() {
  return await loadMemory();
}

/**
 * 記憶の要約を取得（中央API送信用）
 * 
 * @param limit 取得する記憶の最大数
 * @returns 抽象化された記憶データの配列
 */
export async function getMemorySummaryForAPI(limit: number = 10): Promise<CompressedMemory[]> {
  return await getMemorySummary(limit);
}

/**
 * 記憶をクリア（デバッグ用）
 */
export async function clearAllMemory(): Promise<void> {
  const { clearMemory } = await import('./memory');
  await clearMemory();
}

