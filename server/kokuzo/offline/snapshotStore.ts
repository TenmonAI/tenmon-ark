/**
 * ============================================================
 *  SNAPSHOT STORE — Snapshot Engine
 * ============================================================
 * 
 * Kokūzō Kernel の状態をスナップショットとして保存
 * ============================================================
 */

import type { KzEvent } from "./eventLogStore";

export interface KzSnapshot {
  id: string;
  lamport: number; // このスナップショットの Lamport timestamp
  timestamp: number;
  kernelState: {
    seedTree: any;
    quantumState: any;
    reishoSignature: any;
    memoryContext: any;
  };
  hash: string; // スナップショットの整合性チェック用
}

export interface SnapshotStore {
  save(snapshot: KzSnapshot): Promise<void>;
  loadLatest(): Promise<KzSnapshot | null>;
  loadByLamport(lamport: number): Promise<KzSnapshot | null>;
  deleteOlderThan(lamport: number): Promise<void>;
}

/**
 * IndexedDB を使用した Snapshot Store（ブラウザ環境）
 */
export class IndexedDBSnapshotStore implements SnapshotStore {
  private dbName = "tenmon_ark_snapshots";
  private storeName = "snapshots";
  private memoryStore: KzSnapshot[] = [];

  async save(snapshot: KzSnapshot): Promise<void> {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        await this.saveToIndexedDB(snapshot);
      } else {
        // Node.js 環境: メモリに保存
        this.memoryStore.push(snapshot);
      }
      console.log("[KOKUZO][SNAPSHOT] Snapshot saved:", snapshot.lamport);
    } catch (error) {
      console.error("[KOKUZO][SNAPSHOT] Failed to save snapshot:", error);
      // フォールバック: メモリに保存
      this.memoryStore.push(snapshot);
    }
  }

  private async saveToIndexedDB(snapshot: KzSnapshot): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const addRequest = store.add(snapshot);
        
        addRequest.onerror = () => reject(addRequest.error);
        addRequest.onsuccess = () => resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("lamport", "lamport", { unique: false });
        }
      };
    });
  }

  async loadLatest(): Promise<KzSnapshot | null> {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        return await this.queryIndexedDBLatest();
      } else {
        // Node.js 環境: メモリから取得
        if (this.memoryStore.length === 0) {
          return null;
        }
        return this.memoryStore.sort((a, b) => b.lamport - a.lamport)[0];
      }
    } catch (error) {
      console.error("[KOKUZO][SNAPSHOT] Failed to load latest snapshot:", error);
      return null;
    }
  }

  private async queryIndexedDBLatest(): Promise<KzSnapshot | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const index = store.index("lamport");
        const getAllRequest = index.getAll();
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
          const snapshots = getAllRequest.result || [];
          if (snapshots.length === 0) {
            resolve(null);
          } else {
            const latest = snapshots.sort((a, b) => b.lamport - a.lamport)[0];
            resolve(latest);
          }
        };
      };
    });
  }

  async loadByLamport(lamport: number): Promise<KzSnapshot | null> {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        return await this.queryIndexedDBByLamport(lamport);
      } else {
        // Node.js 環境: メモリから取得
        return this.memoryStore.find((s) => s.lamport === lamport) || null;
      }
    } catch (error) {
      console.error("[KOKUZO][SNAPSHOT] Failed to load snapshot by lamport:", error);
      return null;
    }
  }

  private async queryIndexedDBByLamport(lamport: number): Promise<KzSnapshot | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const index = store.index("lamport");
        const getRequest = index.get(lamport);
        
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
      };
    });
  }

  async deleteOlderThan(lamport: number): Promise<void> {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        await this.deleteFromIndexedDB(lamport);
      } else {
        // Node.js 環境: メモリから削除
        this.memoryStore = this.memoryStore.filter((s) => s.lamport >= lamport);
      }
    } catch (error) {
      console.error("[KOKUZO][SNAPSHOT] Failed to delete old snapshots:", error);
    }
  }

  private async deleteFromIndexedDB(lamport: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const index = store.index("lamport");
        const range = IDBKeyRange.upperBound(lamport, true);
        const getAllRequest = index.getAll(range);
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
          const snapshots = getAllRequest.result || [];
          const deletePromises = snapshots.map((s) => {
            return new Promise<void>((resolve, reject) => {
              const deleteRequest = store.delete(s.id);
              deleteRequest.onerror = () => reject(deleteRequest.error);
              deleteRequest.onsuccess = () => resolve();
            });
          });
          Promise.all(deletePromises).then(() => resolve()).catch(reject);
        };
      };
    });
  }
}

/**
 * ファイルシステムを使用した Snapshot Store（Node.js 環境）
 */
export class FileSystemSnapshotStore implements SnapshotStore {
  private storagePath: string;

  constructor(storagePath: string = "./storage/snapshots") {
    this.storagePath = storagePath;
  }

  async save(snapshot: KzSnapshot): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      const filePath = path.join(this.storagePath, `snapshot-${snapshot.lamport}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      console.error("Error saving snapshot:", error);
      throw error;
    }
  }

  async loadLatest(): Promise<KzSnapshot | null> {
    const fs = require("fs");
    const path = require("path");

    try {
      if (!fs.existsSync(this.storagePath)) {
        return null;
      }

      const files = fs.readdirSync(this.storagePath)
        .filter((f: string) => f.startsWith("snapshot-") && f.endsWith(".json"))
        .map((f: string) => {
          const match = f.match(/snapshot-(\d+)\.json/);
          return match ? { file: f, lamport: parseInt(match[1], 10) } : null;
        })
        .filter((f: any) => f !== null)
        .sort((a: any, b: any) => b.lamport - a.lamport);

      if (files.length === 0) {
        return null;
      }

      const latestFile = files[0];
      const filePath = path.join(this.storagePath, latestFile.file);
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading latest snapshot:", error);
      return null;
    }
  }

  async loadByLamport(lamport: number): Promise<KzSnapshot | null> {
    const fs = require("fs");
    const path = require("path");

    try {
      const filePath = path.join(this.storagePath, `snapshot-${lamport}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading snapshot by lamport:", error);
    }

    return null;
  }

  async deleteOlderThan(lamport: number): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      if (!fs.existsSync(this.storagePath)) {
        return;
      }

      const files = fs.readdirSync(this.storagePath)
        .filter((f: string) => f.startsWith("snapshot-") && f.endsWith(".json"));

      for (const file of files) {
        const match = file.match(/snapshot-(\d+)\.json/);
        if (match) {
          const fileLamport = parseInt(match[1], 10);
          if (fileLamport < lamport) {
            const filePath = path.join(this.storagePath, file);
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting old snapshots:", error);
    }
  }
}

/**
 * Snapshot Store ファクトリー
 */
export function createSnapshotStore(): SnapshotStore {
  if (typeof window !== "undefined") {
    return new IndexedDBSnapshotStore();
  } else {
    return new FileSystemSnapshotStore();
  }
}

/**
 * スナップショットを生成
 */
export async function createSnapshot(
  lamport: number,
  kernelState: KzSnapshot["kernelState"]
): Promise<KzSnapshot> {
  const crypto = require("crypto");
  
  const snapshot: Omit<KzSnapshot, "hash"> = {
    id: `snapshot-${lamport}-${Date.now()}`,
    lamport,
    timestamp: Date.now(),
    kernelState,
  };

  const hash = crypto.createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");

  return {
    ...snapshot,
    hash,
  };
}

export default {
  createSnapshotStore,
  createSnapshot,
  IndexedDBSnapshotStore,
  FileSystemSnapshotStore,
};

