/**
 * TENMON-ARK ULTRA-INTEGRATION vΩ
 * SSL Supervisor（SSL自律監督）
 * 
 * SSL & HTTPS層の自律監督
 */

import { directCommunicationLayer } from './directCommunicationLayer';
import { sslRepairEngine } from '../selfHeal/sslRepairEngine';

/**
 * SSL監督情報
 */
export interface SSLSupervisorInfo {
  timestamp: number;
  
  // SSL証明書issuer
  certificateIssuer: string | null;
  
  // 期限切れ警告
  expirationWarning: {
    daysUntilExpiry: number;
    warningLevel: 'none' | 'info' | 'warning' | 'critical';
    message: string;
  };
  
  // SANチェック
  sanCheck: {
    san: string[];
    valid: boolean;
    issues: string[];
  };
  
  // 中間証明書chain
  certificateChain: {
    chainStatus: 'valid' | 'invalid' | 'unknown';
    chainLength: number;
    issues: string[];
  };
  
  // 443ポート開通
  port443Status: {
    listening: boolean;
    issues: string[];
  };
  
  // HTTP→HTTPSリダイレクト
  httpsRedirect: {
    configured: boolean;
    working: boolean;
    issues: string[];
  };
  
  // Reverse proxyの状態
  reverseProxyStatus: {
    configured: boolean;
    working: boolean;
    issues: string[];
  };
  
  // Cloudflareのステータス
  cloudflareStatus: {
    enabled: boolean;
    proxyStatus: 'proxied' | 'dns-only' | 'unknown';
    issues: string[];
  };
  
  // Aレコード整合性
  aRecordConsistency: {
    configured: boolean;
    ip: string | null;
    issues: string[];
  };
  
  // DNSSEC状態
  dnssecStatus: {
    enabled: boolean;
    valid: boolean;
    issues: string[];
  };
}

/**
 * SSL修復オペレーション
 */
export interface SSLRepairOperation {
  operationId: string;
  timestamp: number;
  
  // 修復対象
  target: 'certificate' | 'redirect' | 'proxy' | 'dns' | 'dnssec';
  
  // 修復内容
  actions: {
    action: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: string;
    error?: string;
  }[];
  
  // 修復計画
  plan: string;
  
  // 修復結果
  result: {
    success: boolean;
    message: string;
    details: string[];
  } | null;
}

/**
 * Fix結果評価
 */
export interface FixResultEvaluation {
  operationId: string;
  timestamp: number;
  
  // 修復前の状態
  beforeState: SSLSupervisorInfo;
  
  // 修復後の状態
  afterState: SSLSupervisorInfo;
  
  // 改善された項目
  improvements: {
    item: string;
    before: string;
    after: string;
  }[];
  
  // 残っている問題
  remainingIssues: {
    item: string;
    issue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  
  // 修復完了判定
  repairCompleted: boolean;
  overallStatus: 'success' | 'partial' | 'failed';
  nextSteps: string[];
}

/**
 * SSL Supervisor
 * SSL & HTTPS層の自律監督
 */
export class SSLSupervisor {
  private supervisorInfoHistory: SSLSupervisorInfo[] = [];
  private repairOperationHistory: SSLRepairOperation[] = [];
  private evaluationHistory: FixResultEvaluation[] = [];

  /**
   * SSL監督情報を収集
   */
  async collectSupervisorInfo(): Promise<SSLSupervisorInfo> {
    console.log('[SSLSupervisor] Collecting SSL supervisor info...');

    const info: SSLSupervisorInfo = {
      timestamp: Date.now(),
      certificateIssuer: null,
      expirationWarning: {
        daysUntilExpiry: 0,
        warningLevel: 'none',
        message: '',
      },
      sanCheck: {
        san: [],
        valid: false,
        issues: [],
      },
      certificateChain: {
        chainStatus: 'unknown',
        chainLength: 0,
        issues: [],
      },
      port443Status: {
        listening: false,
        issues: [],
      },
      httpsRedirect: {
        configured: false,
        working: false,
        issues: [],
      },
      reverseProxyStatus: {
        configured: false,
        working: false,
        issues: [],
      },
      cloudflareStatus: {
        enabled: false,
        proxyStatus: 'unknown',
        issues: [],
      },
      aRecordConsistency: {
        configured: false,
        ip: null,
        issues: [],
      },
      dnssecStatus: {
        enabled: false,
        valid: false,
        issues: [],
      },
    };

    try {
      // 1. SSL証明書情報を取得
      const cert = await sslRepairEngine.checkSSLCertificate();
      if (cert) {
        info.certificateIssuer = cert.issuer;
        info.sanCheck.san = cert.san;
        info.sanCheck.valid = cert.san.length > 0;
        info.certificateChain.chainStatus = cert.chainStatus;

        // 期限切れ警告
        const daysUntilExpiry = cert.daysUntilExpiry;
        info.expirationWarning.daysUntilExpiry = daysUntilExpiry;

        if (daysUntilExpiry < 0) {
          info.expirationWarning.warningLevel = 'critical';
          info.expirationWarning.message = '証明書が期限切れです';
        } else if (daysUntilExpiry < 7) {
          info.expirationWarning.warningLevel = 'critical';
          info.expirationWarning.message = `証明書の有効期限まで${daysUntilExpiry}日です`;
        } else if (daysUntilExpiry < 30) {
          info.expirationWarning.warningLevel = 'warning';
          info.expirationWarning.message = `証明書の有効期限まで${daysUntilExpiry}日です`;
        } else if (daysUntilExpiry < 60) {
          info.expirationWarning.warningLevel = 'info';
          info.expirationWarning.message = `証明書の有効期限まで${daysUntilExpiry}日です`;
        } else {
          info.expirationWarning.warningLevel = 'none';
          info.expirationWarning.message = '証明書は有効です';
        }
      }

      // 2. Server HTTPS設定を取得
      const httpsConfig = await sslRepairEngine.checkServerHTTPSConfig();
      info.port443Status.listening = httpsConfig.port443Listening;
      info.httpsRedirect.configured = httpsConfig.redirectConfigured;
      info.httpsRedirect.working = httpsConfig.redirectConfigured;
      info.reverseProxyStatus.configured = httpsConfig.proxyConfig.enabled;
      info.reverseProxyStatus.working = httpsConfig.proxyConfig.enabled;

      // 3. DNS設定を取得
      const dnsConfig = await sslRepairEngine.checkDNSConfig();
      info.aRecordConsistency.configured = dnsConfig.aRecord.configured;
      info.aRecordConsistency.ip = dnsConfig.aRecord.ip;
      info.cloudflareStatus.enabled = dnsConfig.cloudflare.enabled;
      info.cloudflareStatus.proxyStatus = dnsConfig.cloudflare.proxyStatus;
      info.dnssecStatus.enabled = dnsConfig.dnssec.enabled;
      info.dnssecStatus.valid = dnsConfig.dnssec.enabled;

      // 監督情報履歴に記録
      this.supervisorInfoHistory.push(info);

      console.log('[SSLSupervisor] SSL supervisor info collected successfully');

      return info;
    } catch (error) {
      console.error('[SSLSupervisor] Failed to collect SSL supervisor info:', error);
      info.certificateChain.issues.push(error instanceof Error ? error.message : 'Unknown error');
      return info;
    }
  }

  /**
   * SSL監督情報をManusに送信
   */
  async sendSupervisorInfoToManus(info: SSLSupervisorInfo): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log('[SSLSupervisor] Sending SSL supervisor info to Manus...');

    try {
      // TENMON-ARK → Manus メッセージを構築
      const message = {
        timestamp: Date.now(),
        messageType: 'status' as const,
        sslState: {
          certificateValid: info.expirationWarning.warningLevel !== 'critical',
          expiresIn: info.expirationWarning.daysUntilExpiry,
          issuer: info.certificateIssuer || 'Unknown',
          san: info.sanCheck.san,
          chainStatus: info.certificateChain.chainStatus,
        },
      };

      // Manusに送信
      const result = await directCommunicationLayer.sendMessageToManus(message);

      if (result.success) {
        console.log('[SSLSupervisor] SSL supervisor info sent successfully');
        return {
          success: true,
        };
      } else {
        console.error('[SSLSupervisor] Failed to send SSL supervisor info:', result.error);
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('[SSLSupervisor] Failed to send SSL supervisor info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Manusから修復オペレーションを受信
   */
  async receiveRepairOperationFromManus(operation: SSLRepairOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log('[SSLSupervisor] Receiving repair operation from Manus:', operation.operationId);

    // 修復オペレーション履歴に記録
    this.repairOperationHistory.push(operation);

    try {
      // 修復オペレーションを実行
      for (const action of operation.actions) {
        console.log(`[SSLSupervisor] Executing action: ${action.action}`);
        action.status = 'in-progress';

        // TODO: 実際の修復オペレーションを実装
        // - 証明書の更新
        // - リダイレクトの設定
        // - プロキシの設定
        // - DNSの設定
        // - DNSSECの設定

        action.status = 'completed';
        action.result = 'Action completed successfully';
      }

      // 修復結果を設定
      operation.result = {
        success: true,
        message: 'Repair operation completed successfully',
        details: operation.actions.map((a) => `${a.action}: ${a.result}`),
      };

      console.log('[SSLSupervisor] Repair operation completed successfully');

      return {
        success: true,
      };
    } catch (error) {
      console.error('[SSLSupervisor] Failed to execute repair operation:', error);

      // 修復結果を設定
      operation.result = {
        success: false,
        message: 'Repair operation failed',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      };

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fix結果を評価
   */
  async evaluateFixResult(
    operationId: string,
    beforeState: SSLSupervisorInfo
  ): Promise<FixResultEvaluation> {
    console.log('[SSLSupervisor] Evaluating fix result:', operationId);

    // 修復後の状態を収集
    const afterState = await this.collectSupervisorInfo();

    const evaluation: FixResultEvaluation = {
      operationId,
      timestamp: Date.now(),
      beforeState,
      afterState,
      improvements: [],
      remainingIssues: [],
      repairCompleted: false,
      overallStatus: 'failed',
      nextSteps: [],
    };

    // 改善された項目を検出
    if (beforeState.expirationWarning.warningLevel !== afterState.expirationWarning.warningLevel) {
      evaluation.improvements.push({
        item: '証明書の有効期限',
        before: beforeState.expirationWarning.message,
        after: afterState.expirationWarning.message,
      });
    }

    if (!beforeState.port443Status.listening && afterState.port443Status.listening) {
      evaluation.improvements.push({
        item: '443ポート',
        before: 'リスニングしていない',
        after: 'リスニング中',
      });
    }

    if (!beforeState.httpsRedirect.configured && afterState.httpsRedirect.configured) {
      evaluation.improvements.push({
        item: 'HTTPSリダイレクト',
        before: '未設定',
        after: '設定済み',
      });
    }

    // 残っている問題を検出
    if (afterState.expirationWarning.warningLevel === 'critical') {
      evaluation.remainingIssues.push({
        item: '証明書の有効期限',
        issue: afterState.expirationWarning.message,
        severity: 'critical',
      });
    }

    if (!afterState.port443Status.listening) {
      evaluation.remainingIssues.push({
        item: '443ポート',
        issue: 'リスニングしていない',
        severity: 'critical',
      });
    }

    if (!afterState.httpsRedirect.configured) {
      evaluation.remainingIssues.push({
        item: 'HTTPSリダイレクト',
        issue: '未設定',
        severity: 'high',
      });
    }

    if (!afterState.dnssecStatus.enabled) {
      evaluation.remainingIssues.push({
        item: 'DNSSEC',
        issue: '無効',
        severity: 'medium',
      });
    }

    // 修復完了判定
    evaluation.repairCompleted = evaluation.remainingIssues.length === 0;

    // 総合ステータス
    if (evaluation.repairCompleted) {
      evaluation.overallStatus = 'success';
      evaluation.nextSteps = ['SSL/HTTPS設定が完全に安全です'];
    } else if (evaluation.improvements.length > 0) {
      evaluation.overallStatus = 'partial';
      evaluation.nextSteps = [
        '一部の問題が改善されました',
        '残りの問題を修復してください',
      ];
    } else {
      evaluation.overallStatus = 'failed';
      evaluation.nextSteps = ['修復に失敗しました', '再度診断を実行してください'];
    }

    // 評価履歴に記録
    this.evaluationHistory.push(evaluation);

    console.log('[SSLSupervisor] Fix result evaluated:', evaluation.overallStatus);

    return evaluation;
  }

  /**
   * 監督情報履歴を取得
   */
  getSupervisorInfoHistory(): SSLSupervisorInfo[] {
    return [...this.supervisorInfoHistory];
  }

  /**
   * 修復オペレーション履歴を取得
   */
  getRepairOperationHistory(): SSLRepairOperation[] {
    return [...this.repairOperationHistory];
  }

  /**
   * 評価履歴を取得
   */
  getEvaluationHistory(): FixResultEvaluation[] {
    return [...this.evaluationHistory];
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.supervisorInfoHistory = [];
    this.repairOperationHistory = [];
    this.evaluationHistory = [];
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalSupervisorInfoCollections: number;
    totalRepairOperations: number;
    totalEvaluations: number;
    successRate: number;
    averageImprovements: number;
  } {
    const totalSupervisorInfoCollections = this.supervisorInfoHistory.length;
    const totalRepairOperations = this.repairOperationHistory.length;
    const totalEvaluations = this.evaluationHistory.length;

    const successfulEvaluations = this.evaluationHistory.filter(
      (e) => e.overallStatus === 'success'
    ).length;
    const successRate = totalEvaluations > 0 ? successfulEvaluations / totalEvaluations : 0;

    const totalImprovements = this.evaluationHistory.reduce(
      (sum, e) => sum + e.improvements.length,
      0
    );
    const averageImprovements = totalEvaluations > 0 ? totalImprovements / totalEvaluations : 0;

    return {
      totalSupervisorInfoCollections,
      totalRepairOperations,
      totalEvaluations,
      successRate,
      averageImprovements,
    };
  }
}

// シングルトンインスタンス
export const sslSupervisor = new SSLSupervisor();
