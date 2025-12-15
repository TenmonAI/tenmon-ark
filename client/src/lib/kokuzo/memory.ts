/**
 * ============================================================
 *  KOKUZO MEMORY — 端末記憶保存（ラッパー）
 * ============================================================
 * 
 * 記憶は端末にのみ存在
 * 中央サーバーには送信しない
 * 
 * IndexedDB移行対応（API互換維持）
 * ============================================================
 */

import type { KokuzoStorage, MemoryEntry } from './storage';
import { IndexedDbStorage } from './indexedDbStorage';

export interface CompressedMemory {
  keywords: string[];
  intent: string;
  weight: number;
}

// ストレージ実装を選択（IndexedDB優先、フォールバックはlocalStorage）
let storage: KokuzoStorage | null = null;

async function getStorage(): Promise<KokuzoStorage> {
  if (storage) {
    return storage;
  }

  // IndexedDBが利用可能かチェック
  if (typeof indexedDB !== 'undefined') {
    try {
      storage = new IndexedDbStorage();
      // テスト接続
      await storage.load();
      return storage;
    } catch (error) {
      console.warn('[Kokuzo Memory] IndexedDB not available, falling back to localStorage:', error);
    }
  }

  // フォールバック: localStorage
  storage = new LocalStorageStorage();
  return storage;
}

/**
 * localStorage実装（フォールバック）
 */
class LocalStorageStorage implements KokuzoStorage {
  private DB_KEY = 'TENMON_KOKUZO_MEMORY';

  async save(event: MemoryEntry): Promise<void> {
    try {
      const existing = JSON.parse(localStorage.getItem(this.DB_KEY) || '[]') as MemoryEntry[];
      existing.push(event);
      localStorage.setItem(this.DB_KEY, JSON.stringify(existing));
    } catch (error) {
      console.warn('[Kokuzo Memory] Failed to save memory:', error);
    }
  }

  async load(): Promise<MemoryEntry[]> {
    try {
      return JSON.parse(localStorage.getItem(this.DB_KEY) || '[]') as MemoryEntry[];
    } catch (error) {
      console.warn('[Kokuzo Memory] Failed to load memory:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.DB_KEY);
    } catch (error) {
      console.warn('[Kokuzo Memory] Failed to clear memory:', error);
    }
  }
}

/**
 * 記憶を保存（端末完結）
 * 
 * @param data 圧縮された記憶データ
 */
export async function saveMemory(data: CompressedMemory): Promise<void> {
  const s = await getStorage();
  await s.save({
    data,
    ts: Date.now(),
  });
}

/**
 * 記憶を読み込み
 * 
 * @returns 保存された記憶エントリの配列
 */
export async function loadMemory(): Promise<MemoryEntry[]> {
  const s = await getStorage();
  return await s.load();
}

/**
 * 記憶の要約を取得（中央API送信用）
 * 
 * @param limit 取得する記憶の最大数
 * @returns 抽象化された記憶データの配列
 */
export async function getMemorySummary(limit: number = 10): Promise<CompressedMemory[]> {
  const memories = await loadMemory();
  // 最新の記憶を優先的に取得
  const sorted = memories.sort((a, b) => b.ts - a.ts);
  return sorted.slice(0, limit).map(m => m.data);
}

/**
 * 記憶をクリア（デバッグ用）
 */
export async function clearMemory(): Promise<void> {
  const s = await getStorage();
  await s.clear();
}

