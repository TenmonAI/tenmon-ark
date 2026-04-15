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
export async function syncPush(): Promise<PushResponse | null> {
  const pending = getPendingChanges();
  if (pending.length === 0) return null;

  try {
    const deviceId = getDeviceId();
    const data = await fetchJson<PushResponse>(
      `${API_BASE}/sync/push`,
      {
        method: "POST",
        body: JSON.stringify({ deviceId, changes: pending }),
      }
    );
    if (data.ok) {
      // clear pushed changes
      setPendingChanges([]);
    }
    return data;
  } catch (e) {
    console.warn("[SYNC] push failed", e);
    return null;
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
    const userKey = localStorage.getItem("TENMON_PWA_USER_ID") || "";
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

  // Apply folders to IndexedDB (dispatches event for sidebar refresh)
  if (folders.length > 0) {
    try {
      // We dispatch the event so the sidebar picks up changes
      window.dispatchEvent(new CustomEvent("tenmon:folders-updated"));
    } catch {
      // ignore
    }
  }

  // Apply sukuyou rooms (dispatch event)
  if (sukuyouRooms.length > 0) {
    try {
      window.dispatchEvent(new CustomEvent("tenmon:sukuyou-updated"));
    } catch {
      // ignore
    }
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

/* ── periodic sync ── */

let pullInterval: ReturnType<typeof setInterval> | null = null;
const PULL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startPeriodicSync(): void {
  if (pullInterval) return;
  pullInterval = setInterval(async () => {
    await syncPush();
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
 * initSync — login 直後に呼ぶ。bootstrap → push pending → start periodic。
 */
export async function initSync(): Promise<void> {
  try {
    await syncBootstrap();
    await syncPush();
    startPeriodicSync();
  } catch (e) {
    console.warn("[SYNC] initSync failed", e);
  }
}
