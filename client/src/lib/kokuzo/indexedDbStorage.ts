/**
 * IndexedDB Storage Implementation
 * Kokūzō記憶のIndexedDB実装
 * 
 * localStorage容量制限から脱却
 */

import type { KokuzoStorage, MemoryEntry } from './storage';

const DB_NAME = 'TENMON_KOKUZO';
const STORE_NAME = 'memories';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDBを開く
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('ts', 'ts', { unique: false });
      }
    };
  });
}

/**
 * IndexedDB実装
 */
export class IndexedDbStorage implements KokuzoStorage {
  async save(event: MemoryEntry): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 保存前のみ暗号化
      const encryptedData = await encrypt(JSON.stringify(event.data));

      // IDを生成（タイムスタンプベース）
      const entry = {
        data: encryptedData, // 暗号化されたデータ
        ts: event.ts,
        id: event.ts,
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[Kokuzo IndexedDB] Failed to save memory:', error);
      throw error;
    }
  }

  async load(): Promise<MemoryEntry[]> {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('ts');

      return new Promise<MemoryEntry[]>((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 降順（最新から）
        const entries: MemoryEntry[] = [];

        request.onsuccess = async (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const value = cursor.value;
            try {
              // 復号化
              const decryptedData = await decrypt(value.data);
              entries.push({
                data: JSON.parse(decryptedData),
                ts: value.ts,
              });
            } catch (error) {
              console.warn('[Kokuzo IndexedDB] Failed to decrypt memory:', error);
            }
            cursor.continue();
          } else {
            resolve(entries);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[Kokuzo IndexedDB] Failed to load memory:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[Kokuzo IndexedDB] Failed to clear memory:', error);
      throw error;
    }
  }
}

