/**
 * Minimal IndexedDB exporter for Tenmon-Ark P1-1.
 * - Exposes: window.tenmonExportIDB(dbName, outFileName?)
 * - Dumps all object stores (best-effort) into a JSON blob and triggers download.
 *
 * Note: If the DB schema is large, this is a best-effort dev tool.
 */
type AnyRec = Record<string, any>;

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openDB(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dumpStore(tx: IDBTransaction, storeName: string): Promise<AnyRec[]> {
  const store = tx.objectStore(storeName);
  // getAll is supported in modern browsers
  const req = store.getAll();
  const rows = await reqToPromise(req);
  return (rows as AnyRec[]) ?? [];
}

function downloadJSON(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function tenmonExportIDB(dbName: string, outFileName?: string) {
  const db = await openDB(dbName);
  try {
    const stores = Array.from(db.objectStoreNames);
    const tx = db.transaction(stores, "readonly");
    const data: Record<string, AnyRec[]> = {};
    for (const s of stores) data[s] = await dumpStore(tx, s);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      dbName,
      stores,
      data,
    };

    downloadJSON(payload, outFileName ?? `tenmon_idb_${dbName}_${Date.now()}.json`);
    return { ok: true, dbName, storesCount: stores.length };
  } finally {
    db.close();
  }
}

// attach to window for terminal-only workflow
declare global {
  interface Window {
    tenmonExportIDB?: (dbName: string, outFileName?: string) => Promise<any>;
  }
}

export function installTenmonIDBExportHook() {
  if (typeof window !== "undefined") {
    window.tenmonExportIDB = tenmonExportIDB;
  }
}
