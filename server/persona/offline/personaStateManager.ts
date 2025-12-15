/**
 * ============================================================
 *  PERSONA STATE MANAGER — オフライン Persona 状態管理
 * ============================================================
 * 
 * オフライン時の Persona 状態を管理
 * ============================================================
 */

export interface PersonaState {
  id: string;
  name: string;
  tone: string;
  isLocked: boolean; // オフライン時は true
  lastUpdated: number;
  innerReflectionLog: Array<{
    timestamp: number;
    event: string;
    details?: any;
  }>;
}

export interface OfflinePersonaStorage {
  getCurrentPersona(): Promise<PersonaState | null>;
  savePersonaState(state: PersonaState): Promise<void>;
  logPersonaChange(event: string, details?: any): Promise<void>;
  getInnerReflectionLog(): Promise<PersonaState["innerReflectionLog"]>;
}

/**
 * IndexedDB を使用したローカル Persona ストレージ
 */
export class IndexedDBPersonaStorage implements OfflinePersonaStorage {
  private dbName = "tenmon_ark_persona";
  private storeName = "persona_state";
  private logStoreName = "inner_reflection_log";

  async getCurrentPersona(): Promise<PersonaState | null> {
    // IndexedDB から取得
    // 実際の実装では indexedDB を使用
    return null;
  }

  async savePersonaState(state: PersonaState): Promise<void> {
    // IndexedDB に保存
    // 実際の実装では indexedDB を使用
  }

  async logPersonaChange(event: string, details?: any): Promise<void> {
    const logEntry = {
      timestamp: Date.now(),
      event,
      details,
    };
    // IndexedDB にログを保存
    // 実際の実装では indexedDB を使用
  }

  async getInnerReflectionLog(): Promise<PersonaState["innerReflectionLog"]> {
    // IndexedDB からログを取得
    // 実際の実装では indexedDB を使用
    return [];
  }
}

/**
 * ファイルシステムを使用したローカル Persona ストレージ（Node.js 環境）
 */
export class FileSystemPersonaStorage implements OfflinePersonaStorage {
  private storagePath: string;

  constructor(storagePath: string = "./storage/persona") {
    this.storagePath = storagePath;
  }

  async getCurrentPersona(): Promise<PersonaState | null> {
    const fs = require("fs");
    const path = require("path");
    
    try {
      const filePath = path.join(this.storagePath, "current_persona.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading persona state:", error);
    }
    
    return null;
  }

  async savePersonaState(state: PersonaState): Promise<void> {
    const fs = require("fs");
    const path = require("path");
    
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }
      
      const filePath = path.join(this.storagePath, "current_persona.json");
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("Error saving persona state:", error);
      throw error;
    }
  }

  async logPersonaChange(event: string, details?: any): Promise<void> {
    const fs = require("fs");
    const path = require("path");
    
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }
      
      const logPath = path.join(this.storagePath, "inner_reflection_log.json");
      let logs: PersonaState["innerReflectionLog"] = [];
      
      if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, "utf-8");
        logs = JSON.parse(data);
      }
      
      logs.push({
        timestamp: Date.now(),
        event,
        details,
      });
      
      // 最新1000件のみ保持
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error("Error logging persona change:", error);
    }
  }

  async getInnerReflectionLog(): Promise<PersonaState["innerReflectionLog"]> {
    const fs = require("fs");
    const path = require("path");
    
    try {
      const logPath = path.join(this.storagePath, "inner_reflection_log.json");
      if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading inner reflection log:", error);
    }
    
    return [];
  }
}

/**
 * Persona State Manager
 */
export class PersonaStateManager {
  private storage: OfflinePersonaStorage;
  private isOffline: boolean = false;

  constructor(storage?: OfflinePersonaStorage) {
    // 環境に応じてストレージを選択
    if (typeof window !== "undefined") {
      // ブラウザ環境: IndexedDB
      this.storage = storage || new IndexedDBPersonaStorage();
    } else {
      // Node.js 環境: ファイルシステム
      this.storage = storage || new FileSystemPersonaStorage();
    }
  }

  /**
   * オフラインモードを設定
   */
  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  /**
   * 現在の Persona 状態を取得
   */
  async getCurrentPersona(): Promise<PersonaState | null> {
    return await this.storage.getCurrentPersona();
  }

  /**
   * Persona 状態を保存（オフライン時はロック）
   */
  async savePersonaState(state: PersonaState): Promise<void> {
    if (this.isOffline) {
      // オフライン時は新しい Persona の作成や Law の変更を禁止
      if (state.isLocked) {
        // 既存の Persona の更新のみ許可
        await this.storage.savePersonaState(state);
        await this.storage.logPersonaChange("persona_state_updated_offline", { stateId: state.id });
      } else {
        throw new Error("Cannot create new persona or change law in offline mode");
      }
    } else {
      await this.storage.savePersonaState(state);
    }
  }

  /**
   * Persona 変更をログに記録
   */
  async logPersonaChange(event: string, details?: any): Promise<void> {
    await this.storage.logPersonaChange(event, details);
  }

  /**
   * 内部反省ログを取得
   */
  async getInnerReflectionLog(): Promise<PersonaState["innerReflectionLog"]> {
    return await this.storage.getInnerReflectionLog();
  }
}

export default PersonaStateManager;

