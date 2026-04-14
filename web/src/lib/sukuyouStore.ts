/**
 * SUKUYOU_RESULT_STORE_V1
 * 宿曜鑑定結果のIndexedDB保存層
 * PWAローカルに鑑定結果を蓄積し、左メニューから再読・継続質問できるようにする。
 */

export type SukuyouResultRoom = {
  id: string;
  threadId: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  birthDate: string;
  honmeiShuku: string;
  honmeiShukuKana: string;
  disasterType: string;
  reversalAxis: string;
  rawConcern?: string;
  shortOracle: string;
  longOracle?: string;
  immediateAction?: string;
  fullReport: string;
  chapters: Array<{
    number: number;
    title: string;
    content: string;
    source?: string;
  }>;
  charCount: number;
  chatHistory: Array<{
    role: "user" | "assistant";
    text: string;
    createdAt: string;
  }>;
  sukuyouSeedV1?: Record<string, unknown>;
};

const DB_NAME = "tenmon_ark_pwa_v1";
const DB_VER = 4; // v3 → v4: add chat_folders store
const STORE_NAME = "sukuyou_results";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // v0 → v3: create all stores
      if (oldVersion === 0) {
        if (!db.objectStoreNames.contains("threads")) {
          db.createObjectStore("threads", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("messages")) {
          const s = db.createObjectStore("messages", { keyPath: "id" });
          s.createIndex("by_thread", "threadId", { unique: false });
          s.createIndex("by_thread_createdAt", ["threadId", "createdAt"], { unique: false });
        }
        if (!db.objectStoreNames.contains("seeds")) {
          db.createObjectStore("seeds", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          const meta = db.createObjectStore("meta", { keyPath: "key" });
          meta.put({ key: "schemaVersion", value: "PWA_MEM_01a_IDB_V3" });
        }
      }

      // v1 → v2: seeds/meta
      if (oldVersion >= 1 && oldVersion < 2) {
        if (!db.objectStoreNames.contains("seeds")) {
          db.createObjectStore("seeds", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          const meta = db.createObjectStore("meta", { keyPath: "key" });
          meta.put({ key: "schemaVersion", value: "PWA_MEM_01a_IDB_V3" });
        }
      }

      // v2 → v3: sukuyou_results
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const s = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          s.createIndex("by_createdAt", "createdAt", { unique: false });
        }
        // update schema version in meta
        try {
          const tx = (event.target as any).transaction;
          if (db.objectStoreNames.contains("meta")) {
            tx.objectStore("meta").put({ key: "schemaVersion", value: "PWA_MEM_01a_IDB_V3" });
          }
        } catch { /* ignore */ }
      }
      // v3 → v4: chat_folders store
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains("chat_folders")) {
          const s = db.createObjectStore("chat_folders", { keyPath: "id" });
          s.createIndex("by_sortOrder", "sortOrder", { unique: false });
        }
        try {
          const tx = (event.target as any).transaction;
          if (db.objectStoreNames.contains("meta")) {
            tx.objectStore("meta").put({ key: "schemaVersion", value: "PWA_MEM_01a_IDB_V4" });
          }
        } catch { /* ignore */ }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** 鑑定結果を保存（upsert） */
export async function saveSukuyouResult(room: SukuyouResultRoom): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).put(room);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** 全鑑定結果を取得（新しい順） */
export async function listSukuyouResults(): Promise<SukuyouResultRoom[]> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    const rows = await new Promise<SukuyouResultRoom[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as SukuyouResultRoom[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } finally {
    db.close();
  }
}

/** IDで鑑定結果を取得 */
export async function getSukuyouResult(id: string): Promise<SukuyouResultRoom | null> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    const row = await new Promise<SukuyouResultRoom | null>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as SukuyouResultRoom) || null);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return row;
  } finally {
    db.close();
  }
}

/** 鑑定結果のチャット履歴を更新 */
export async function updateSukuyouChat(
  id: string,
  chatHistory: SukuyouResultRoom["chatHistory"]
): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => {
        const existing = req.result as SukuyouResultRoom | undefined;
        if (existing) {
          existing.chatHistory = chatHistory;
          existing.updatedAt = new Date().toISOString();
          store.put(existing);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** 鑑定結果を削除 */
export async function deleteSukuyouResult(id: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}
