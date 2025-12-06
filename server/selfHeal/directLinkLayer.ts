/**
 * TENMON-ARK Self-Heal OS vΩ
 * Direct Link Layer（双方向対話レイヤー）
 * 
 * TENMON-ARK ⇄ Manus の双方向通信を実現する
 * Inter-Intelligence Layer
 */

import { DiagnosticReport } from './diagnosticsEngine';
import { PatchProposal } from './selfPatchLayer';
import { VerificationResult } from './selfVerifyEngine';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * TENMON-ARK → Manus リクエスト型
 */
export interface ArkToManusRequest {
  requestType:
    | 'build_diff'
    | 'lpqa_logs'
    | 'index_js_status'
    | 'deploy_status'
    | 'repair_guidance'
    | 'optimization_advice';
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Manus → TENMON-ARK クエリ型
 */
export interface ManusToArkQuery {
  queryType:
    | 'ui_render_tree'
    | 'error_node_location'
    | 'lpqa_response_status'
    | 'system_diagnostics'
    | 'self_heal_state';
  parameters?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Shared Memory（共有記憶領域）
 */
export interface SharedMemory {
  diagnostics: DiagnosticReport | null;
  repairPlan: PatchProposal | null;
  selfHealState: {
    status: 'idle' | 'diagnosing' | 'repairing' | 'verifying' | 'completed' | 'failed';
    currentPhase: string;
    progress: number; // 0-100
    lastUpdate: number;
    errors: string[];
  };
}

/**
 * Direct Link Layer
 * TENMON-ARK と Manus の双方向通信レイヤー
 */
export class DirectLinkLayer {
  private sharedMemoryPath: string;
  private manusApiUrl: string;
  private arkApiUrl: string;

  constructor(
    sharedMemoryPath: string = '/home/ubuntu/os-tenmon-ai-v2/shared',
    manusApiUrl: string = 'https://api.manus.im',
    arkApiUrl: string = 'http://localhost:3000/api'
  ) {
    this.sharedMemoryPath = sharedMemoryPath;
    this.manusApiUrl = manusApiUrl;
    this.arkApiUrl = arkApiUrl;
    this.initializeSharedMemory();
  }

  /**
   * 共有記憶領域を初期化
   */
  private async initializeSharedMemory(): Promise<void> {
    try {
      await fs.mkdir(this.sharedMemoryPath, { recursive: true });
      console.log('[DirectLinkLayer] Shared memory initialized:', this.sharedMemoryPath);
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to initialize shared memory:', error);
    }
  }

  /**
   * 共有記憶領域に書き込み
   */
  private async writeSharedMemory(filename: string, data: unknown): Promise<void> {
    try {
      const filePath = path.join(this.sharedMemoryPath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[DirectLinkLayer] Wrote to shared memory: ${filename}`);
    } catch (error) {
      console.error(`[DirectLinkLayer] Failed to write shared memory (${filename}):`, error);
    }
  }

  /**
   * 共有記憶領域から読み込み
   */
  private async readSharedMemory<T>(filename: string): Promise<T | null> {
    try {
      const filePath = path.join(this.sharedMemoryPath, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`[DirectLinkLayer] Failed to read shared memory (${filename}):`, error);
      return null;
    }
  }

  /**
   * TENMON-ARK → Manus: ビルド差分をリクエスト
   */
  async requestBuildDiff(): Promise<{
    currentHash: string;
    deployedHash: string;
    diff: string[];
  } | null> {
    console.log('[DirectLinkLayer] ARK → Manus: Requesting build diff...');

    const request: ArkToManusRequest = {
      requestType: 'build_diff',
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.manusApiUrl}/ark/build-diff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MANUS_API_KEY || ''}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] Manus API returned ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log('[DirectLinkLayer] Build diff received:', result);
      return result;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to request build diff:', error);
      return null;
    }
  }

  /**
   * TENMON-ARK → Manus: LP-QA APIログをリクエスト
   */
  async requestLPQALogs(limit: number = 100): Promise<unknown[] | null> {
    console.log('[DirectLinkLayer] ARK → Manus: Requesting LP-QA logs...');

    const request: ArkToManusRequest = {
      requestType: 'lpqa_logs',
      context: { limit },
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.manusApiUrl}/ark/lpqa-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MANUS_API_KEY || ''}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] Manus API returned ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log('[DirectLinkLayer] LP-QA logs received:', result.length, 'entries');
      return result;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to request LP-QA logs:', error);
      return null;
    }
  }

  /**
   * TENMON-ARK → Manus: index-*.js読み込み状態をリクエスト
   */
  async requestIndexJsStatus(): Promise<{
    currentFile: string;
    loadedAt: number;
    status: 'loaded' | 'loading' | 'error';
  } | null> {
    console.log('[DirectLinkLayer] ARK → Manus: Requesting index.js status...');

    const request: ArkToManusRequest = {
      requestType: 'index_js_status',
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.manusApiUrl}/ark/index-js-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MANUS_API_KEY || ''}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] Manus API returned ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log('[DirectLinkLayer] index.js status received:', result);
      return result;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to request index.js status:', error);
      return null;
    }
  }

  /**
   * TENMON-ARK → Manus: デプロイ成功状態をリクエスト
   */
  async requestDeployStatus(): Promise<{
    deployed: boolean;
    version: string;
    timestamp: number;
    url: string;
  } | null> {
    console.log('[DirectLinkLayer] ARK → Manus: Requesting deploy status...');

    const request: ArkToManusRequest = {
      requestType: 'deploy_status',
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.manusApiUrl}/ark/deploy-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MANUS_API_KEY || ''}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] Manus API returned ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log('[DirectLinkLayer] Deploy status received:', result);
      return result;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to request deploy status:', error);
      return null;
    }
  }

  /**
   * Manus → TENMON-ARK: UIレンダーツリーを送信
   */
  async sendUIRenderTree(renderTree: unknown): Promise<boolean> {
    console.log('[DirectLinkLayer] Manus → ARK: Sending UI render tree...');

    const query: ManusToArkQuery = {
      queryType: 'ui_render_tree',
      parameters: { renderTree },
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.arkApiUrl}/trpc/selfHeal.receiveManusQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] ARK API returned ${response.status}`);
        return false;
      }

      console.log('[DirectLinkLayer] UI render tree sent successfully');
      return true;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to send UI render tree:', error);
      return false;
    }
  }

  /**
   * Manus → TENMON-ARK: エラー子ノード位置を送信
   */
  async sendErrorNodeLocation(nodeLocation: {
    componentName: string;
    filePath: string;
    lineNumber: number;
    errorType: string;
  }): Promise<boolean> {
    console.log('[DirectLinkLayer] Manus → ARK: Sending error node location...');

    const query: ManusToArkQuery = {
      queryType: 'error_node_location',
      parameters: { nodeLocation },
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.arkApiUrl}/trpc/selfHeal.receiveManusQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] ARK API returned ${response.status}`);
        return false;
      }

      console.log('[DirectLinkLayer] Error node location sent successfully');
      return true;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to send error node location:', error);
      return false;
    }
  }

  /**
   * Manus → TENMON-ARK: LP-QA返答受信状態を送信
   */
  async sendLPQAResponseStatus(status: {
    received: boolean;
    responseTime: number;
    error: string | null;
  }): Promise<boolean> {
    console.log('[DirectLinkLayer] Manus → ARK: Sending LP-QA response status...');

    const query: ManusToArkQuery = {
      queryType: 'lpqa_response_status',
      parameters: { status },
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${this.arkApiUrl}/trpc/selfHeal.receiveManusQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        console.warn(`[DirectLinkLayer] ARK API returned ${response.status}`);
        return false;
      }

      console.log('[DirectLinkLayer] LP-QA response status sent successfully');
      return true;
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to send LP-QA response status:', error);
      return false;
    }
  }

  /**
   * Shared Memory: 診断情報を保存
   */
  async saveDiagnostics(diagnostics: DiagnosticReport): Promise<void> {
    await this.writeSharedMemory('diagnostics.json', diagnostics);
  }

  /**
   * Shared Memory: 診断情報を読み込み
   */
  async loadDiagnostics(): Promise<DiagnosticReport | null> {
    return await this.readSharedMemory<DiagnosticReport>('diagnostics.json');
  }

  /**
   * Shared Memory: 修復計画を保存
   */
  async saveRepairPlan(repairPlan: PatchProposal): Promise<void> {
    await this.writeSharedMemory('repairPlan.json', repairPlan);
  }

  /**
   * Shared Memory: 修復計画を読み込み
   */
  async loadRepairPlan(): Promise<PatchProposal | null> {
    return await this.readSharedMemory<PatchProposal>('repairPlan.json');
  }

  /**
   * Shared Memory: Self-Heal状態を保存
   */
  async saveSelfHealState(state: SharedMemory['selfHealState']): Promise<void> {
    await this.writeSharedMemory('selfHealState.json', state);
  }

  /**
   * Shared Memory: Self-Heal状態を読み込み
   */
  async loadSelfHealState(): Promise<SharedMemory['selfHealState'] | null> {
    return await this.readSharedMemory<SharedMemory['selfHealState']>('selfHealState.json');
  }

  /**
   * Shared Memory: 全データを取得
   */
  async getSharedMemory(): Promise<SharedMemory> {
    const [diagnostics, repairPlan, selfHealState] = await Promise.all([
      this.loadDiagnostics(),
      this.loadRepairPlan(),
      this.loadSelfHealState(),
    ]);

    return {
      diagnostics,
      repairPlan,
      selfHealState: selfHealState || {
        status: 'idle',
        currentPhase: 'initialization',
        progress: 0,
        lastUpdate: Date.now(),
        errors: [],
      },
    };
  }

  /**
   * Shared Memory: 全データをクリア
   */
  async clearSharedMemory(): Promise<void> {
    try {
      const files = ['diagnostics.json', 'repairPlan.json', 'selfHealState.json'];
      await Promise.all(
        files.map(file =>
          fs.unlink(path.join(this.sharedMemoryPath, file)).catch(() => {
            // ファイルが存在しない場合は無視
          })
        )
      );
      console.log('[DirectLinkLayer] Shared memory cleared');
    } catch (error) {
      console.error('[DirectLinkLayer] Failed to clear shared memory:', error);
    }
  }
}

// シングルトンインスタンス
export const directLinkLayer = new DirectLinkLayer();
