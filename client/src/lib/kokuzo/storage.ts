/**
 * Kokūzō Storage Interface
 * 記憶保存の抽象インターフェース
 * 
 * localStorage / IndexedDB の実装を切り替え可能にする
 */

import type { CompressedMemory } from './memory';

export interface MemoryEntry {
  data: CompressedMemory;
  ts: number;
}

export interface KokuzoStorage {
  /**
   * 記憶を保存
   */
  save(event: MemoryEntry): Promise<void>;

  /**
   * 記憶を読み込み
   */
  load(): Promise<MemoryEntry[]>;

  /**
   * 記憶をクリア
   */
  clear(): Promise<void>;
}

