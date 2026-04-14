/**
 * TENMON_ARK_CHAT_NAV_AND_FOLDER_OS_V1 — FIX-B/C
 * チャットフォルダーOS: データモデル + IndexedDB永続化 + CRUD
 *
 * IndexedDB v4 に chat_folders ストアを追加。
 * スレッドのフォルダー所属は localStorage の THREADS_META に folderId を追加して管理。
 */

/* ── 型定義 ── */
export type ChatFolder = {
  id: string;
  name: string;
  kind: "chat" | "system";
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  isDefault?: boolean;
  color?: string;
};

export type ThreadFolderAssignment = {
  threadId: string;
  folderId: string | null;
};

/* ── IndexedDB ── */
const DB_NAME = "tenmon_ark_pwa_v1";
const DB_VER = 4; // v3 → v4: add chat_folders
const STORE_NAME = "chat_folders";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // v0 → v1: threads, messages
      if (oldVersion === 0) {
        if (!db.objectStoreNames.contains("threads")) {
          db.createObjectStore("threads", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("messages")) {
          const s = db.createObjectStore("messages", { keyPath: "id" });
          s.createIndex("by_thread", "threadId", { unique: false });
          s.createIndex("by_thread_createdAt", ["threadId", "createdAt"], { unique: false });
        }
      }
      // v1 → v2: seeds, meta
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("seeds")) {
          db.createObjectStore("seeds", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      }
      // v2 → v3: sukuyou_results
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains("sukuyou_results")) {
          const s = db.createObjectStore("sukuyou_results", { keyPath: "id" });
          s.createIndex("by_createdAt", "createdAt", { unique: false });
        }
      }
      // v3 → v4: chat_folders
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const s = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          s.createIndex("by_sortOrder", "sortOrder", { unique: false });
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

/* ── ID生成 ── */
function genFolderId(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── CRUD ── */

/** フォルダー一覧取得（sortOrder昇順） */
export async function listChatFolders(): Promise<ChatFolder[]> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    const rows = await new Promise<ChatFolder[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result ?? []) as ChatFolder[]);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } finally {
    db.close();
  }
}

/** フォルダー作成 */
export async function createChatFolder(name: string, color?: string): Promise<ChatFolder> {
  const existing = await listChatFolders();
  const maxSort = existing.reduce((max, f) => Math.max(max, f.sortOrder ?? 0), 0);
  const now = new Date().toISOString();
  const folder: ChatFolder = {
    id: genFolderId(),
    name,
    kind: "chat",
    createdAt: now,
    updatedAt: now,
    sortOrder: maxSort + 1,
    color,
  };
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).put(folder);
    await txDone(tx);
  } finally {
    db.close();
  }
  dispatchFolderUpdate();
  return folder;
}

/** フォルダー名変更 */
export async function renameChatFolder(id: string, newName: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const existing = await new Promise<ChatFolder | undefined>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as ChatFolder | undefined);
      req.onerror = () => reject(req.error);
    });
    if (existing) {
      store.put({ ...existing, name: newName, updatedAt: new Date().toISOString() });
    }
    await txDone(tx);
  } finally {
    db.close();
  }
  dispatchFolderUpdate();
}

/** フォルダー削除（所属スレッドは未分類に戻す） */
export async function deleteChatFolder(id: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction([STORE_NAME], "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
  // 所属スレッドのfolderIdをnullに
  unassignThreadsFromFolder(id);
  dispatchFolderUpdate();
}

/* ── スレッドのフォルダー所属管理（localStorage） ── */

function getUserKey(): string {
  try {
    return localStorage.getItem("TENMON_USER_KEY") || "";
  } catch {
    return "";
  }
}

function threadsMetaKey(): string {
  const uk = getUserKey();
  return uk ? `TENMON_PWA_THREADS_META_V1:${uk}` : "TENMON_PWA_THREADS_META_V1";
}

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
  folderId?: string | null;
  pinned?: boolean;
};

function loadThreadsMeta(): Record<string, ThreadMeta> {
  try {
    const raw = localStorage.getItem(threadsMetaKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveThreadsMeta(map: Record<string, ThreadMeta>): void {
  try {
    localStorage.setItem(threadsMetaKey(), JSON.stringify(map));
  } catch {}
}

/** スレッドをフォルダーに移動 */
export function moveThreadToFolder(threadId: string, folderId: string | null): void {
  const map = loadThreadsMeta();
  if (map[threadId]) {
    map[threadId] = { ...map[threadId], folderId };
  }
  saveThreadsMeta(map);
  dispatchFolderUpdate();
}

/** スレッドのピン留め切り替え */
export function toggleThreadPin(threadId: string): void {
  const map = loadThreadsMeta();
  if (map[threadId]) {
    map[threadId] = { ...map[threadId], pinned: !map[threadId].pinned };
  }
  saveThreadsMeta(map);
  dispatchFolderUpdate();
}

/** スレッド名変更 */
export function renameThread(threadId: string, newTitle: string): void {
  const map = loadThreadsMeta();
  if (map[threadId]) {
    map[threadId] = { ...map[threadId], title: newTitle };
  }
  saveThreadsMeta(map);
  window.dispatchEvent(new CustomEvent("tenmon:threads-updated"));
}

/** フォルダー削除時に所属スレッドを未分類に */
function unassignThreadsFromFolder(folderId: string): void {
  const map = loadThreadsMeta();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (map[key]?.folderId === folderId) {
      map[key] = { ...map[key], folderId: null };
      changed = true;
    }
  }
  if (changed) {
    saveThreadsMeta(map);
  }
}

/** フォルダー別にスレッドを取得 */
export function getThreadsByFolder(folderId: string | null): ThreadMeta[] {
  const map = loadThreadsMeta();
  return Object.values(map)
    .filter((t) => {
      if (!t || typeof t.id !== "string") return false;
      if (folderId === null) {
        return !t.folderId;
      }
      return t.folderId === folderId;
    })
    .sort((a, b) => {
      // ピン留め優先、次に更新日時降順
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
}

/** 全スレッドを取得（フォルダー問わず） */
export function getAllThreadsMeta(): ThreadMeta[] {
  const map = loadThreadsMeta();
  return Object.values(map)
    .filter((t) => t && typeof t.id === "string")
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/* ── イベント ── */
export const FOLDER_UPDATE_EVENT = "tenmon:folders-updated";

function dispatchFolderUpdate(): void {
  window.dispatchEvent(new CustomEvent(FOLDER_UPDATE_EVENT));
  window.dispatchEvent(new CustomEvent("tenmon:threads-updated"));
}

/* ── 初期化: デフォルトフォルダー「未分類」の確保 ── */
export async function ensureDefaultFolder(): Promise<void> {
  const folders = await listChatFolders();
  // デフォルトフォルダーは作らない — 未分類はfolderId=nullとして扱う
  // ただし初回起動時のガイダンスのために空チェックだけ行う
  return;
}
