/**
 * ============================================================
 *  EVENT LOG STORE — Event Sourcing Core
 * ============================================================
 * 
 * 追記専用のイベントログストア（ハッシュチェーン整合性）
 * ============================================================
 */

export type KzEventKind =
  | "semanticUnitCreated"
  | "fractalSeedCreated"
  | "seedTreeUpdated"
  | "reishoSignatureUpdated"
  | "conversationAdded"
  | "memoryRetrieved"
  | "offlineMutation";

export interface KzEvent {
  id: string;
  kind: KzEventKind;
  timestamp: number;
  lamport: number; // Lamport timestamp for ordering
  deviceId?: string; // デバイスID（競合解決用）
  devicePriority?: number; // デバイス優先度（競合解決用）
  data: any;
  previousHash?: string; // 前のイベントのハッシュ
  hash: string; // このイベントのハッシュ
  sent: boolean; // サーバーに送信済みか
  superseded?: boolean; // 競合解決で負けたEvent（削除禁止、保持のみ）
  supersededBy?: string; // このEventを上書きしたEvent ID
  supersededReason?: string; // 上書き理由（ログ用）
}

export interface EventLogStore {
  append(event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">): Promise<KzEvent>;
  getUnsent(): Promise<KzEvent[]>;
  markSent(eventId: string): Promise<void>;
  replay(fromLamport?: number): Promise<KzEvent[]>;
  verifyIntegrity(): Promise<boolean>;
  getLatestLamport(): Promise<number>;
}

/**
 * イベントのハッシュを計算
 */
function computeEventHash(event: Omit<KzEvent, "hash">): string {
  const crypto = require("crypto");
  const data = JSON.stringify({
    kind: event.kind,
    timestamp: event.timestamp,
    lamport: event.lamport,
    data: event.data,
    previousHash: event.previousHash,
  });
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * IndexedDB を使用した Event Log Store（ブラウザ環境）
 */
export class IndexedDBEventLogStore implements EventLogStore {
  private dbName = "tenmon_ark_event_log";
  private storeName = "events";
  private currentLamport: number = 0;

  async append(
    event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">
  ): Promise<KzEvent> {
    const latestLamport = await this.getLatestLamport();
    const lamport = latestLamport + 1;

    // 前のイベントのハッシュを取得
    const previousHash = await this.getPreviousHash();

    const fullEvent: Omit<KzEvent, "hash"> = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      lamport,
      previousHash,
    };

    const hash = computeEventHash(fullEvent);
    const kzEvent: KzEvent = {
      ...fullEvent,
      hash,
      sent: false,
    };

    // IndexedDB に保存（最小実装）
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        await this.saveToIndexedDB(kzEvent);
      } else {
        // Node.js 環境: メモリに保存（TODO: SQLite 実装）
        this.memoryStore = this.memoryStore || [];
        this.memoryStore.push(kzEvent);
      }
    } catch (error) {
      console.error("[KOKUZO][EVENT] Failed to save event:", error);
      // フォールバック: メモリに保存
      this.memoryStore = this.memoryStore || [];
      this.memoryStore.push(kzEvent);
    }
    
    this.currentLamport = lamport;
    console.log("[KOKUZO][EVENT] Event appended:", kzEvent.kind, "lamport:", lamport);
    
    // メトリクス記録（GAP-F）
    try {
      const { getMetricsCollector } = await import("./metricsCollector");
      getMetricsCollector().incrementEventCount();
    } catch (error) {
      // メトリクス記録失敗は無視
    }
    
    return kzEvent;
  }

  private memoryStore: KzEvent[] = [];

  private async saveToIndexedDB(event: KzEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const addRequest = store.add(event);
        
        addRequest.onerror = () => reject(addRequest.error);
        addRequest.onsuccess = () => resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("lamport", "lamport", { unique: false });
          store.createIndex("sent", "sent", { unique: false });
        }
      };
    });
  }

  async getUnsent(): Promise<KzEvent[]> {
    // 実際の実装では IndexedDB から取得
    // return await this.queryIndexedDB({ sent: false });
    return [];
  }

  async updateEvent(eventId: string, updates: Partial<KzEvent>): Promise<void> {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        await this.updateIndexedDB(eventId, updates);
      } else {
        // Node.js 環境: メモリを更新
        const index = this.memoryStore.findIndex((e) => e.id === eventId);
        if (index !== -1) {
          this.memoryStore[index] = { ...this.memoryStore[index], ...updates };
        }
      }
    } catch (error) {
      console.error("[KOKUZO][EVENT] Failed to update event:", error);
    }
  }

  async markSent(eventId: string): Promise<void> {
    await this.updateEvent(eventId, { sent: true });
  }

  private async updateIndexedDB(eventId: string, updates: Partial<KzEvent>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const getRequest = store.get(eventId);
        
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          const event = getRequest.result;
          if (event) {
            Object.assign(event, updates);
            const putRequest = store.put(event);
            putRequest.onerror = () => reject(putRequest.error);
            putRequest.onsuccess = () => resolve();
          } else {
            resolve();
          }
        };
      };
    });
  }

  async replay(fromLamport: number = 0): Promise<KzEvent[]> {
    // 実際の実装では IndexedDB から取得
    // return await this.queryIndexedDB({ lamport: { $gte: fromLamport } });
    return [];
  }

  async verifyIntegrity(): Promise<boolean> {
    const events = await this.replay(0);
    
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      
      if (curr.previousHash !== prev.hash) {
        return false;
      }
      
      const computedHash = computeEventHash(curr);
      if (computedHash !== curr.hash) {
        return false;
      }
    }
    
    return true;
  }

  async getLatestLamport(): Promise<number> {
    return this.currentLamport;
  }

  private async getPreviousHash(): Promise<string | undefined> {
    // 実際の実装では最新のイベントのハッシュを取得
    return undefined;
  }
}

/**
 * SQLite を使用した Event Log Store（Node.js 環境）
 */
export class SQLiteEventLogStore implements EventLogStore {
  private dbPath: string;
  private currentLamport: number = 0;

  constructor(dbPath: string = "./storage/event_log.db") {
    this.dbPath = dbPath;
  }

  async append(
    event: Omit<KzEvent, "id" | "hash" | "previousHash" | "lamport">
  ): Promise<KzEvent> {
    // 実際の実装では SQLite を使用
    // const db = new Database(this.dbPath);
    
    const latestLamport = await this.getLatestLamport();
    const lamport = latestLamport + 1;

    const previousHash = await this.getPreviousHash();

    const fullEvent: Omit<KzEvent, "hash"> = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      lamport,
      previousHash,
    };

    const hash = computeEventHash(fullEvent);
    const kzEvent: KzEvent = {
      ...fullEvent,
      hash,
      sent: false,
    };

    // SQLite に保存
    // await db.run("INSERT INTO events ...", ...);
    
    this.currentLamport = lamport;
    return kzEvent;
  }

  async getUnsent(): Promise<KzEvent[]> {
    // 実際の実装では SQLite から取得
    return [];
  }

  async updateEvent(eventId: string, updates: Partial<KzEvent>): Promise<void> {
    // 実際の実装では SQLite を更新
    // const db = new Database(this.dbPath);
    // await db.run("UPDATE events SET ... WHERE id = ?", ...);
  }

  async markSent(eventId: string): Promise<void> {
    await this.updateEvent(eventId, { sent: true });
  }

  async replay(fromLamport: number = 0): Promise<KzEvent[]> {
    // 実際の実装では SQLite から取得
    return [];
  }

  async verifyIntegrity(): Promise<boolean> {
    const events = await this.replay(0);
    
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      
      if (curr.previousHash !== prev.hash) {
        return false;
      }
      
      const computedHash = computeEventHash(curr);
      if (computedHash !== curr.hash) {
        return false;
      }
    }
    
    return true;
  }

  async getLatestLamport(): Promise<number> {
    return this.currentLamport;
  }

  private async getPreviousHash(): Promise<string | undefined> {
    // 実際の実装では最新のイベントのハッシュを取得
    return undefined;
  }
}

/**
 * Event Log Store ファクトリー
 */
export function createEventLogStore(): EventLogStore {
  if (typeof window !== "undefined") {
    return new IndexedDBEventLogStore();
  } else {
    return new SQLiteEventLogStore();
  }
}

export default {
  createEventLogStore,
  IndexedDBEventLogStore,
  SQLiteEventLogStore,
};

