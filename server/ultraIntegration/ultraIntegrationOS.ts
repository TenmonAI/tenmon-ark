/**
 * TENMON-ARK ULTRA-INTEGRATION vΩ
 * Ultra Integration OS（超統合OS）
 * 
 * TENMON-ARK × Manus 完全統合（融合OS）
 */

import { directCommunicationLayer, SharedMemoryExtended } from './directCommunicationLayer';
import { manusPatchEngine, AutoRequest, ManusPatchResponse } from './manusPatchEngine';
import { sslSupervisor, SSLSupervisorInfo, SSLRepairOperation } from './sslSupervisor';

/**
 * Ultra Integration Status
 */
export interface UltraIntegrationStatus {
  timestamp: number;
  
  // Direct Link Layer
  directLinkLayer: {
    arkToManus: {
      connected: boolean;
      lastMessage: number | null;
      messagesSent: number;
    };
    manusToArk: {
      connected: boolean;
      lastQuery: number | null;
      queriesReceived: number;
    };
    sharedMemory: {
      active: boolean;
      lastSync: number | null;
      syncCount: number;
    };
  };
  
  // Self-Heal Integration
  selfHealIntegration: {
    diagnose: {
      status: 'operational' | 'degraded' | 'failed';
      lastDiagnosis: number | null;
      issuesDetected: number;
    };
    patch: {
      status: 'idle' | 'patching' | 'completed' | 'failed';
      lastPatch: number | null;
      patchesApplied: number;
    };
    verify: {
      status: 'idle' | 'verifying' | 'completed' | 'failed';
      lastVerification: number | null;
      verificationsCompleted: number;
    };
    state: {
      currentPhase: string;
      progress: number; // 0-100
      errors: string[];
    };
  };
  
  // SSL Diagnostics
  sslDiagnostics: {
    issueFound: boolean;
    issues: string[];
    fixPlan: string | null;
    fixed: boolean;
    lastCheck: number | null;
  };
  
  // Build/Deploy
  buildDeploy: {
    prodVersion: string | null;
    localVersion: string | null;
    resolved: boolean;
    lastCheck: number | null;
  };
  
  // 全体統合の評価
  overallIntegration: {
    status: 'ok' | 'warn' | 'critical';
    systemStability: number; // 0-100
    integrationScore: number; // 0-100
    nextSteps: string[];
  };
}

/**
 * Ultra Integration OS
 * TENMON-ARK × Manus 完全統合（融合OS）
 */
export class UltraIntegrationOS {
  private statusHistory: UltraIntegrationStatus[] = [];
  private integrationStartTime: number = Date.now();

  /**
   * Ultra Integration Statusを取得
   */
  async getStatus(): Promise<UltraIntegrationStatus> {
    console.log('[UltraIntegrationOS] Getting status...');

    // Direct Link Layerのステータス
    const messageHistory = directCommunicationLayer.getMessageHistory();
    const queryHistory = directCommunicationLayer.getQueryHistory();
    const sharedMemory = await directCommunicationLayer.getSharedMemoryExtended();

    // Manus Patch Engineのステータス
    const patchStats = manusPatchEngine.getStatistics();
    const autoRequestHistory = manusPatchEngine.getAutoRequestHistory();
    const patchResponseHistory = manusPatchEngine.getPatchResponseHistory();
    const reEvaluationHistory = manusPatchEngine.getReEvaluationHistory();

    // SSL Supervisorのステータス
    const sslStats = sslSupervisor.getStatistics();
    const supervisorInfoHistory = sslSupervisor.getSupervisorInfoHistory();
    const evaluationHistory = sslSupervisor.getEvaluationHistory();

    const status: UltraIntegrationStatus = {
      timestamp: Date.now(),
      directLinkLayer: {
        arkToManus: {
          connected: messageHistory.length > 0,
          lastMessage: messageHistory.length > 0 ? messageHistory[messageHistory.length - 1]!.timestamp : null,
          messagesSent: messageHistory.length,
        },
        manusToArk: {
          connected: queryHistory.length > 0,
          lastQuery: queryHistory.length > 0 ? queryHistory[queryHistory.length - 1]!.timestamp : null,
          queriesReceived: queryHistory.length,
        },
        sharedMemory: {
          active: true,
          lastSync: sharedMemory.selfHealState.lastUpdate,
          syncCount: 0, // TODO: 実際の同期回数を追跡
        },
      },
      selfHealIntegration: {
        diagnose: {
          status: autoRequestHistory.length > 0 ? 'operational' : 'degraded',
          lastDiagnosis: autoRequestHistory.length > 0 ? autoRequestHistory[autoRequestHistory.length - 1]!.timestamp : null,
          issuesDetected: autoRequestHistory.length,
        },
        patch: {
          status: patchResponseHistory.length > 0 ? 'completed' : 'idle',
          lastPatch: patchResponseHistory.length > 0 ? patchResponseHistory[patchResponseHistory.length - 1]!.timestamp : null,
          patchesApplied: patchResponseHistory.length,
        },
        verify: {
          status: reEvaluationHistory.length > 0 ? 'completed' : 'idle',
          lastVerification: reEvaluationHistory.length > 0 ? reEvaluationHistory[reEvaluationHistory.length - 1]!.timestamp : null,
          verificationsCompleted: reEvaluationHistory.length,
        },
        state: {
          currentPhase: sharedMemory.selfHealState.currentPhase,
          progress: sharedMemory.selfHealState.progress,
          errors: sharedMemory.selfHealState.errors,
        },
      },
      sslDiagnostics: {
        issueFound: false,
        issues: [],
        fixPlan: null,
        fixed: false,
        lastCheck: supervisorInfoHistory.length > 0 ? supervisorInfoHistory[supervisorInfoHistory.length - 1]!.timestamp : null,
      },
      buildDeploy: {
        prodVersion: sharedMemory.deployState?.prodVersion || null,
        localVersion: sharedMemory.deployState?.localVersion || null,
        resolved: sharedMemory.deployState?.mismatchDetected === false,
        lastCheck: sharedMemory.deployState?.lastDeployed || null,
      },
      overallIntegration: {
        status: 'ok',
        systemStability: 0,
        integrationScore: 0,
        nextSteps: [],
      },
    };

    // SSL診断の問題を検出
    if (supervisorInfoHistory.length > 0) {
      const latestSupervisorInfo = supervisorInfoHistory[supervisorInfoHistory.length - 1]!;
      
      if (latestSupervisorInfo.expirationWarning.warningLevel === 'critical') {
        status.sslDiagnostics.issueFound = true;
        status.sslDiagnostics.issues.push(latestSupervisorInfo.expirationWarning.message);
      }
      
      if (!latestSupervisorInfo.port443Status.listening) {
        status.sslDiagnostics.issueFound = true;
        status.sslDiagnostics.issues.push('443ポートがリスニングしていない');
      }
      
      if (!latestSupervisorInfo.httpsRedirect.configured) {
        status.sslDiagnostics.issueFound = true;
        status.sslDiagnostics.issues.push('HTTPSリダイレクトが未設定');
      }
      
      status.sslDiagnostics.fixed = evaluationHistory.length > 0 && evaluationHistory[evaluationHistory.length - 1]!.overallStatus === 'success';
    }

    // システム安定性を計算
    let systemStability = 100;
    
    // Direct Link Layerの接続状態
    if (!status.directLinkLayer.arkToManus.connected) {
      systemStability -= 20;
    }
    if (!status.directLinkLayer.manusToArk.connected) {
      systemStability -= 20;
    }
    
    // Self-Heal Integrationの状態
    if (status.selfHealIntegration.diagnose.status === 'failed') {
      systemStability -= 15;
    }
    if (status.selfHealIntegration.patch.status === 'failed') {
      systemStability -= 15;
    }
    if (status.selfHealIntegration.verify.status === 'failed') {
      systemStability -= 15;
    }
    
    // SSL診断の問題
    if (status.sslDiagnostics.issueFound && !status.sslDiagnostics.fixed) {
      systemStability -= 15;
    }
    
    status.overallIntegration.systemStability = Math.max(systemStability, 0);

    // 統合スコアを計算
    let integrationScore = 0;
    
    // Direct Link Layer（40点）
    if (status.directLinkLayer.arkToManus.connected) integrationScore += 15;
    if (status.directLinkLayer.manusToArk.connected) integrationScore += 15;
    if (status.directLinkLayer.sharedMemory.active) integrationScore += 10;
    
    // Self-Heal Integration（40点）
    if (status.selfHealIntegration.diagnose.status === 'operational') integrationScore += 10;
    if (status.selfHealIntegration.patch.status === 'completed') integrationScore += 15;
    if (status.selfHealIntegration.verify.status === 'completed') integrationScore += 15;
    
    // SSL Diagnostics（20点）
    if (!status.sslDiagnostics.issueFound) integrationScore += 20;
    else if (status.sslDiagnostics.fixed) integrationScore += 10;
    
    status.overallIntegration.integrationScore = integrationScore;

    // 総合ステータスを判定
    if (systemStability >= 80 && integrationScore >= 80) {
      status.overallIntegration.status = 'ok';
      status.overallIntegration.nextSteps = ['システムは正常に動作しています'];
    } else if (systemStability >= 60 && integrationScore >= 60) {
      status.overallIntegration.status = 'warn';
      status.overallIntegration.nextSteps = ['一部の問題があります', '診断を実行してください'];
    } else {
      status.overallIntegration.status = 'critical';
      status.overallIntegration.nextSteps = ['重大な問題があります', '直ちに修復を実行してください'];
    }

    // ステータス履歴に記録
    this.statusHistory.push(status);

    console.log('[UltraIntegrationOS] Status retrieved:', status.overallIntegration.status);

    return status;
  }

  /**
   * 完全な診断レポートを生成
   */
  async generateFullReport(): Promise<{
    status: UltraIntegrationStatus;
    directLinkLayer: {
      messageHistory: unknown[];
      queryHistory: unknown[];
      sharedMemory: SharedMemoryExtended;
    };
    selfHealIntegration: {
      autoRequestHistory: AutoRequest[];
      patchResponseHistory: ManusPatchResponse[];
      reEvaluationHistory: unknown[];
      statistics: unknown;
    };
    sslDiagnostics: {
      supervisorInfoHistory: SSLSupervisorInfo[];
      repairOperationHistory: SSLRepairOperation[];
      evaluationHistory: unknown[];
      statistics: unknown;
    };
    buildDeploy: {
      deployState: SharedMemoryExtended['deployState'];
    };
    overallIntegration: {
      uptime: number; // seconds
      totalMessages: number;
      totalQueries: number;
      totalPatches: number;
      totalRepairs: number;
    };
  }> {
    console.log('[UltraIntegrationOS] Generating full report...');

    const status = await this.getStatus();
    const sharedMemory = await directCommunicationLayer.getSharedMemoryExtended();

    const report = {
      status,
      directLinkLayer: {
        messageHistory: directCommunicationLayer.getMessageHistory(),
        queryHistory: directCommunicationLayer.getQueryHistory(),
        sharedMemory,
      },
      selfHealIntegration: {
        autoRequestHistory: manusPatchEngine.getAutoRequestHistory(),
        patchResponseHistory: manusPatchEngine.getPatchResponseHistory(),
        reEvaluationHistory: manusPatchEngine.getReEvaluationHistory(),
        statistics: manusPatchEngine.getStatistics(),
      },
      sslDiagnostics: {
        supervisorInfoHistory: sslSupervisor.getSupervisorInfoHistory(),
        repairOperationHistory: sslSupervisor.getRepairOperationHistory(),
        evaluationHistory: sslSupervisor.getEvaluationHistory(),
        statistics: sslSupervisor.getStatistics(),
      },
      buildDeploy: {
        deployState: sharedMemory.deployState,
      },
      overallIntegration: {
        uptime: Math.floor((Date.now() - this.integrationStartTime) / 1000),
        totalMessages: status.directLinkLayer.arkToManus.messagesSent,
        totalQueries: status.directLinkLayer.manusToArk.queriesReceived,
        totalPatches: status.selfHealIntegration.patch.patchesApplied,
        totalRepairs: sslSupervisor.getStatistics().totalRepairOperations,
      },
    };

    console.log('[UltraIntegrationOS] Full report generated');

    return report;
  }

  /**
   * システムをリセット
   */
  async resetSystem(): Promise<void> {
    console.log('[UltraIntegrationOS] Resetting system...');

    // 履歴をクリア
    directCommunicationLayer.clearHistory();
    manusPatchEngine.clearHistory();
    sslSupervisor.clearHistory();
    this.statusHistory = [];
    this.integrationStartTime = Date.now();

    console.log('[UltraIntegrationOS] System reset completed');
  }

  /**
   * ステータス履歴を取得
   */
  getStatusHistory(): UltraIntegrationStatus[] {
    return [...this.statusHistory];
  }
}

// シングルトンインスタンス
export const ultraIntegrationOS = new UltraIntegrationOS();
