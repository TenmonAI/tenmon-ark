/**
 * TENMON-ARK Self-Heal OS v1.0
 * Phase 2: Self-Report Layer（自動レポート送信）
 * 
 * TENMON-ARKの診断エンジンが生成したレポートを
 * Manusに自動送信するプロトコル
 */

import { DiagnosticReport, DiagnosticIssue } from './diagnosticsEngine';

export interface SelfRepairRequest {
  report: DiagnosticReport;
  severity: 'critical' | 'high' | 'medium' | 'low';
  context: 'prod' | 'dev' | 'test';
  routesAffected: string[];
  timestamp: number;
  systemInfo: {
    version: string;
    environment: string;
    buildHash?: string;
  };
}

export interface SelfRepairResponse {
  success: boolean;
  message: string;
  repairId?: string;
  estimatedTime?: number; // minutes
  priority?: number; // 1-10
}

/**
 * Self-Report Layer
 * TENMON-ARK → Manus 自動レポート送信プロトコル
 */
export class SelfReportLayer {
  private manusEndpoint: string;
  private reportHistory: SelfRepairRequest[] = [];

  constructor(manusEndpoint: string = '/manus/connect/self-repair') {
    this.manusEndpoint = manusEndpoint;
  }

  /**
   * 重要度（severity）判定ロジック
   */
  private determineSeverity(report: DiagnosticReport): 'critical' | 'high' | 'medium' | 'low' {
    const criticalIssues = [...report.uiIssues, ...report.apiIssues, ...report.deployIssues]
      .filter(i => i.severity === 'critical');

    if (criticalIssues.length > 0 || report.systemHealth.overall < 50) {
      return 'critical';
    }

    const highIssues = [...report.uiIssues, ...report.apiIssues, ...report.deployIssues]
      .filter(i => i.severity === 'high');

    if (highIssues.length > 0 || report.systemHealth.overall < 70) {
      return 'high';
    }

    if (report.systemHealth.overall < 85) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 影響範囲（routesAffected）自動検出
   */
  private detectAffectedRoutes(issues: DiagnosticIssue[]): string[] {
    const routes = new Set<string>();

    issues.forEach(issue => {
      if (issue.location) {
        // ルート名を抽出
        if (issue.location.startsWith('/')) {
          routes.add(issue.location);
        } else if (issue.type === 'router') {
          routes.add(issue.location);
        } else {
          // コンポーネント名からルートを推測
          const routeMatch = issue.location.match(/\/[\w-]+/g);
          if (routeMatch) {
            routeMatch.forEach(r => routes.add(r));
          }
        }
      }
    });

    // ルートが検出されない場合は全体に影響
    if (routes.size === 0) {
      return ['/*'];
    }

    return Array.from(routes);
  }

  /**
   * Manusへ自動レポート送信
   */
  async sendReport(
    report: DiagnosticReport,
    context: 'prod' | 'dev' | 'test' = 'prod',
    systemInfo: SelfRepairRequest['systemInfo']
  ): Promise<SelfRepairResponse> {
    const severity = this.determineSeverity(report);
    const allIssues = [...report.uiIssues, ...report.apiIssues, ...report.deployIssues];
    const routesAffected = this.detectAffectedRoutes(allIssues);

    const request: SelfRepairRequest = {
      report,
      severity,
      context,
      routesAffected,
      timestamp: Date.now(),
      systemInfo,
    };

    // レポート履歴に記録
    this.reportHistory.push(request);

    console.log('[SelfReportLayer] Sending repair request to Manus:', {
      severity,
      context,
      routesAffected,
      issuesCount: allIssues.length,
      systemHealth: report.systemHealth.overall,
    });

    try {
      // Manusへ送信（実際のエンドポイントは環境に応じて変更）
      const response = await fetch(this.manusEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to send report: ${response.statusText}`);
      }

      const result: SelfRepairResponse = await response.json();

      console.log('[SelfReportLayer] Repair request sent successfully:', result);

      return result;
    } catch (error) {
      console.error('[SelfReportLayer] Failed to send repair request:', error);

      // フォールバック: ローカルログに記録
      console.warn('[SelfReportLayer] Repair request logged locally:', request);

      return {
        success: false,
        message: `Failed to send report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * レポート履歴を取得
   */
  getReportHistory(): SelfRepairRequest[] {
    return [...this.reportHistory];
  }

  /**
   * レポート履歴をクリア
   */
  clearReportHistory(): void {
    this.reportHistory = [];
  }

  /**
   * 最新のレポートを取得
   */
  getLatestReport(): SelfRepairRequest | null {
    return this.reportHistory.length > 0
      ? this.reportHistory[this.reportHistory.length - 1]
      : null;
  }

  /**
   * 自動レポート送信の判定
   * システムヘルスが閾値を下回った場合に自動送信
   */
  shouldAutoReport(report: DiagnosticReport, threshold: number = 70): boolean {
    return report.systemHealth.overall < threshold;
  }
}

// シングルトンインスタンス
export const selfReportLayer = new SelfReportLayer();
