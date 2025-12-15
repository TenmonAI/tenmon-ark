/**
 * ============================================================
 *  SYNC DIFF CONTROLLER — 同期差分コントローラー
 * ============================================================
 * 
 * オフライン時の変更を記録し、オンライン復帰時に同期
 * ============================================================
 */

export interface OfflineEvent {
  type: "innerReflectionLog" | "newLocalSemanticUnit" | "newLocalSeed" | "personaChange" | "learningLog";
  timestamp: number;
  data: any;
}

export interface LearningLogEntry {
  concept: string;
  semanticUnitStub: {
    id: string;
    text: string;
    tags?: string[];
  };
  offlineOrigin: boolean;
  timestamp: number;
}

export interface DiffPayload {
  userId: string;
  offlineEvents: OfflineEvent[];
  localSemanticUnits: Array<{
    id: string;
    text: string;
    metadata?: any;
  }>;
  localSeeds: Array<{
    id: string;
    semanticUnitIds: string[];
    compressedRepresentation: any;
  }>;
  syncTimestamp: number;
}

export interface SyncDiffStorage {
  logOfflineEvent(event: OfflineEvent): Promise<void>;
  getOfflineEvents(): Promise<OfflineEvent[]>;
  clearOfflineEvents(): Promise<void>;
  saveDiffPayload(payload: DiffPayload): Promise<void>;
  getDiffPayload(): Promise<DiffPayload | null>;
}

/**
 * IndexedDB を使用した同期差分ストレージ（ブラウザ環境）
 */
export class IndexedDBSyncDiffStorage implements SyncDiffStorage {
  private dbName = "tenmon_ark_sync_diff";
  private eventStoreName = "offline_events";
  private payloadStoreName = "diff_payloads";
  private dbVersion = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available"));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;

        // Offline Events ストア
        if (!db.objectStoreNames.contains(this.eventStoreName)) {
          const eventStore = db.createObjectStore(this.eventStoreName, { keyPath: "timestamp", autoIncrement: false });
          eventStore.createIndex("type", "type", { unique: false });
          eventStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Diff Payloads ストア
        if (!db.objectStoreNames.contains(this.payloadStoreName)) {
          const payloadStore = db.createObjectStore(this.payloadStoreName, { keyPath: "syncTimestamp" });
          payloadStore.createIndex("userId", "userId", { unique: false });
        }
      };
    });
  }

  async logOfflineEvent(event: OfflineEvent): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.eventStoreName], "readwrite");
      const store = transaction.objectStore(this.eventStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.add(event);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SYNC] Failed to log offline event:", error);
      throw error;
    }
  }

  async getOfflineEvents(): Promise<OfflineEvent[]> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return [];
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.eventStoreName], "readonly");
      const store = transaction.objectStore(this.eventStoreName);
      return await new Promise<OfflineEvent[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const events = request.result || [];
          const sorted = events.sort((a, b) => a.timestamp - b.timestamp);
          resolve(sorted);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SYNC] Failed to get offline events:", error);
      return [];
    }
  }

  async clearOfflineEvents(): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.eventStoreName], "readwrite");
      const store = transaction.objectStore(this.eventStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SYNC] Failed to clear offline events:", error);
      throw error;
    }
  }

  async saveDiffPayload(payload: DiffPayload): Promise<void> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.payloadStoreName], "readwrite");
      const store = transaction.objectStore(this.payloadStoreName);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(payload);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SYNC] Failed to save diff payload:", error);
      throw error;
    }
  }

  async getDiffPayload(): Promise<DiffPayload | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.payloadStoreName], "readonly");
      const store = transaction.objectStore(this.payloadStoreName);
      const index = store.index("syncTimestamp");
      return await new Promise<DiffPayload | null>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const payloads = request.result || [];
          if (payloads.length === 0) {
            resolve(null);
          } else {
            // 最新のペイロードを返す
            const latest = payloads.sort((a, b) => b.syncTimestamp - a.syncTimestamp)[0];
            resolve(latest);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[SYNC] Failed to get diff payload:", error);
      return null;
    }
  }
}

/**
 * ファイルシステムを使用した同期差分ストレージ（Node.js 環境）
 */
export class FileSystemSyncDiffStorage implements SyncDiffStorage {
  private storagePath: string;

  constructor(storagePath: string = "./storage/sync_diff") {
    this.storagePath = storagePath;
  }

  async logOfflineEvent(event: OfflineEvent): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      const eventsPath = path.join(this.storagePath, "offline_events.json");
      let events: OfflineEvent[] = [];

      if (fs.existsSync(eventsPath)) {
        const data = fs.readFileSync(eventsPath, "utf-8");
        events = JSON.parse(data);
      }

      events.push(event);

      // 最新1000件のみ保持
      if (events.length > 1000) {
        events = events.slice(-1000);
      }

      fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    } catch (error) {
      console.error("Error logging offline event:", error);
    }
  }

  async getOfflineEvents(): Promise<OfflineEvent[]> {
    const fs = require("fs");
    const path = require("path");

    try {
      const eventsPath = path.join(this.storagePath, "offline_events.json");
      if (fs.existsSync(eventsPath)) {
        const data = fs.readFileSync(eventsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading offline events:", error);
    }

    return [];
  }

  async clearOfflineEvents(): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      const eventsPath = path.join(this.storagePath, "offline_events.json");
      if (fs.existsSync(eventsPath)) {
        fs.unlinkSync(eventsPath);
      }
    } catch (error) {
      console.error("Error clearing offline events:", error);
    }
  }

  async saveDiffPayload(payload: DiffPayload): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      const payloadPath = path.join(this.storagePath, "diff_payload.json");
      fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error("Error saving diff payload:", error);
      throw error;
    }
  }

  async getDiffPayload(): Promise<DiffPayload | null> {
    const fs = require("fs");
    const path = require("path");

    try {
      const payloadPath = path.join(this.storagePath, "diff_payload.json");
      if (fs.existsSync(payloadPath)) {
        const data = fs.readFileSync(payloadPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading diff payload:", error);
    }

    return null;
  }
}

/**
 * 同期差分コントローラー
 */
export class SyncDiffController {
  private storage: SyncDiffStorage;
  private userId: string;
  private isOffline: boolean = false;

  constructor(userId: string, storage?: SyncDiffStorage) {
    this.userId = userId;
    
    // 環境に応じてストレージを選択
    if (typeof window !== "undefined") {
      // ブラウザ環境: IndexedDB
      this.storage = storage || new IndexedDBSyncDiffStorage();
    } else {
      // Node.js 環境: ファイルシステム
      this.storage = storage || new FileSystemSyncDiffStorage();
    }
  }

  /**
   * オフラインモードを設定
   */
  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  /**
   * オフラインイベントをログに記録
   */
  async logOfflineEvent(
    type: OfflineEvent["type"],
    data: any
  ): Promise<void> {
    const event: OfflineEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    await this.storage.logOfflineEvent(event);
  }

  /**
   * 学習ログを記録（新しい概念を SemanticUnit スタブとして）
   */
  async logLearningLog(entry: LearningLogEntry): Promise<void> {
    const event: OfflineEvent = {
      type: "learningLog",
      timestamp: entry.timestamp,
      data: entry,
    };

    await this.storage.logOfflineEvent(event);
  }

  /**
   * 学習ログを取得
   */
  async getLearningLogs(): Promise<LearningLogEntry[]> {
    const events = await this.getOfflineEvents();
    return events
      .filter((e) => e.type === "learningLog")
      .map((e) => e.data as LearningLogEntry);
  }

  /**
   * オフラインイベントを取得
   */
  async getOfflineEvents(): Promise<OfflineEvent[]> {
    return await this.storage.getOfflineEvents();
  }

  /**
   * 差分ペイロードを生成
   */
  async generateDiffPayload(
    localSemanticUnits: any[],
    localSeeds: any[]
  ): Promise<DiffPayload> {
    const offlineEvents = await this.getOfflineEvents();

    const payload: DiffPayload = {
      userId: this.userId,
      offlineEvents,
      localSemanticUnits: localSemanticUnits.map((unit) => ({
        id: unit.id,
        text: unit.text,
        metadata: unit.metadata,
      })),
      localSeeds: localSeeds.map((seed) => ({
        id: seed.id,
        semanticUnitIds: seed.semanticUnitIds,
        compressedRepresentation: seed.compressedRepresentation,
      })),
      syncTimestamp: Date.now(),
    };

    await this.storage.saveDiffPayload(payload);
    return payload;
  }

  /**
   * オンライン復帰時のフック（差分を送信）
   */
  async onReconnect(): Promise<void> {
    const payload = await this.storage.getDiffPayload();
    
    if (!payload) {
      return;
    }

    // サーバーに差分を送信
    try {
      await this.sendDiffToServer(payload);
      
      // 送信成功後、オフラインイベントをクリア
      await this.storage.clearOfflineEvents();
    } catch (error) {
      console.error("Error sending diff to server:", error);
      throw error;
    }
  }

  /**
   * サーバーに差分を送信
   */
  private async sendDiffToServer(payload: DiffPayload): Promise<void> {
    // クライアント側（ブラウザ環境）の場合
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/trpc/offlineSync.syncDiff", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            json: payload,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to send diff to server: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(`Server error: ${result.error.message || "Unknown error"}`);
        }

        console.log("[SYNC] Diff sent successfully:", result);
      } catch (error) {
        console.error("[SYNC] Failed to send diff to server:", error);
        throw error;
      }
    } else {
      // サーバー側（Node.js環境）の場合
      // 直接 offlineSyncRouter の関数を呼び出すか、内部APIを使用
      // この場合は、サーバー側で使用する場合は別の方法を検討する必要があります
      console.warn("[SYNC] sendDiffToServer called in server-side context. This should be handled differently.");
      throw new Error("sendDiffToServer should not be called in server-side context. Use direct function calls instead.");
    }
  }
}

export default SyncDiffController;

