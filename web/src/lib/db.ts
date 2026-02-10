// web/src/lib/db.ts
export type PersistThread = { id: string; title?: string; updatedAt?: number };
export type PersistMessage = {
  id: string;
  threadId: string;
  role: "user" | "tenmon";
  text: string;
  createdAt: number;
};

const DB_NAME = "tenmon_ark_pwa_v1";
const DB_VER = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("threads")) {
        db.createObjectStore("threads", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        const s = db.createObjectStore("messages", { keyPath: "id" });
        s.createIndex("by_thread", "threadId", { unique: false });
        s.createIndex("by_thread_createdAt", ["threadId", "createdAt"], { unique: false });
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

export async function exportAll(): Promise<{ version: string; threads: PersistThread[]; messages: PersistMessage[] }> {
  const db = await openDB();
  try {
    const tx = db.transaction(["threads", "messages"], "readonly");
    const tReq = tx.objectStore("threads").getAll();
    const mReq = tx.objectStore("messages").getAll();

    const [threads, messages] = await Promise.all([
      new Promise<PersistThread[]>((resolve, reject) => {
        tReq.onsuccess = () => resolve((tReq.result ?? []) as PersistThread[]);
        tReq.onerror = () => reject(tReq.error);
      }),
      new Promise<PersistMessage[]>((resolve, reject) => {
        mReq.onsuccess = () => resolve((mReq.result ?? []) as PersistMessage[]);
        mReq.onerror = () => reject(mReq.error);
      }),
    ]);

    await txDone(tx);
    return { version: "TENMON_PWA_EXPORT_V1", threads, messages };
  } finally {
    db.close();
  }
}

export async function importAll(data: any): Promise<void> {
  if (!data || typeof data !== "object") throw new Error("invalid json");
  const threads = Array.isArray(data.threads) ? data.threads : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];

  const db = await openDB();
  try {
    const tx = db.transaction(["threads", "messages"], "readwrite");
    const tStore = tx.objectStore("threads");
    const mStore = tx.objectStore("messages");

    tStore.clear();
    mStore.clear();

    for (const t of threads) {
      if (!t || typeof t.id !== "string") continue;
      tStore.put({ id: t.id, title: t.title, updatedAt: t.updatedAt ?? Date.now() });
    }
    for (const m of messages) {
      if (!m || typeof m.id !== "string") continue;
      if (typeof m.threadId !== "string") continue;
      if (m.role !== "user" && m.role !== "tenmon") continue;
      if (typeof m.text !== "string") continue;
      mStore.put({
        id: m.id,
        threadId: m.threadId,
        role: m.role,
        text: m.text,
        createdAt: typeof m.createdAt === "number" ? m.createdAt : Date.now(),
      });
    }

    await txDone(tx);
  } finally {
    db.close();
  }
}
