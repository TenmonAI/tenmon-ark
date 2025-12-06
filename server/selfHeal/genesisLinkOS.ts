/**
 * TENMON-ARK Self-Heal OS vΩ
 * Genesis Link OS（創世統合版）
 * 
 * Self-Heal × Direct Link × SSL Repair の完全統合
 */

import { selfHealOS, SelfHealStatus, SelfHealCycle } from './selfHealOS';
import { directLinkLayer, SharedMemory } from './directLinkLayer';
import { sslRepairEngine, SSLDiagnosticResult } from './sslRepairEngine';
import { diagnosticsEngine, DiagnosticReport } from './diagnosticsEngine';
import { selfEvolveFoundation, EvolutionMetrics } from './selfEvolveFoundation';

/**
 * Genesis Link OS ステータス
 */
export interface GenesisLinkStatus {
  // Self-Heal OS
  selfHeal: SelfHealStatus;

  // Direct Link Layer
  directLink: {
    arkToManus: {
      available: boolean;
      lastRequest: number | null;
    };
    manusToArk: {
      available: boolean;
      lastQuery: number | null;
    };
    sharedMemory: SharedMemory;
  };

  // SSL Repair
  sslRepair: {
    lastDiagnostics: SSLDiagnosticResult | null;
    lastRepair: number | null;
    currentStatus: 'secure' | 'insecure' | 'partial' | 'unknown';
  };

  // 全体統合結果
  overall: {
    systemStability: number; // 0-100
    weaknesses: string[];
    recommendations: string[];
    lastUpdate: number;
  };
}

/**
 * Genesis Link OS Report
 */
export interface GenesisLinkReport {
  // Self-Diagnostics Engine
  selfDiagnostics: {
    status: 'operational' | 'degraded' | 'failed';
    details: DiagnosticReport;
  };

  // Direct Link Layer
  directLinkLayer: {
    arkToManus: {
      status: 'connected' | 'disconnected' | 'error';
      capabilities: string[];
    };
    manusToArk: {
      status: 'connected' | 'disconnected' | 'error';
      capabilities: string[];
    };
    sharedMemory: {
      status: 'synchronized' | 'out-of-sync' | 'error';
      data: SharedMemory;
    };
  };

  // SSL Diagnostics
  sslDiagnostics: {
    step1: SSLCertificateInfo | null;
    step2: ServerHTTPSConfig;
    step3: DNSConfig;
    fixPlan: string[];
    finalStatus: 'secure' | 'insecure' | 'partial' | 'unknown';
  };

  // Self-Heal Loop
  selfHealLoop: {
    diagnostics: 'completed' | 'in-progress' | 'failed';
    patchApplied: boolean;
    verifyStatus: 'passed' | 'failed' | 'pending';
  };

  // 全体統合結果
  overallIntegration: {
    systemStability: number; // 0-100
    weaknesses: string[];
    recommendations: string[];
  };
}

// SSL診断結果の型をインポート
import type {
  SSLCertificateInfo,
  ServerHTTPSConfig,
  DNSConfig,
} from './sslRepairEngine';

/**
 * Genesis Link OS
 * 完全自律型OS（Self-Heal × Self-Evolve × Direct Link × SSL Repair）
 */
export class GenesisLinkOS {
  private lastArkToManusRequest: number | null = null;
  private lastManusToArkQuery: number | null = null;
  private lastSSLRepair: number | null = null;
  private lastSSLDiagnostics: SSLDiagnosticResult | null = null;

  /**
   * Genesis Link OSのステータスを取得
   */
  async getStatus(): Promise<GenesisLinkStatus> {
    console.log('[GenesisLinkOS] Getting status...');

    // Self-Heal OSステータス
    const selfHealStatus = selfHealOS.getStatus();

    // Direct Link Layerステータス
    const sharedMemory = await directLinkLayer.getSharedMemory();

    // SSL Repairステータス
    const sslStatus = this.lastSSLDiagnostics
      ? this.lastSSLDiagnostics.overallStatus
      : 'unknown';

    // システム安定性を計算
    const systemStability = this.calculateSystemStability(
      selfHealStatus,
      sharedMemory,
      sslStatus
    );

    // 弱点を特定
    const weaknesses = this.identifyWeaknesses(selfHealStatus, sslStatus);

    // 推奨改善を生成
    const recommendations = this.generateRecommendations(weaknesses);

    return {
      selfHeal: selfHealStatus,
      directLink: {
        arkToManus: {
          available: true,
          lastRequest: this.lastArkToManusRequest,
        },
        manusToArk: {
          available: true,
          lastQuery: this.lastManusToArkQuery,
        },
        sharedMemory,
      },
      sslRepair: {
        lastDiagnostics: this.lastSSLDiagnostics,
        lastRepair: this.lastSSLRepair,
        currentStatus: sslStatus,
      },
      overall: {
        systemStability,
        weaknesses,
        recommendations,
        lastUpdate: Date.now(),
      },
    };
  }

  /**
   * システム安定性を計算
   */
  private calculateSystemStability(
    selfHealStatus: SelfHealStatus,
    sharedMemory: SharedMemory,
    sslStatus: string
  ): number {
    let stability = 0;

    // Self-Heal OSの貢献（40%）
    stability += selfHealStatus.systemHealth * 0.4;

    // Direct Link Layerの貢献（30%）
    const directLinkHealth =
      sharedMemory.selfHealState.status === 'completed' ? 100 : 50;
    stability += directLinkHealth * 0.3;

    // SSL Repairの貢献（30%）
    const sslHealth =
      sslStatus === 'secure' ? 100 : sslStatus === 'partial' ? 70 : 30;
    stability += sslHealth * 0.3;

    return Math.round(stability);
  }

  /**
   * 弱点を特定
   */
  private identifyWeaknesses(
    selfHealStatus: SelfHealStatus,
    sslStatus: string
  ): string[] {
    const weaknesses: string[] = [];

    if (selfHealStatus.systemHealth < 70) {
      weaknesses.push('Self-Heal system health is below threshold');
    }

    if (selfHealStatus.successRate < 80) {
      weaknesses.push('Self-Heal success rate is low');
    }

    if (sslStatus !== 'secure') {
      weaknesses.push('SSL/HTTPS configuration is not fully secure');
    }

    if (selfHealStatus.predictiveAlerts.length > 5) {
      weaknesses.push('High number of predictive alerts detected');
    }

    return weaknesses;
  }

  /**
   * 推奨改善を生成
   */
  private generateRecommendations(weaknesses: string[]): string[] {
    const recommendations: string[] = [];

    weaknesses.forEach((weakness) => {
      if (weakness.includes('Self-Heal system health')) {
        recommendations.push('Run diagnostics and address critical issues');
      }

      if (weakness.includes('success rate')) {
        recommendations.push(
          'Review Self-Heal cycle failures and improve patch validation'
        );
      }

      if (weakness.includes('SSL/HTTPS')) {
        recommendations.push('Run SSL repair and renew certificates');
      }

      if (weakness.includes('predictive alerts')) {
        recommendations.push(
          'Address predictive alerts to prevent future issues'
        );
      }
    });

    return recommendations;
  }

  /**
   * 完全な診断レポートを生成
   */
  async generateFullReport(): Promise<GenesisLinkReport> {
    console.log('[GenesisLinkOS] Generating full report...');

    // Self-Diagnostics
    const diagnosticReport = await selfHealOS.runDiagnostics();
    const selfDiagnosticsStatus =
      diagnosticReport.systemHealth.overall >= 70
        ? 'operational'
        : diagnosticReport.systemHealth.overall >= 50
        ? 'degraded'
        : 'failed';

    // Direct Link Layer
    const sharedMemory = await directLinkLayer.getSharedMemory();

    // SSL Diagnostics
    if (!this.lastSSLDiagnostics) {
      this.lastSSLDiagnostics = await sslRepairEngine.runDiagnostics();
    }

    // Self-Heal Loop
    const selfHealStatus = selfHealOS.getStatus();
    const lastCycle = selfHealStatus.lastCycle;

    const report: GenesisLinkReport = {
      selfDiagnostics: {
        status: selfDiagnosticsStatus,
        details: diagnosticReport,
      },
      directLinkLayer: {
        arkToManus: {
          status: 'connected',
          capabilities: [
            'build_diff',
            'lpqa_logs',
            'index_js_status',
            'deploy_status',
            'repair_guidance',
            'optimization_advice',
          ],
        },
        manusToArk: {
          status: 'connected',
          capabilities: [
            'ui_render_tree',
            'error_node_location',
            'lpqa_response_status',
            'system_diagnostics',
            'self_heal_state',
          ],
        },
        sharedMemory: {
          status: 'synchronized',
          data: sharedMemory,
        },
      },
      sslDiagnostics: {
        step1: this.lastSSLDiagnostics.step1_certificate,
        step2: this.lastSSLDiagnostics.step2_serverConfig,
        step3: this.lastSSLDiagnostics.step3_dns,
        fixPlan: this.lastSSLDiagnostics.recommendations,
        finalStatus: this.lastSSLDiagnostics.overallStatus,
      },
      selfHealLoop: {
        diagnostics: lastCycle ? 'completed' : 'in-progress',
        patchApplied: lastCycle?.steps.patch !== null,
        verifyStatus: lastCycle?.steps.verification?.passed
          ? 'passed'
          : lastCycle?.steps.verification
          ? 'failed'
          : 'pending',
      },
      overallIntegration: {
        systemStability: await this.calculateSystemStability(
          selfHealStatus,
          sharedMemory,
          this.lastSSLDiagnostics.overallStatus
        ),
        weaknesses: this.identifyWeaknesses(
          selfHealStatus,
          this.lastSSLDiagnostics.overallStatus
        ),
        recommendations: this.generateRecommendations(
          this.identifyWeaknesses(
            selfHealStatus,
            this.lastSSLDiagnostics.overallStatus
          )
        ),
      },
    };

    console.log('[GenesisLinkOS] Full report generated');
    return report;
  }

  /**
   * 完全な自律修復サイクルを実行
   */
  async runFullAutonomousCycle(): Promise<{
    selfHealCycle: SelfHealCycle;
    sslRepair: {
      diagnostics: SSLDiagnosticResult;
      renewal: { success: boolean; message: string } | null;
      verification: { secure: boolean; protocol: string; cipher: string } | null;
      overallSuccess: boolean;
    };
    directLinkSync: boolean;
    overallSuccess: boolean;
  }> {
    console.log('[GenesisLinkOS] Running full autonomous cycle...');

    // Phase 1: Self-Heal Cycle
    const selfHealCycle = await selfHealOS.runSelfHealCycle('prod');

    // Phase 2: SSL Repair
    const sslRepair = await sslRepairEngine.runFullRepair();
    this.lastSSLDiagnostics = sslRepair.diagnostics;
    this.lastSSLRepair = Date.now();

    // Phase 3: Direct Link Sync
    let directLinkSync = false;
    try {
      if (selfHealCycle.steps.diagnostics) {
        await directLinkLayer.saveDiagnostics(selfHealCycle.steps.diagnostics);
      }

      if (selfHealCycle.steps.patch) {
        await directLinkLayer.saveRepairPlan(selfHealCycle.steps.patch);
      }

      await directLinkLayer.saveSelfHealState({
        status: selfHealCycle.status === 'completed' ? 'completed' : 'failed',
        currentPhase: 'autonomous_cycle',
        progress: 100,
        lastUpdate: Date.now(),
        errors: [],
      });

      directLinkSync = true;
    } catch (error) {
      console.error('[GenesisLinkOS] Failed to sync direct link:', error);
    }

    const overallSuccess =
      selfHealCycle.status === 'completed' &&
      sslRepair.overallSuccess &&
      directLinkSync;

    console.log('[GenesisLinkOS] Full autonomous cycle completed:', {
      overallSuccess,
      selfHealSuccess: selfHealCycle.status === 'completed',
      sslRepairSuccess: sslRepair.overallSuccess,
      directLinkSync,
    });

    return {
      selfHealCycle,
      sslRepair,
      directLinkSync,
      overallSuccess,
    };
  }

  /**
   * ARK → Manus リクエストを記録
   */
  recordArkToManusRequest(): void {
    this.lastArkToManusRequest = Date.now();
  }

  /**
   * Manus → ARK クエリを記録
   */
  recordManusToArkQuery(): void {
    this.lastManusToArkQuery = Date.now();
  }

  /**
   * 進化メトリクスを取得
   */
  getEvolutionMetrics(): EvolutionMetrics {
    return selfEvolveFoundation.getEvolutionMetrics();
  }

  /**
   * システムの完全リセット
   */
  async resetSystem(): Promise<void> {
    console.log('[GenesisLinkOS] Resetting system...');

    // Self-Heal OSのクリア
    diagnosticsEngine.clearIssues();

    // Direct Link Layerのクリア
    await directLinkLayer.clearSharedMemory();

    // SSL診断結果のクリア
    this.lastSSLDiagnostics = null;
    this.lastSSLRepair = null;

    // リクエスト履歴のクリア
    this.lastArkToManusRequest = null;
    this.lastManusToArkQuery = null;

    console.log('[GenesisLinkOS] System reset completed');
  }
}

// シングルトンインスタンス
export const genesisLinkOS = new GenesisLinkOS();
