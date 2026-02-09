type Thread = { id: string; title?: string; updatedAt?: number; [k: string]: any };
type Message = { id: string; threadId: string; role?: string; text: string; createdAt?: number; [k: string]: any };

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

async function clearStore(db: IDBDatabase, name: string) {
  const tx = db.transaction(name, "readwrite");
  tx.objectStore(name).clear();
  await txDone(tx);
}

export async function upsertThread(t: Thread) {
  const db = await openDB();
  try {
    const tx = db.transaction("threads", "readwrite");
    tx.objectStore("threads").put({ ...t, updatedAt: t.updatedAt ?? Date.now() });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function addMessage(m: Message) {
  const db = await openDB();
  try {
    const tx = db.transaction("messages", "readwrite");
    tx.objectStore("messages").put({ ...m, createdAt: m.createdAt ?? Date.now() });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function listThreads(): Promise<Thread[]> {
  const db = await openDB();
  try {
    const tx = db.transaction("threads", "readonly");
    const store = tx.objectStore("threads");
    const req = store.getAll();
    const out: Thread[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } finally {
    db.close();
  }
}

export async function listMessages(threadId: string): Promise<Message[]> {
  const db = await openDB();
  try {
    const tx = db.transaction("messages", "readonly");
    const store = tx.objectStore("messages");
    const idx = store.index("by_thread");
    const req = idx.getAll(IDBKeyRange.only(threadId));
    const out: Message[] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return out.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } finally {
    db.close();
  }
}

export async function exportAll(): Promise<{ threads: Thread[]; messages: Message[] }> {
  const db = await openDB();
  try {
    const tx = db.transaction(["threads", "messages"], "readonly");
    const tReq = tx.objectStore("threads").getAll();
    const mReq = tx.objectStore("messages").getAll();
    const threads: Thread[] = await new Promise((resolve, reject) => {
      tReq.onsuccess = () => resolve(tReq.result ?? []);
      tReq.onerror = () => reject(tReq.error);
    });
    const messages: Message[] = await new Promise((resolve, reject) => {
      mReq.onsuccess = () => resolve(mReq.result ?? []);
      mReq.onerror = () => reject(mReq.error);
    });
    await txDone(tx);
    return { threads, messages };
  } finally {
    db.close();
  }
}

export async function importAll(data: any): Promise<void> {
  const threads: Thread[] = Array.isArray(data?.threads) ? data.threads : [];
  const messages: Message[] = Array.isArray(data?.messages) ? data.messages : [];

  const db = await openDB();
  try {
    await clearStore(db, "threads");
    await clearStore(db, "messages");

    const tx = db.transaction(["threads", "messages"], "readwrite");
    const tStore = tx.objectStore("threads");
    const mStore = tx.objectStore("messages");

    for (const t of threads) tStore.put(t);
    for (const m of messages) mStore.put(m);

    await txDone(tx);
  } finally {
    db.close();
  }
}
