/**
 * CROSS_DEVICE_SYNC_CLIENT_V1
 *
 * Local-first を壊さない前提で、ログイン済みユーザーの
 * chat threads / folders / sukuyou rooms をサーバーと同期する。
 *
 * 呼び出し元:
 *   - login 直後 → bootstrap()
 *   - 定期 (5 min) → pull()
 *   - local 変更時 → push()
 */

const API_BASE = "/api";

/* ── types ── */

interface SyncThread {
  threadId: string;
  title: string;
  folderId: string | null;
  pinned: number;
  updatedAt: string;
  version: number;
  isDeleted?: number;
}

interface SyncFolder {
  folderId: string;
  name: string;
  kind: string;
  color: string | null;
  sortOrder: number;
  isDefault: number;
  updatedAt: string;
  version: number;
  isDeleted?: number;
}

interface SyncSukuyouRoom {
  roomId: string;
  threadId: string | null;
  birthDate: string | null;
  honmeiShuku: string | null;
  disasterType: string | null;
  reversalAxis: string | null;
  shortOracle: string | null;
  updatedAt: string;
  version: number;
  isDeleted?: number;
}

interface BootstrapResponse {
  ok: boolean;
  threads: SyncThread[];
  folders: SyncFolder[];
  sukuyouRooms: SyncSukuyouRoom[];
  at: string;
  error?: string;
}

interface PullResponse {
  ok: boolean;
  threads: SyncThread[];
  folders: SyncFolder[];
  sukuyouRooms: SyncSukuyouRoom[];
  at: string;
  since: string;
  error?: string;
}

interface PushResponse {
  ok: boolean;
  applied: number;
  skipped: number;
  at: string;
  error?: string;
}

interface SyncChange {
  kind: string;
  payload: Record<string, unknown>;
}

/* ── device id ── */

const DEVICE_ID_KEY = "TENMON_SYNC_DEVICE_ID";
const LAST_PULL_KEY = "TENMON_SYNC_LAST_PULL_AT";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getLastPullAt(): string {
  return localStorage.getItem(LAST_PULL_KEY) || "";
}

function setLastPullAt(at: string): void {
  localStorage.setItem(LAST_PULL_KEY, at);
}

/* ── pending queue ── */

const PENDING_KEY = "TENMON_SYNC_PENDING_CHANGES";

function getPendingChanges(): SyncChange[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setPendingChanges(changes: SyncChange[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(changes));
}

export function queueSyncChange(change: SyncChange): void {
  const pending = getPendingChanges();
  pending.push(change);
  // cap at 500 to prevent runaway
  if (pending.length > 500) pending.splice(0, pending.length - 500);
  setPendingChanges(pending);
}

/* ── API calls ── */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  return res.json() as Promise<T>;
}

/**
 * bootstrap — 初回同期。サーバーの全データを取得して local cache に反映。
 */
export async function syncBootstrap(): Promise<BootstrapResponse | null> {
  try {
    const deviceId = getDeviceId();
    const data = await fetchJson<BootstrapResponse>(
      `${API_BASE}/sync/bootstrap`,
      {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      }
    );
    if (data.ok) {
      applyRemoteData(data.threads, data.folders, data.sukuyouRooms);
      setLastPullAt(data.at);
    }
    return data;
  } catch (e) {
    console.warn("[SYNC] bootstrap failed", e);
    return null;
  }
}

/**
 * pull — 差分取得。since 以降の変更をサーバーから取得。
 */
export async function syncPull(): Promise<PullResponse | null> {
  try {
    const deviceId = getDeviceId();
    const since = getLastPullAt();
    const params = new URLSearchParams({ deviceId });
    if (since) params.set("since", since);

    const data = await fetchJson<PullResponse>(
      `${API_BASE}/sync/pull?${params.toString()}`
    );
    if (data.ok) {
      applyRemoteData(data.threads, data.folders, data.sukuyouRooms);
      setLastPullAt(data.at);
    }
    return data;
  } catch (e) {
    console.warn("[SYNC] pull failed", e);
    return null;
  }
}

/**
 * push — pending queue の変更をサーバーに送信。
 */
const PUSH_CHUNK_SIZE = 200;

export async function syncPush(): Promise<PushResponse | null> {
  const pending = getPendingChanges();
  if (pending.length === 0) return null;

  const deviceId = getDeviceId();
  let totalApplied = 0;
  let totalSkipped = 0;
  let lastAt = "";
  let successCount = 0; // number of items successfully pushed so far

  for (let i = 0; i < pending.length; i += PUSH_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + PUSH_CHUNK_SIZE);
    try {
      const data = await fetchJson<PushResponse>(
        `${API_BASE}/sync/push`,
        {
          method: "POST",
          body: JSON.stringify({ deviceId, changes: chunk }),
        }
      );
      if (data.ok) {
        totalApplied += data.applied;
        totalSkipped += data.skipped;
        lastAt = data.at;
        successCount += chunk.length;
        // Remove only the successfully pushed items from pending
        const remaining = getPendingChanges();
        // The first `successCount` items have been sent; keep the rest
        setPendingChanges(remaining.slice(successCount));
      } else {
        // Server returned ok=false; stop sending further chunks
        console.warn("[SYNC] push chunk rejected by server", data.error);
        break;
      }
    } catch (e) {
      // Network/fetch error; stop sending further chunks
      // Already-succeeded chunks have been removed from pending
      console.warn("[SYNC] push chunk failed", e);
      break;
    }
  }

  if (totalApplied > 0 || totalSkipped > 0) {
    return { ok: true, applied: totalApplied, skipped: totalSkipped, at: lastAt };
  }
  return null;
}

/* ── IDB helpers for shallow-merge apply ── */

const IDB_NAME = "tenmon_ark_pwa_v1";
const IDB_VER = 4;

function openSyncIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = req.result;
      const old = event.oldVersion;
      if (old === 0) {
        db.createObjectStore("threads", { keyPath: "id" });
        const ms = db.createObjectStore("messages", { keyPath: "id" });
        ms.createIndex("by_threadId", "threadId", { unique: false });
        db.createObjectStore("seeds", { keyPath: "id" });
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (old < 3 && !db.objectStoreNames.contains("sukuyou_results")) {
        const s = db.createObjectStore("sukuyou_results", { keyPath: "id" });
        s.createIndex("by_createdAt", "createdAt", { unique: false });
      }
      if (old < 4 && !db.objectStoreNames.contains("chat_folders")) {
        const s = db.createObjectStore("chat_folders", { keyPath: "id" });
        s.createIndex("by_sortOrder", "sortOrder", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Shallow-merge remote folders into IndexedDB chat_folders.
 * Preserves local-only fields; only overwrites remote meta fields.
 */
async function applyFoldersToIDB(folders: SyncFolder[]): Promise<void> {
  const db = await openSyncIDB();
  try {
    if (!db.objectStoreNames.contains("chat_folders")) return;

    // 1. Read all existing records into a map
    const readTx = db.transaction(["chat_folders"], "readonly");
    const existingMap = await new Promise<Map<string, Record<string, unknown>>>((resolve, reject) => {
      const req = readTx.objectStore("chat_folders").getAll();
      req.onsuccess = () => {
        const map = new Map<string, Record<string, unknown>>();
        for (const row of (req.result ?? []) as Record<string, unknown>[]) {
          if (row && typeof row.id === "string") map.set(row.id, row);
        }
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });

    // 2. Write with shallow merge
    const writeTx = db.transaction(["chat_folders"], "readwrite");
    const store = writeTx.objectStore("chat_folders");

    for (const f of folders) {
      if (f.isDeleted) {
        store.delete(f.folderId);
        continue;
      }
      const local = existingMap.get(f.folderId) || {};
      // shallow merge: local fields preserved, remote meta overwrites
      const merged: Record<string, unknown> = {
        ...local,
        id: f.folderId,
        name: f.name,
        kind: f.kind || (local as any).kind || "chat",
        color: f.color ?? (local as any).color ?? null,
        sortOrder: f.sortOrder ?? (local as any).sortOrder ?? 0,
        isDefault: !!f.isDefault,
        updatedAt: f.updatedAt,
      };
      // Preserve createdAt if local has it
      if (!merged.createdAt && (local as any).createdAt) {
        merged.createdAt = (local as any).createdAt;
      }
      if (!merged.createdAt) {
        merged.createdAt = f.updatedAt;
      }
      store.put(merged);
    }

    await new Promise<void>((resolve, reject) => {
      writeTx.oncomplete = () => resolve();
      writeTx.onerror = () => reject(writeTx.error);
    });

    // 3. Dispatch event for sidebar refresh
    window.dispatchEvent(new CustomEvent("tenmon:folders-updated"));
  } finally {
    db.close();
  }
}

/**
 * Shallow-merge remote sukuyou rooms into IndexedDB sukuyou_results.
 * Preserves local-only detail fields (fullReport, chapters, chatHistory, etc.);
 * only overwrites remote meta fields.
 */
async function applySukuyouRoomsToIDB(rooms: SyncSukuyouRoom[]): Promise<void> {
  const db = await openSyncIDB();
  try {
    if (!db.objectStoreNames.contains("sukuyou_results")) return;

    // 1. Read all existing records into a map
    const readTx = db.transaction(["sukuyou_results"], "readonly");
    const existingMap = await new Promise<Map<string, Record<string, unknown>>>((resolve, reject) => {
      const req = readTx.objectStore("sukuyou_results").getAll();
      req.onsuccess = () => {
        const map = new Map<string, Record<string, unknown>>();
        for (const row of (req.result ?? []) as Record<string, unknown>[]) {
          if (row && typeof row.id === "string") map.set(row.id, row);
        }
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });

    // 2. Write with shallow merge
    const writeTx = db.transaction(["sukuyou_results"], "readwrite");
    const store = writeTx.objectStore("sukuyou_results");

    for (const r of rooms) {
      if (r.isDeleted) {
        store.delete(r.roomId);
        continue;
      }
      const local = existingMap.get(r.roomId) || {};
      // shallow merge: local detail fields (fullReport, chapters, chatHistory, etc.) preserved
      // remote meta fields overwrite
      const merged: Record<string, unknown> = {
        ...local,
        id: r.roomId,
        threadId: r.threadId ?? (local as any).threadId ?? null,
        birthDate: r.birthDate ?? (local as any).birthDate ?? null,
        honmeiShuku: r.honmeiShuku ?? (local as any).honmeiShuku ?? null,
        disasterType: r.disasterType ?? (local as any).disasterType ?? null,
        reversalAxis: r.reversalAxis ?? (local as any).reversalAxis ?? null,
        shortOracle: r.shortOracle ?? (local as any).shortOracle ?? null,
        updatedAt: r.updatedAt,
      };
      // Preserve createdAt if local has it
      if (!merged.createdAt && (local as any).createdAt) {
        merged.createdAt = (local as any).createdAt;
      }
      if (!merged.createdAt) {
        merged.createdAt = r.updatedAt;
      }
      // IMPORTANT: local-only detail fields are preserved via spread:
      // fullReport, chapters, chatHistory, longOracle, immediateAction,
      // honmeiShukuKana, rawConcern, charCount, sukuyouSeedV1, name
      store.put(merged);
    }

    await new Promise<void>((resolve, reject) => {
      writeTx.oncomplete = () => resolve();
      writeTx.onerror = () => reject(writeTx.error);
    });

    // 3. Dispatch event for UI refresh
    window.dispatchEvent(new CustomEvent("tenmon:sukuyou-updated"));
  } finally {
    db.close();
  }
}

/* ── apply remote data to local state ── */

function applyRemoteData(
  threads: SyncThread[],
  folders: SyncFolder[],
  sukuyouRooms: SyncSukuyouRoom[]
): void {
  // Apply threads to localStorage (THREADS_META)
  try {
    const userKey = localStorage.getItem("TENMON_USER_KEY") || localStorage.getItem("TENMON_PWA_USER_ID") || "";
    const metaKey = userKey
      ? `TENMON_PWA_THREADS_META_V1:${userKey}`
      : "TENMON_PWA_THREADS_META_V1";

    const existing: Record<string, any> = (() => {
      try {
        return JSON.parse(localStorage.getItem(metaKey) || "{}");
      } catch {
        return {};
      }
    })();

    for (const t of threads) {
      if (t.isDeleted) {
        delete existing[t.threadId];
      } else {
        const prev = existing[t.threadId];
        // Only update if remote is newer
        if (!prev || !prev.updatedAt || t.updatedAt > prev.updatedAt) {
          existing[t.threadId] = {
            ...(prev || {}),
            title: t.title || prev?.title || "",
            folderId: t.folderId ?? prev?.folderId ?? null,
            pinned: !!t.pinned,
            updatedAt: t.updatedAt,
          };
        }
      }
    }

    localStorage.setItem(metaKey, JSON.stringify(existing));
  } catch (e) {
    console.warn("[SYNC] failed to apply threads", e);
  }

  // Apply folders to IndexedDB with shallow merge
  if (folders.length > 0) {
    applyFoldersToIDB(folders).catch((e) =>
      console.warn("[SYNC] failed to apply folders to IDB", e)
    );
  }

  // Apply sukuyou rooms to IndexedDB with shallow merge
  if (sukuyouRooms.length > 0) {
    applySukuyouRoomsToIDB(sukuyouRooms).catch((e) =>
      console.warn("[SYNC] failed to apply sukuyou rooms to IDB", e)
    );
  }

  // Notify threads updated
  if (threads.length > 0) {
    try {
      window.dispatchEvent(new CustomEvent("tenmon:threads-updated"));
    } catch {
      // ignore
    }
  }
}

/* ── bulk push existing data ── */

/**
 * syncPushAllExistingData — 既存のローカルデータを一括でsync queueに登録してpush。
 * PCやスマホに既にあるトークルーム・フォルダー・宿曜鑑定結果を他デバイスと共有する。
 * 既存関数は一切変更せず、queueSyncChange + syncPush のみ使用。
 */
export async function syncPushAllExistingData(): Promise<{ threads: number; folders: number; rooms: number }> {
  let threadCount = 0;
  let folderCount = 0;
  let roomCount = 0;

  // 1. localStorage の threads meta を一括登録
  try {
    const userKey = localStorage.getItem("TENMON_USER_KEY") || localStorage.getItem("TENMON_PWA_USER_ID") || "";
    const metaKey = userKey
      ? `TENMON_PWA_THREADS_META_V1:${userKey}`
      : "TENMON_PWA_THREADS_META_V1";
    const raw = localStorage.getItem(metaKey);
    const map: Record<string, any> = raw ? JSON.parse(raw) : {};
    for (const [tid, meta] of Object.entries(map)) {
      if (!tid || !meta) continue;
      queueSyncChange({
        kind: "chat_thread_upsert",
        payload: {
          threadId: tid,
          title: (meta as any).title || "新規チャット",
          folderId: (meta as any).folderId ?? null,
          pinned: (meta as any).pinned ? 1 : 0,
          updatedAt: (meta as any).updatedAt
            ? new Date((meta as any).updatedAt).toISOString()
            : new Date().toISOString(),
          version: 1,
        },
      });
      threadCount++;
    }
  } catch (e) {
    console.warn("[SYNC] bulk threads queue failed", e);
  }

  // 2. IndexedDB の chat_folders を一括登録
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("tenmon_ark_pwa_v1", 4);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (db.objectStoreNames.contains("chat_folders")) {
      const tx = db.transaction(["chat_folders"], "readonly");
      const folders = await new Promise<any[]>((resolve, reject) => {
        const req = tx.objectStore("chat_folders").getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      });
      for (const f of folders) {
        if (!f || !f.id) continue;
        queueSyncChange({
          kind: "chat_folder_upsert",
          payload: {
            folderId: f.id,
            name: f.name || "",
            kind: f.kind || "chat",
            color: f.color ?? null,
            sortOrder: f.sortOrder ?? 0,
            isDefault: f.isDefault ? 1 : 0,
            updatedAt: f.updatedAt || new Date().toISOString(),
            version: 1,
          },
        });
        folderCount++;
      }
    }
    db.close();
  } catch (e) {
    console.warn("[SYNC] bulk folders queue failed", e);
  }

  // 3. IndexedDB の sukuyou_results を一括登録
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("tenmon_ark_pwa_v1", 4);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (db.objectStoreNames.contains("sukuyou_results")) {
      const tx = db.transaction(["sukuyou_results"], "readonly");
      const rooms = await new Promise<any[]>((resolve, reject) => {
        const req = tx.objectStore("sukuyou_results").getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      });
      for (const r of rooms) {
        if (!r || !r.id) continue;
        queueSyncChange({
          kind: "sukuyou_room_upsert",
          payload: {
            roomId: r.id,
            threadId: r.threadId ?? null,
            birthDate: r.birthDate || null,
            honmeiShuku: r.honmeiShuku || null,
            disasterType: r.disasterType || null,
            reversalAxis: r.reversalAxis || null,
            shortOracle: r.shortOracle || null,
            updatedAt: r.updatedAt || new Date().toISOString(),
            version: 1,
          },
        });
        roomCount++;
      }
    }
    db.close();
  } catch (e) {
    console.warn("[SYNC] bulk sukuyou queue failed", e);
  }

  // 4. 一括push
  await syncPush();

  console.log(`[SYNC] bulk push complete: ${threadCount} threads, ${folderCount} folders, ${roomCount} rooms`);
  return { threads: threadCount, folders: folderCount, rooms: roomCount };
}

/* ── periodic sync ── */

let pullInterval: ReturnType<typeof setInterval> | null = null;
const PULL_INTERVAL_MS = 15 * 1000; // 15 seconds — near-realtime sync

export function startPeriodicSync(): void {
  if (pullInterval) return;
  pullInterval = setInterval(async () => {
    // 定期sync: pending queue のみ push（軽量）→ pull
    // 全データ push は initSync（ログイン時）の1回のみ
    await syncPush().catch(() => {});
    await syncPull();
  }, PULL_INTERVAL_MS);
}

export function stopPeriodicSync(): void {
  if (pullInterval) {
    clearInterval(pullInterval);
    pullInterval = null;
  }
}

/**
 * initSync — login 直後に呼ぶ。
 * 1. bootstrap（サーバーから全データ取得）
 * 2. 既存ローカルデータを全自動push（ボタン不要）
 * 3. 定期同期開始（5分間隔）
 */
export async function initSync(): Promise<void> {
  try {
    // 1. サーバーから最新データを取得
    const bootstrapResult = await syncBootstrap();
    // 2. この端末の既存データを全てサーバーに送信（完全自動）
    await syncPushAllExistingData();
    // 3. 定期同期開始
    startPeriodicSync();
    console.log("[SYNC] initSync complete — full auto sync active");

    // 4. トースト通知: bootstrapで他デバイスのデータが取得できた場合のみ表示
    if (bootstrapResult?.ok) {
      const totalItems =
        (bootstrapResult.threads?.length || 0) +
        (bootstrapResult.folders?.length || 0) +
        (bootstrapResult.sukuyouRooms?.length || 0);
      if (totalItems > 0) {
        showSyncToast("他のデバイスのデータを同期しました");
      }
    }
  } catch (e) {
    console.warn("[SYNC] initSync failed", e);
  }
}

/**
 * 控えめなトースト通知を表示する。
 * 2.5秒で自動消去。ページロード時の初回のみ表示。
 */
function showSyncToast(message: string): void {
  try {
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(30, 30, 40, 0.92)",
      color: "#e0e0e0",
      padding: "10px 24px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "500",
      zIndex: "99999",
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      opacity: "0",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
    // fade in
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    // fade out and remove after 2.5s
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => { el.remove(); }, 400);
    }, 2500);
  } catch {
    // ignore — toast is non-critical
  }
}
