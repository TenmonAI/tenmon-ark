// web/src/lib/db.ts
export type PersistThread = { id: string; title?: string; updatedAt?: number; folderId?: string | null };
export type PersistMessage = {
  id: string;
  threadId: string;
  role: "user" | "tenmon";
  text: string;
  createdAt: number;
};

export type PersistSeed = {
  id: string;
  threadId?: string;
  summary?: string;
  tags?: string[];
  createdAt?: number;
  [k: string]: unknown;
};

export const SCHEMA_VERSION = "PWA_MEM_01a_IDB_V4";


const DB_NAME = "tenmon_ark_pwa_v1";
const DB_VER = 4;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // 新規 (0): threads/messages/seeds/meta を作成
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
          meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
        } else {
          // 念のため
          const meta = (event.target as any).transaction.objectStore("meta");
          meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
        }
        return;
      }

      // v1 -> v2: seeds/meta を追加（threads/messages はそのまま）
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("seeds")) {
          db.createObjectStore("seeds", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          const meta = db.createObjectStore("meta", { keyPath: "key" });
          meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
        } else {
          try {
            const meta = (event.target as any).transaction.objectStore("meta");
            meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
          } catch {
            // ignore
          }
        }
      }

      // v2 -> v3: sukuyou_results store を追加
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains("sukuyou_results")) {
          const s = db.createObjectStore("sukuyou_results", { keyPath: "id" });
          s.createIndex("by_createdAt", "createdAt", { unique: false });
        }
        try {
          const meta = (event.target as any).transaction.objectStore("meta");
          meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
        } catch { /* ignore */ }
      }
      // v3 -> v4: chat_folders store を追加
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains("chat_folders")) {
          const s = db.createObjectStore("chat_folders", { keyPath: "id" });
          s.createIndex("by_sortOrder", "sortOrder", { unique: false });
        }
        try {
          const meta = (event.target as any).transaction.objectStore("meta");
          meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
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

export async function upsertThread(t: PersistThread): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(["threads"], "readwrite");
    tx.objectStore("threads").put({ ...t, updatedAt: t.updatedAt ?? Date.now() });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function replaceThreadMessages(threadId: string, msgs: PersistMessage[]): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(["messages"], "readwrite");
    const store = tx.objectStore("messages");
    const idx = store.index("by_thread");
    const req = idx.getAllKeys(threadId);

    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => {
        const keys = (req.result ?? []) as IDBValidKey[];
        for (const k of keys) store.delete(k);
        for (const m of msgs) store.put(m);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function listMessagesByThread(threadId: string): Promise<PersistMessage[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(["messages"], "readonly");
    const store = tx.objectStore("messages");
    const idx = store.index("by_thread_createdAt");
    const range = IDBKeyRange.bound([threadId, 0], [threadId, Number.MAX_SAFE_INTEGER]);

    const req = idx.getAll(range);
    const rows = await new Promise<PersistMessage[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as PersistMessage[]);
      req.onerror = () => reject(req.error);
    });

    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}



// --- PWA-MEM-01a-IDB-V2-STORE-V1: seeds APIs ---
export async function dbPutSeeds(seeds: PersistSeed[]): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(["seeds"], "readwrite");
    const store = tx.objectStore("seeds");
    store.clear();
    for (const s of seeds) {
      if (s && typeof s.id === "string") store.put({ ...s, id: s.id });
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function dbGetAllSeeds(): Promise<PersistSeed[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(["seeds"], "readonly");
    const req = tx.objectStore("seeds").getAll();
    const rows = await new Promise<PersistSeed[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as PersistSeed[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}



// PWA-MEM-01c: clear all stores for atomic overwrite import
// V2: sukuyou_results と chat_folders も含めてクリア
export async function dbClearAll(): Promise<void> {
  const db = await openDB();
  try {
    const storeNames = ["threads", "messages", "seeds", "sukuyou_results", "chat_folders"];
    const available = storeNames.filter(s => db.objectStoreNames.contains(s));
    const tx = db.transaction(available, "readwrite");
    for (const name of available) {
      tx.objectStore(name).clear();
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

// --- 宿曜結果の一括取得・書き込み（export/import用） ---
export async function dbGetAllSukuyouResults(): Promise<Record<string, unknown>[]> {
  const db = await openDB();
  try {
    if (!db.objectStoreNames.contains("sukuyou_results")) return [];
    const tx = db.transaction(["sukuyou_results"], "readonly");
    const req = tx.objectStore("sukuyou_results").getAll();
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as Record<string, unknown>[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}

export async function dbPutAllSukuyouResults(results: Record<string, unknown>[]): Promise<void> {
  const db = await openDB();
  try {
    if (!db.objectStoreNames.contains("sukuyou_results")) return;
    const tx = db.transaction(["sukuyou_results"], "readwrite");
    const store = tx.objectStore("sukuyou_results");
    for (const r of results) {
      if (r && typeof r.id === "string") store.put(r);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

// --- フォルダーの一括取得・書き込み（export/import用） ---
export async function dbGetAllChatFolders(): Promise<Record<string, unknown>[]> {
  const db = await openDB();
  try {
    if (!db.objectStoreNames.contains("chat_folders")) return [];
    const tx = db.transaction(["chat_folders"], "readonly");
    const req = tx.objectStore("chat_folders").getAll();
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as Record<string, unknown>[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}

export async function dbPutAllChatFolders(folders: Record<string, unknown>[]): Promise<void> {
  const db = await openDB();
  try {
    if (!db.objectStoreNames.contains("chat_folders")) return;
    const tx = db.transaction(["chat_folders"], "readwrite");
    const store = tx.objectStore("chat_folders");
    for (const f of folders) {
      if (f && typeof f.id === "string") store.put(f);
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

// PWA-MEM-01b: list all threads (export support)
export async function dbGetAllThreads(): Promise<PersistThread[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(["threads"], "readonly");
    const req = tx.objectStore("threads").getAll();
    const rows = await new Promise<PersistThread[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as PersistThread[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}
