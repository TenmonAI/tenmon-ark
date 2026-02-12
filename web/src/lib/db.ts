// web/src/lib/db.ts
export type PersistThread = { id: string; title?: string; updatedAt?: number };
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

export const SCHEMA_VERSION = "PWA_MEM_01a_IDB_V2";


const DB_NAME = "tenmon_ark_pwa_v1";
const DB_VER = 2;

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
          // upgrade tx があるときだけ put（存在しない環境では無視されてもOK）
          try {
            const meta = (event.target as any).transaction.objectStore("meta");
            meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
          } catch {
            // ignore
          }
        }
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
