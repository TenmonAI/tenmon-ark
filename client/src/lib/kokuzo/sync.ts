/**
 * ============================================================
 *  KOKUZO SYNC — 同期判断（将来用）
 * ============================================================
 * 
 * 将来の拡張用
 * 法則差分同期を実装予定
 * ============================================================
 */

import type { CompressedMemory } from './memory';

/**
 * 同期が必要かどうかを判断（将来実装）
 * 
 * @param localMemories ローカルの記憶データ
 * @param serverRules サーバーからの法則更新情報
 * @returns 同期が必要かどうか
 */
export async function shouldSync(
  localMemories: CompressedMemory[],
  serverRules?: unknown
): Promise<boolean> {
  // TODO: 法則差分同期のロジックを実装
  // 現時点では常に false（MVPでは同期なし）
  return false;
}

/**
 * 同期を実行（将来実装）
 * 
 * @param localMemories ローカルの記憶データ
 * @param serverRules サーバーからの法則更新情報
 */
export async function performSync(
  localMemories: CompressedMemory[],
  serverRules?: unknown
): Promise<void> {
  // TODO: 法則差分同期の実装
  // 現時点では未実装（MVPでは同期なし）
}

