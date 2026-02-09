/**
 * IndexedDB implementation for Web environment
 * Uses idb library for IndexedDB operations
 */

import { openDB, type IDBPDatabase } from "idb";

// 型定義はrepo.tsからimport（共通）
export type { DbThread, DbMessage, DbArtifact } from "./repo";

const DB_NAME = "tenmon_ark_chat";
const DB_VERSION = 1;

// Object store names
const STORE_THREADS = "threads";
const STORE_MESSAGES = "messages";
const STORE_ARTIFACTS = "artifacts";
const STORE_PREFS = "user_prefs";

type DbSchema = {
  [STORE_THREADS]: {
    key: string;
    value: DbThread;
  };
  [STORE_MESSAGES]: {
    key: string;
    value: DbMessage;
  };
  [STORE_ARTIFACTS]: {
    key: string;
    value: DbArtifact;
  };
  [STORE_PREFS]: {
    key: string;
    value: { key: string; value: string };
  };
};

let dbPromise: Promise<IDBPDatabase<DbSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<DbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // threads
        if (!db.objectStoreNames.contains(STORE_THREADS)) {
          const threadsStore = db.createObjectStore(STORE_THREADS, {
            keyPath: "id",
          });
          threadsStore.createIndex("updatedAt", "updatedAt");
        }

        // messages
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const messagesStore = db.createObjectStore(STORE_MESSAGES, {
            keyPath: "id",
          });
          messagesStore.createIndex("threadId", "threadId");
          messagesStore.createIndex("threadId_createdAt", ["threadId", "createdAt"]);
        }

        // artifacts
        if (!db.objectStoreNames.contains(STORE_ARTIFACTS)) {
          const artifactsStore = db.createObjectStore(STORE_ARTIFACTS, {
            keyPath: "id",
          });
          artifactsStore.createIndex("messageId", "messageId");
          artifactsStore.createIndex("messageId_createdAt", ["messageId", "createdAt"]);
        }

        // user_prefs
        if (!db.objectStoreNames.contains(STORE_PREFS)) {
          db.createObjectStore(STORE_PREFS, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

// Threads

export async function createThread(title: string | null = null): Promise<DbThread> {
  const db = await getDb();
  const now = Date.now();
  const id = makeId("th");
  const safeTitle = title && title.trim().length > 0 ? title : "New chat";

  const thread: DbThread = {
    id,
    title: safeTitle,
    createdAt: now,
    updatedAt: now,
  };

  await db.put(STORE_THREADS, thread);

  return thread;
}

export async function listThreads(): Promise<DbThread[]> {
  const db = await getDb();
  const index = db.transaction(STORE_THREADS).store.index("updatedAt");
  const all = await index.getAll();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getThread(id: string): Promise<DbThread | null> {
  const db = await getDb();
  return (await db.get(STORE_THREADS, id)) ?? null;
}

export async function updateThreadUpdatedAt(
  id: string,
  updatedAt?: number
): Promise<void> {
  const db = await getDb();
  const thread = await db.get(STORE_THREADS, id);
  if (thread) {
    thread.updatedAt = updatedAt ?? Date.now();
    await db.put(STORE_THREADS, thread);
  }
}

export async function touchThread(id: string, updatedAt?: number): Promise<void> {
  return updateThreadUpdatedAt(id, updatedAt);
}

// Messages

export async function insertMessage(params: {
  threadId: string;
  role: "user" | "assistant" | string;
  text: string;
  createdAt?: number;
  rawJson?: unknown;
}): Promise<DbMessage> {
  const db = await getDb();
  const id = makeId("msg");
  const createdAt = params.createdAt ?? Date.now();
  const rawJsonString =
    params.rawJson === undefined ? null : JSON.stringify(params.rawJson);

  const message: DbMessage = {
    id,
    threadId: params.threadId,
    role: params.role,
    text: params.text,
    createdAt,
    rawJson: rawJsonString,
  };

  await db.put(STORE_MESSAGES, message);

  // スレッドの updatedAt も更新
  await updateThreadUpdatedAt(params.threadId, createdAt);

  return message;
}

export async function listMessagesByThread(threadId: string): Promise<DbMessage[]> {
  const db = await getDb();
  const index = db.transaction(STORE_MESSAGES).store.index("threadId_createdAt");
  const range = IDBKeyRange.bound([threadId, 0], [threadId, Number.MAX_SAFE_INTEGER]);
  const all = await index.getAll(range);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

// Artifacts

export async function insertArtifactsForMessage(
  messageId: string,
  artifacts: Array<{ kind: string; payload: unknown }>
): Promise<DbArtifact[]> {
  if (artifacts.length === 0) return [];
  const db = await getDb();
  const createdAt = Date.now();

  const result: DbArtifact[] = [];
  for (const a of artifacts) {
    const id = makeId("art");
    const payload = JSON.stringify(a.payload ?? null);
    const artifact: DbArtifact = {
      id,
      messageId,
      kind: a.kind,
      payload,
      createdAt,
    };
    await db.put(STORE_ARTIFACTS, artifact);
    result.push(artifact);
  }
  return result;
}

export async function listArtifactsByMessage(
  messageId: string
): Promise<DbArtifact[]> {
  const db = await getDb();
  const index = db.transaction(STORE_ARTIFACTS).store.index("messageId_createdAt");
  const range = IDBKeyRange.bound([messageId, 0], [messageId, Number.MAX_SAFE_INTEGER]);
  const all = await index.getAll(range);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

// user_prefs

export async function getUserPref(key: string): Promise<string | null> {
  const db = await getDb();
  const entry = await db.get(STORE_PREFS, key);
  return entry?.value ?? null;
}

export async function setUserPref(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PREFS, { key, value });
}

export const prefsGet = getUserPref;
export const prefsSet = setUserPref;

// Aggregate helpers

export async function countThreads(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_THREADS);
}

export async function countMessages(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_MESSAGES);
}

export async function countArtifacts(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_ARTIFACTS);
}

export async function listAllMessages(): Promise<DbMessage[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_MESSAGES);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function listAllArtifacts(): Promise<DbArtifact[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_ARTIFACTS);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteAllLocalData(): Promise<void> {
  const db = await getDb();
  // schema_version は残すため user_prefs は消さない
  await db.clear(STORE_ARTIFACTS);
  await db.clear(STORE_MESSAGES);
  await db.clear(STORE_THREADS);
}
