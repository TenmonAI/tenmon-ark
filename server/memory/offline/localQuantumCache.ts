/**
 * ============================================================
 *  LOCAL QUANTUM CACHE — ローカル量子キャッシュ
 * ============================================================
 * 
 * オフライン時のローカル量子キャッシュ
 * ============================================================
 */

import type { FractalSeed } from "../../kokuzo/fractal/seedV2";

export interface CachedContext {
  seeds: FractalSeed[];
  recentConversations: Array<{
    id: string;
    message: string;
    response: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}

export interface LocalQuantumCacheStorage {
  saveContext(context: CachedContext): Promise<void>;
  getContext(): Promise<CachedContext | null>;
  clearContext(): Promise<void>;
}

/**
 * localStorage を使用したローカル量子キャッシュ（ブラウザ環境）
 */
export class LocalStorageQuantumCache implements LocalQuantumCacheStorage {
  private key = "tenmon_ark_quantum_cache";
  private maxSize: number = 10 * 1024 * 1024; // 10MB

  async saveContext(context: CachedContext): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const data = JSON.stringify(context);
      
      // サイズチェック
      if (data.length > this.maxSize) {
        // 古いデータを削除してサイズを調整
        await this.evictOldData(context);
      }
      
      localStorage.setItem(this.key, data);
    } catch (error) {
      console.error("Error saving quantum cache:", error);
      // localStorage が満杯の場合、古いデータを削除
      await this.evictOldData(context);
    }
  }

  async getContext(): Promise<CachedContext | null> {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const data = localStorage.getItem(this.key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading quantum cache:", error);
    }

    return null;
  }

  async clearContext(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(this.key);
  }

  /**
   * 古いデータを削除してサイズを調整
   */
  private async evictOldData(context: CachedContext): Promise<void> {
    // 古い会話を削除（最新100件のみ保持）
    if (context.recentConversations.length > 100) {
      context.recentConversations = context.recentConversations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    }

    // 重要度の低い Seed を削除（最新50件のみ保持）
    if (context.seeds.length > 50) {
      context.seeds = context.seeds
        .sort((a, b) => (b.seedWeight || 0) - (a.seedWeight || 0))
        .slice(0, 50);
    }
  }
}

/**
 * ファイルシステムを使用したローカル量子キャッシュ（Node.js 環境）
 */
export class FileSystemQuantumCache implements LocalQuantumCacheStorage {
  private cachePath: string;
  private maxSize: number = 10 * 1024 * 1024; // 10MB

  constructor(cachePath: string = "./storage/quantum_cache.json") {
    this.cachePath = cachePath;
  }

  async saveContext(context: CachedContext): Promise<void> {
    const fs = require("fs");
    const path = require("path");

    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = JSON.stringify(context, null, 2);
      
      // サイズチェック
      if (data.length > this.maxSize) {
        // 古いデータを削除してサイズを調整
        await this.evictOldData(context);
      }

      fs.writeFileSync(this.cachePath, data);
    } catch (error) {
      console.error("Error saving quantum cache:", error);
      throw error;
    }
  }

  async getContext(): Promise<CachedContext | null> {
    const fs = require("fs");

    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading quantum cache:", error);
    }

    return null;
  }

  async clearContext(): Promise<void> {
    const fs = require("fs");

    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
      }
    } catch (error) {
      console.error("Error clearing quantum cache:", error);
    }
  }

  /**
   * 古いデータを削除してサイズを調整
   */
  private async evictOldData(context: CachedContext): Promise<void> {
    // 古い会話を削除（最新100件のみ保持）
    if (context.recentConversations.length > 100) {
      context.recentConversations = context.recentConversations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    }

    // 重要度の低い Seed を削除（最新50件のみ保持）
    if (context.seeds.length > 50) {
      context.seeds = context.seeds
        .sort((a, b) => (b.seedWeight || 0) - (a.seedWeight || 0))
        .slice(0, 50);
    }
  }
}

/**
 * ローカル量子キャッシュ
 */
export class LocalQuantumCache {
  private storage: LocalQuantumCacheStorage;
  private evictionPolicy: {
    maxConversations: number;
    maxSeeds: number;
    maxAge: number; // ミリ秒
  };

  constructor(storage?: LocalQuantumCacheStorage) {
    // 環境に応じてストレージを選択
    if (typeof window !== "undefined") {
      // ブラウザ環境: localStorage
      this.storage = storage || new LocalStorageQuantumCache();
    } else {
      // Node.js 環境: ファイルシステム
      this.storage = storage || new FileSystemQuantumCache();
    }

    this.evictionPolicy = {
      maxConversations: 100,
      maxSeeds: 50,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
    };
  }

  /**
   * 最近の Seed とコンテキストを保存
   */
  async storeRecentSeedsAndContext(
    seeds: FractalSeed[],
    conversations: Array<{
      id: string;
      message: string;
      response: string;
      timestamp: number;
    }>
  ): Promise<void> {
    const context: CachedContext = {
      seeds,
      recentConversations: conversations,
      lastUpdated: Date.now(),
    };

    await this.storage.saveContext(context);
  }

  /**
   * 現在のコンテキストを取得（オフライン チャット用）
   */
  async getCurrentContext(): Promise<CachedContext | null> {
    const context = await this.storage.getContext();
    
    if (!context) {
      return null;
    }

    // 古いデータを削除
    const now = Date.now();
    context.recentConversations = context.recentConversations.filter(
      (conv) => now - conv.timestamp < this.evictionPolicy.maxAge
    );

    // サイズ制限を適用
    if (context.recentConversations.length > this.evictionPolicy.maxConversations) {
      context.recentConversations = context.recentConversations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.evictionPolicy.maxConversations);
    }

    if (context.seeds.length > this.evictionPolicy.maxSeeds) {
      context.seeds = context.seeds
        .sort((a, b) => (b.seedWeight || 0) - (a.seedWeight || 0))
        .slice(0, this.evictionPolicy.maxSeeds);
    }

    return context;
  }

  /**
   * キャッシュをクリア
   */
  async clearCache(): Promise<void> {
    await this.storage.clearContext();
  }

  /**
   * 電源サイクル後のコンテキスト生存テスト
   */
  async testPowerCycleAndContextSurvival(): Promise<boolean> {
    const testContext: CachedContext = {
      seeds: [],
      recentConversations: [
        {
          id: "test-1",
          message: "Test message",
          response: "Test response",
          timestamp: Date.now(),
        },
      ],
      lastUpdated: Date.now(),
    };

    await this.storage.saveContext(testContext);
    const retrieved = await this.storage.getContext();

    return retrieved !== null && retrieved.recentConversations.length > 0;
  }
}

export default LocalQuantumCache;

