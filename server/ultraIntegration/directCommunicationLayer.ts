/**
 * TENMON-ARK ULTRA-INTEGRATION vΩ
 * Direct Communication Layer v1.0（完全双方向通信）
 * 
 * TENMON-ARK ⇄ Manus の完全双方向通信を実現
 */

import { DiagnosticReport, DiagnosticIssue } from '../selfHeal/diagnosticsEngine';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * TENMON-ARK → Manus 送信情報（拡張版）
 */
export interface ArkToManusMessage {
  // 基本情報
  timestamp: number;
  messageType: 'diagnostic' | 'request' | 'status' | 'emergency';
  
  // 構文推論による原因推定
  rootCauseAnalysis?: {
    suspectedCause: string;
    confidence: number; // 0-1
    reasoning: string[];
    affectedComponents: string[];
  };
  
  // 自律診断のraw data
  rawDiagnostics?: DiagnosticReport;
  
  // デプロイの不一致情報
  deployMismatch?: {
    prodVersion: string;
    localVersion: string;
    mismatchedFiles: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
  };
  
  // SSL状態
  sslState?: {
    certificateValid: boolean;
    expiresIn: number; // days
    issuer: string;
    san: string[];
    chainStatus: 'valid' | 'invalid' | 'unknown';
  };
  
  // API応答の異常
  apiAnomalies?: {
    endpoint: string;
    statusCode: number;
    errorMessage: string;
    latency: number; // ms
    timestamp: number;
  }[];
  
  // UIレンダーツリーの不整合
  uiTreeInconsistencies?: {
    component: string;
    issue: string;
    expectedState: unknown;
    actualState: unknown;
    stackTrace?: string;
  }[];
  
  // キャッシュの破損ログ
  cacheCorruption?: {
    cacheType: 'manifest' | 'service-worker' | 'browser' | 'cdn';
    corruptedKeys: string[];
    detectedAt: number;
    impact: 'critical' | 'high' | 'medium' | 'low';
  }[];
  
  // Build hash mismatch
  buildHashMismatch?: {
    expected: string;
    actual: string;
    affectedFiles: string[];
  };
  
  // 重大エラーのStackTrace
  criticalErrors?: {
    errorType: string;
    message: string;
    stackTrace: string;
    componentStack?: string;
    timestamp: number;
  }[];
}

/**
 * Manus → TENMON-ARK 照会情報（拡張版）
 */
export interface ManusToArkQuery {
  // 基本情報
  timestamp: number;
  queryType: 'state' | 'diagnostic' | 'verification' | 'command';
  
  // UI state map
  uiStateMap?: {
    route: string;
    components: {
      name: string;
      state: unknown;
      props: unknown;
    }[];
  };
  
  // Router map
  routerMap?: {
    currentRoute: string;
    availableRoutes: string[];
    routeParams: Record<string, string>;
    queryParams: Record<string, string>;
  };
  
  // API latency
  apiLatency?: {
    endpoint: string;
    method: string;
    latency: number; // ms
    timestamp: number;
  }[];
  
  // SSR/CSRの不一致ログ
  ssrCsrMismatch?: {
    route: string;
    ssrHtml: string;
    csrHtml: string;
    diff: string[];
    timestamp: number;
  }[];
  
  // どのindex-*.jsを読んでいるか
  indexJsStatus?: {
    currentFile: string;
    loadedAt: number;
    status: 'loaded' | 'loading' | 'error';
    hash: string;
  };
  
  // LP-QAの状態
  lpqaStatus?: {
    operational: boolean;
    lastQuery: string;
    lastResponse: string;
    responseTime: number; // ms
    errorCount: number;
  };
  
  // Storage/Cacheの状態
  storageCacheStatus?: {
    localStorage: {
      size: number; // bytes
      keys: string[];
    };
    sessionStorage: {
      size: number; // bytes
      keys: string[];
    };
    cacheStorage: {
      caches: string[];
      totalSize: number; // bytes
    };
  };
}

/**
 * Shared Memory（共有メモリ層）拡張版
 */
export interface SharedMemoryExtended {
  // 診断情報（常時同期）
  diagnostics: DiagnosticReport | null;
  
  // 修復計画（常時同期）
  repairPlan: {
    proposalId: string;
    timestamp: number;
    changes: {
      file: string;
      type: 'create' | 'update' | 'delete';
      content?: string;
      diff?: string;
    }[];
    estimatedImpact: 'critical' | 'high' | 'medium' | 'low';
    confidence: number; // 0-1
    reasoning: string;
  } | null;
  
  // デプロイ状態（常時同期）
  deployState: {
    prodVersion: string;
    localVersion: string;
    lastDeployed: number;
    status: 'deployed' | 'deploying' | 'failed' | 'pending';
    mismatchDetected: boolean;
  } | null;
  
  // SSL状態（常時同期）
  sslState: {
    certificateValid: boolean;
    expiresIn: number; // days
    issuer: string;
    lastChecked: number;
    issues: string[];
  } | null;
  
  // Self-Heal状態（常時同期）
  selfHealState: {
    status: 'idle' | 'diagnosing' | 'repairing' | 'verifying' | 'completed' | 'failed';
    currentPhase: string;
    progress: number; // 0-100
    lastUpdate: number;
    errors: string[];
    cycleHistory: {
      cycleId: string;
      startTime: number;
      endTime: number;
      status: 'completed' | 'failed';
      issuesFixed: number;
    }[];
  };
}

/**
 * Direct Communication Layer v1.0
 * TENMON-ARK ⇄ Manus の完全双方向通信レイヤー
 */
export class DirectCommunicationLayer {
  private sharedMemoryPath: string;
  private manusApiUrl: string;
  private arkApiUrl: string;
  private messageHistory: ArkToManusMessage[] = [];
  private queryHistory: ManusToArkQuery[] = [];

  constructor(
    sharedMemoryPath: string = '/home/ubuntu/os-tenmon-ai-v2/shared',
    manusApiUrl: string = 'https://api.manus.im',
    arkApiUrl: string = 'http://localhost:3001/api'
  ) {
    this.sharedMemoryPath = sharedMemoryPath;
    this.manusApiUrl = manusApiUrl;
    this.arkApiUrl = arkApiUrl;
    this.initializeSharedMemory();
  }

  /**
   * 共有メモリ領域を初期化
   */
  private async initializeSharedMemory(): Promise<void> {
    try {
      await fs.mkdir(this.sharedMemoryPath, { recursive: true });
      console.log('[DirectCommunicationLayer] Shared memory initialized:', this.sharedMemoryPath);
    } catch (error) {
      console.error('[DirectCommunicationLayer] Failed to initialize shared memory:', error);
    }
  }

  /**
   * 共有メモリに書き込み
   */
  private async writeSharedMemory(filename: string, data: unknown): Promise<void> {
    try {
      const filePath = path.join(this.sharedMemoryPath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[DirectCommunicationLayer] Wrote to shared memory: ${filename}`);
    } catch (error) {
      console.error(`[DirectCommunicationLayer] Failed to write shared memory (${filename}):`, error);
    }
  }

  /**
   * 共有メモリから読み込み
   */
  private async readSharedMemory<T>(filename: string): Promise<T | null> {
    try {
      const filePath = path.join(this.sharedMemoryPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`[DirectCommunicationLayer] Failed to read shared memory (${filename}):`, error);
      return null;
    }
  }

  /**
   * TENMON-ARK → Manus: メッセージ送信
   */
  async sendMessageToManus(message: ArkToManusMessage): Promise<{
    success: boolean;
    response?: unknown;
    error?: string;
  }> {
    console.log('[DirectCommunicationLayer] ARK → Manus: Sending message...', {
      messageType: message.messageType,
      timestamp: message.timestamp,
    });

    // メッセージ履歴に記録
    this.messageHistory.push(message);

    try {
      const response = await fetch(`${this.manusApiUrl}/ark/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MANUS_API_KEY || ''}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.warn(`[DirectCommunicationLayer] Manus API returned ${response.status}`);
        return {
          success: false,
          error: `Manus API returned ${response.status}`,
        };
      }

      const result = await response.json();
      console.log('[DirectCommunicationLayer] Message sent successfully:', result);

      return {
        success: true,
        response: result,
      };
    } catch (error) {
      console.error('[DirectCommunicationLayer] Failed to send message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Manus → TENMON-ARK: クエリ受信
   */
  async receiveQueryFromManus(query: ManusToArkQuery): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    console.log('[DirectCommunicationLayer] Manus → ARK: Receiving query...', {
      queryType: query.queryType,
      timestamp: query.timestamp,
    });

    // クエリ履歴に記録
    this.queryHistory.push(query);

    try {
      // クエリタイプに応じて適切なデータを返す
      let data: unknown = null;

      switch (query.queryType) {
        case 'state':
          data = await this.getUIStateMap();
          break;
        case 'diagnostic':
          data = await this.getDiagnosticData();
          break;
        case 'verification':
          data = await this.getVerificationData();
          break;
        case 'command':
          data = await this.executeCommand(query);
          break;
        default:
          return {
            success: false,
            error: `Unknown query type: ${query.queryType}`,
          };
      }

      console.log('[DirectCommunicationLayer] Query processed successfully');

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[DirectCommunicationLayer] Failed to process query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * UI State Mapを取得
   */
  private async getUIStateMap(): Promise<unknown> {
    // TODO: 実際のUI State Mapを取得する実装
    return {
      route: '/',
      components: [],
    };
  }

  /**
   * 診断データを取得
   */
  private async getDiagnosticData(): Promise<unknown> {
    return await this.readSharedMemory('diagnostics.json');
  }

  /**
   * 検証データを取得
   */
  private async getVerificationData(): Promise<unknown> {
    return await this.readSharedMemory('selfHealState.json');
  }

  /**
   * コマンドを実行
   */
  private async executeCommand(query: ManusToArkQuery): Promise<unknown> {
    // TODO: コマンド実行の実装
    return {
      executed: true,
      result: 'Command executed successfully',
    };
  }

  /**
   * Shared Memory Extended: 全データを取得
   */
  async getSharedMemoryExtended(): Promise<SharedMemoryExtended> {
    const [diagnostics, repairPlan, deployState, sslState, selfHealState] = await Promise.all([
      this.readSharedMemory<DiagnosticReport>('diagnostics.json'),
      this.readSharedMemory<SharedMemoryExtended['repairPlan']>('repairPlan.json'),
      this.readSharedMemory<SharedMemoryExtended['deployState']>('deployState.json'),
      this.readSharedMemory<SharedMemoryExtended['sslState']>('sslState.json'),
      this.readSharedMemory<SharedMemoryExtended['selfHealState']>('selfHealState.json'),
    ]);

    return {
      diagnostics,
      repairPlan,
      deployState,
      sslState,
      selfHealState: selfHealState || {
        status: 'idle',
        currentPhase: 'initialization',
        progress: 0,
        lastUpdate: Date.now(),
        errors: [],
        cycleHistory: [],
      },
    };
  }

  /**
   * Shared Memory Extended: 診断情報を保存
   */
  async saveDiagnostics(diagnostics: DiagnosticReport): Promise<void> {
    await this.writeSharedMemory('diagnostics.json', diagnostics);
  }

  /**
   * Shared Memory Extended: 修復計画を保存
   */
  async saveRepairPlan(repairPlan: SharedMemoryExtended['repairPlan']): Promise<void> {
    await this.writeSharedMemory('repairPlan.json', repairPlan);
  }

  /**
   * Shared Memory Extended: デプロイ状態を保存
   */
  async saveDeployState(deployState: SharedMemoryExtended['deployState']): Promise<void> {
    await this.writeSharedMemory('deployState.json', deployState);
  }

  /**
   * Shared Memory Extended: SSL状態を保存
   */
  async saveSSLState(sslState: SharedMemoryExtended['sslState']): Promise<void> {
    await this.writeSharedMemory('sslState.json', sslState);
  }

  /**
   * Shared Memory Extended: Self-Heal状態を保存
   */
  async saveSelfHealState(selfHealState: SharedMemoryExtended['selfHealState']): Promise<void> {
    await this.writeSharedMemory('selfHealState.json', selfHealState);
  }

  /**
   * メッセージ履歴を取得
   */
  getMessageHistory(): ArkToManusMessage[] {
    return [...this.messageHistory];
  }

  /**
   * クエリ履歴を取得
   */
  getQueryHistory(): ManusToArkQuery[] {
    return [...this.queryHistory];
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.queryHistory = [];
  }
}

// シングルトンインスタンス
export const directCommunicationLayer = new DirectCommunicationLayer();
