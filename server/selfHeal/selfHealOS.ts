/**
 * TENMON-ARK Self-Heal OS v1.0
 * 統合レイヤー（全Phase統合）
 * 
 * Phase 1-5を統合し、完全自律型OSとして機能させる
 */

import { diagnosticsEngine, DiagnosticReport } from './diagnosticsEngine';
import { selfReportLayer, SelfRepairRequest, SelfRepairResponse } from './selfReportLayer';
import { selfPatchLayer, PatchProposal, PatchValidationResult, SafetyPrecheck } from './selfPatchLayer';
import { selfVerifyEngine, VerificationResult, SelfHealConfirmation } from './selfVerifyEngine';
import { selfEvolveFoundation, EvolutionMetrics, PredictiveAlert, OptimizationSuggestion } from './selfEvolveFoundation';

export interface SelfHealCycle {
  cycleId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  steps: {
    diagnostics: DiagnosticReport | null;
    report: SelfRepairRequest | null;
    patch: PatchProposal | null;
    validation: PatchValidationResult | null;
    safetyCheck: SafetyPrecheck | null;
    verification: VerificationResult | null;
    confirmation: SelfHealConfirmation | null;
  };
  evolutionMetrics?: EvolutionMetrics;
}

export interface SelfHealStatus {
  isHealthy: boolean;
  systemHealth: number; // 0-100
  activeCycles: number;
  totalCyclesCompleted: number;
  successRate: number; // 0-100
  evolutionMetrics: EvolutionMetrics;
  predictiveAlerts: PredictiveAlert[];
  optimizationSuggestions: OptimizationSuggestion[];
  lastCycle?: SelfHealCycle;
}

/**
 * Self-Heal OS
 * 完全自律型OS統合レイヤー
 */
export class SelfHealOS {
  private cycles: Map<string, SelfHealCycle> = new Map();
  private activeCycles: Set<string> = new Set();
  private completedCycles: number = 0;
  private successfulCycles: number = 0;

  /**
   * 自動診断を実行
   */
  async runDiagnostics(): Promise<DiagnosticReport> {
    console.log('[SelfHealOS] Running diagnostics...');
    const report = diagnosticsEngine.generateReport();
    console.log('[SelfHealOS] Diagnostics completed:', {
      systemHealth: report.systemHealth.overall,
      issuesCount: report.uiIssues.length + report.apiIssues.length + report.deployIssues.length,
    });
    return report;
  }

  /**
   * Manusへ自動レポート送信
   */
  async sendRepairRequest(
    report: DiagnosticReport,
    context: 'prod' | 'dev' | 'test' = 'prod'
  ): Promise<SelfRepairResponse> {
    console.log('[SelfHealOS] Sending repair request to Manus...');
    
    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      buildHash: process.env.BUILD_HASH,
    };

    const response = await selfReportLayer.sendReport(report, context, systemInfo);
    console.log('[SelfHealOS] Repair request sent:', response);
    
    return response;
  }

  /**
   * パッチを検証
   */
  async validatePatch(
    patch: PatchProposal,
    report: DiagnosticReport
  ): Promise<PatchValidationResult> {
    console.log('[SelfHealOS] Validating patch...');
    const validation = selfPatchLayer.validatePatch(patch, report);
    console.log('[SelfHealOS] Patch validation completed:', {
      valid: validation.valid,
      safetyScore: validation.safetyScore,
      warnings: validation.warnings.length,
    });
    return validation;
  }

  /**
   * 安全プリチェックを実行
   */
  async performSafetyCheck(patch: PatchProposal): Promise<SafetyPrecheck> {
    console.log('[SelfHealOS] Performing safety precheck...');
    const safetyCheck = await selfPatchLayer.performSafetyPrecheck(patch);
    console.log('[SelfHealOS] Safety precheck completed:', {
      passed: safetyCheck.passed,
      issues: safetyCheck.issues.length,
    });
    return safetyCheck;
  }

  /**
   * 修正後の検証を実行
   */
  async verifyRepair(
    originalReport: DiagnosticReport,
    patch: PatchProposal
  ): Promise<VerificationResult> {
    console.log('[SelfHealOS] Verifying repair...');
    const verification = await selfVerifyEngine.performVerification(originalReport, patch);
    console.log('[SelfHealOS] Verification completed:', {
      passed: verification.passed,
      overallScore: verification.overallScore,
    });
    return verification;
  }

  /**
   * Self-Heal確認を生成
   */
  generateConfirmation(verification: VerificationResult): SelfHealConfirmation {
    console.log('[SelfHealOS] Generating Self-Heal confirmation...');
    const confirmation = selfVerifyEngine.generateSelfHealConfirmation(verification);
    console.log('[SelfHealOS] Confirmation generated:', confirmation.message);
    return confirmation;
  }

  /**
   * 失敗から学習
   */
  learnFromFailure(
    report: DiagnosticReport,
    patch: PatchProposal,
    verification: VerificationResult
  ): void {
    console.log('[SelfHealOS] Learning from failure...');
    
    const allIssues = [...report.uiIssues, ...report.apiIssues, ...report.deployIssues];
    allIssues.forEach(issue => {
      selfEvolveFoundation.learnFromFailure(issue, patch, verification);
    });

    console.log('[SelfHealOS] Learning completed');
  }

  /**
   * 予測的ヒーリング
   */
  predictIssues(report: DiagnosticReport): PredictiveAlert[] {
    console.log('[SelfHealOS] Predicting issues...');
    const alerts = selfEvolveFoundation.predictIssues(report);
    console.log('[SelfHealOS] Prediction completed:', {
      alertsCount: alerts.length,
    });
    return alerts;
  }

  /**
   * 最適化提案を生成
   */
  generateOptimizations(
    report: DiagnosticReport,
    performanceMetrics?: {
      pageLoadTime: number;
      apiResponseTime: number;
      buildTime: number;
    }
  ): OptimizationSuggestion[] {
    console.log('[SelfHealOS] Generating optimization suggestions...');
    const suggestions = selfEvolveFoundation.generateOptimizationSuggestions(report, performanceMetrics);
    console.log('[SelfHealOS] Optimization suggestions generated:', {
      suggestionsCount: suggestions.length,
    });
    return suggestions;
  }

  /**
   * 完全なSelf-Healサイクルを実行
   */
  async runSelfHealCycle(
    context: 'prod' | 'dev' | 'test' = 'prod'
  ): Promise<SelfHealCycle> {
    const cycleId = `cycle-${Date.now()}`;
    const cycle: SelfHealCycle = {
      cycleId,
      startTime: Date.now(),
      status: 'running',
      steps: {
        diagnostics: null,
        report: null,
        patch: null,
        validation: null,
        safetyCheck: null,
        verification: null,
        confirmation: null,
      },
    };

    this.cycles.set(cycleId, cycle);
    this.activeCycles.add(cycleId);

    console.log(`[SelfHealOS] Starting Self-Heal cycle: ${cycleId}`);

    try {
      // Step 1: 診断
      cycle.steps.diagnostics = await this.runDiagnostics();

      // 自動レポート送信の判定
      if (selfReportLayer.shouldAutoReport(cycle.steps.diagnostics)) {
        // Step 2: レポート送信
        const repairResponse = await this.sendRepairRequest(cycle.steps.diagnostics, context);
        cycle.steps.report = selfReportLayer.getLatestReport();

        if (repairResponse.success && repairResponse.repairId) {
          // Step 3: パッチ受信（実際にはManusから受信する）
          // ここでは仮のパッチを使用
          const patch: PatchProposal = {
            patchType: 'ui',
            changedFiles: [],
            codeDiff: '',
            reasoning: 'Auto-generated patch',
            expectedOutcome: 'Fix detected issues',
            timestamp: Date.now(),
            priority: 8,
            riskLevel: 'low',
          };
          cycle.steps.patch = patch;

          // Step 4: パッチ検証
          cycle.steps.validation = await this.validatePatch(patch, cycle.steps.diagnostics);

          if (cycle.steps.validation.valid) {
            // Step 5: 安全プリチェック
            cycle.steps.safetyCheck = await this.performSafetyCheck(patch);

            if (cycle.steps.safetyCheck.passed) {
              // Step 6: 修正後の検証
              cycle.steps.verification = await this.verifyRepair(cycle.steps.diagnostics, patch);

              // Step 7: Self-Heal確認
              cycle.steps.confirmation = this.generateConfirmation(cycle.steps.verification);

              // Step 8: 失敗から学習
              this.learnFromFailure(cycle.steps.diagnostics, patch, cycle.steps.verification);

              if (cycle.steps.confirmation.confirmed) {
                cycle.status = 'completed';
                this.successfulCycles++;
                console.log(`[SelfHealOS] Self-Heal cycle completed successfully: ${cycleId}`);
              } else {
                cycle.status = 'failed';
                console.warn(`[SelfHealOS] Self-Heal cycle failed: ${cycleId}`);
              }
            } else {
              cycle.status = 'failed';
              console.warn(`[SelfHealOS] Safety precheck failed: ${cycleId}`);
            }
          } else {
            cycle.status = 'failed';
            console.warn(`[SelfHealOS] Patch validation failed: ${cycleId}`);
          }
        } else {
          cycle.status = 'failed';
          console.warn(`[SelfHealOS] Repair request failed: ${cycleId}`);
        }
      } else {
        // システムヘルスが良好な場合はサイクルを完了
        cycle.status = 'completed';
        this.successfulCycles++;
        console.log(`[SelfHealOS] System health is good. No repair needed: ${cycleId}`);
      }

      // 進化メトリクスを記録
      cycle.evolutionMetrics = selfEvolveFoundation.getEvolutionMetrics();

      cycle.endTime = Date.now();
      this.completedCycles++;
      this.activeCycles.delete(cycleId);

      return cycle;
    } catch (error) {
      cycle.status = 'failed';
      cycle.endTime = Date.now();
      this.completedCycles++;
      this.activeCycles.delete(cycleId);

      console.error(`[SelfHealOS] Self-Heal cycle error: ${cycleId}`, error);
      throw error;
    }
  }

  /**
   * Self-Heal OSのステータスを取得
   */
  getStatus(): SelfHealStatus {
    const evolutionMetrics = selfEvolveFoundation.getEvolutionMetrics();
    const predictiveAlerts = selfEvolveFoundation.getPredictiveAlerts();
    const optimizationSuggestions = selfEvolveFoundation.getOptimizationSuggestions();

    const latestReport = diagnosticsEngine.generateReport();
    const successRate = this.completedCycles > 0
      ? Math.round((this.successfulCycles / this.completedCycles) * 100)
      : 100;

    const lastCycleId = Array.from(this.cycles.keys()).pop();
    const lastCycle = lastCycleId ? this.cycles.get(lastCycleId) : undefined;

    return {
      isHealthy: latestReport.systemHealth.overall >= 70,
      systemHealth: latestReport.systemHealth.overall,
      activeCycles: this.activeCycles.size,
      totalCyclesCompleted: this.completedCycles,
      successRate,
      evolutionMetrics,
      predictiveAlerts,
      optimizationSuggestions,
      lastCycle,
    };
  }

  /**
   * サイクル履歴を取得
   */
  getCycleHistory(): SelfHealCycle[] {
    return Array.from(this.cycles.values());
  }

  /**
   * 特定のサイクルを取得
   */
  getCycle(cycleId: string): SelfHealCycle | undefined {
    return this.cycles.get(cycleId);
  }
}

// シングルトンインスタンス
export const selfHealOS = new SelfHealOS();
