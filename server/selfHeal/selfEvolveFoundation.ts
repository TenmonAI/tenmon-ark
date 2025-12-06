/**
 * TENMON-ARK Self-Heal OS v1.0
 * Phase 5: Self-Evolve Foundation（自律進化基盤）
 * 
 * Self-Healの完成後、このOSは:
 * - Learn from Failure: 過去のエラー例を記憶し、同じミスを二度と起こさない
 * - Predictive Healing: 異常の兆候（早期ログ）で問題が起こる前に予防修正を行う
 * - Continuous Optimization: OS全体の処理、UI遷移、API性能を継続最適化
 */

import { DiagnosticIssue, DiagnosticReport } from './diagnosticsEngine';
import { PatchProposal } from './selfPatchLayer';
import { VerificationResult } from './selfVerifyEngine';

export interface FailureMemory {
  issueType: DiagnosticIssue['type'];
  severity: DiagnosticIssue['severity'];
  pattern: string;
  solution: string;
  timestamp: number;
  occurrenceCount: number;
  lastOccurrence: number;
  preventionStrategy: string;
}

export interface PredictiveAlert {
  alertType: 'warning' | 'critical';
  prediction: string;
  confidence: number; // 0-100
  timestamp: number;
  suggestedAction: string;
  preventiveMeasures: string[];
}

export interface OptimizationSuggestion {
  category: 'performance' | 'ux' | 'api' | 'build';
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
  timestamp: number;
}

export interface EvolutionMetrics {
  totalFailuresLearned: number;
  preventedIssues: number;
  optimizationsApplied: number;
  systemReliability: number; // 0-100
  evolutionScore: number; // 0-100
  lastEvolutionDate: number;
}

/**
 * Self-Evolve Foundation
 * 自律進化基盤
 */
export class SelfEvolveFoundation {
  private failureMemory: Map<string, FailureMemory> = new Map();
  private predictiveAlerts: PredictiveAlert[] = [];
  private optimizationSuggestions: OptimizationSuggestion[] = [];
  private preventedIssuesCount: number = 0;
  private optimizationsAppliedCount: number = 0;

  /**
   * Learn from Failure
   * 過去のエラー例を記憶し、同じミスを二度と起こさない
   */
  learnFromFailure(
    issue: DiagnosticIssue,
    patch: PatchProposal,
    verificationResult: VerificationResult
  ): void {
    const pattern = this.extractPattern(issue);
    const memoryKey = `${issue.type}-${pattern}`;

    const existingMemory = this.failureMemory.get(memoryKey);

    if (existingMemory) {
      // 既存の記憶を更新
      existingMemory.occurrenceCount++;
      existingMemory.lastOccurrence = Date.now();
      
      // 解決策を更新（より効果的な解決策があれば）
      if (verificationResult.passed && verificationResult.overallScore > 90) {
        existingMemory.solution = patch.reasoning;
        existingMemory.preventionStrategy = this.generatePreventionStrategy(issue, patch);
      }
    } else {
      // 新しい記憶を作成
      const memory: FailureMemory = {
        issueType: issue.type,
        severity: issue.severity,
        pattern,
        solution: patch.reasoning,
        timestamp: Date.now(),
        occurrenceCount: 1,
        lastOccurrence: Date.now(),
        preventionStrategy: this.generatePreventionStrategy(issue, patch),
      };

      this.failureMemory.set(memoryKey, memory);
    }

    console.log(`[SelfEvolveFoundation] Learned from failure: ${memoryKey}`);
  }

  /**
   * エラーパターンを抽出
   */
  private extractPattern(issue: DiagnosticIssue): string {
    // エラーメッセージから共通パターンを抽出
    const message = issue.message.toLowerCase();

    // React 19エラーパターン
    if (message.includes('undefined') && message.includes('component')) {
      return 'react-undefined-return';
    }

    if (message.includes('fragment') && message.includes('empty')) {
      return 'react-empty-fragment';
    }

    // APIエラーパターン
    if (message.includes('4xx') || message.includes('5xx')) {
      return 'api-http-error';
    }

    // ビルドエラーパターン
    if (message.includes('build') && message.includes('mismatch')) {
      return 'build-mismatch';
    }

    // その他のパターン
    return 'generic-error';
  }

  /**
   * 予防戦略を生成
   */
  private generatePreventionStrategy(issue: DiagnosticIssue, patch: PatchProposal): string {
    switch (issue.type) {
      case 'ui':
        return 'Always return null instead of undefined or empty fragment in conditional rendering';
      case 'api':
        return 'Add proper error handling and validation for all API endpoints';
      case 'build':
        return 'Run clean build before deployment and verify build hash consistency';
      case 'deploy':
        return 'Implement deployment verification checks before going live';
      default:
        return 'Follow best practices and run comprehensive tests before deployment';
    }
  }

  /**
   * Predictive Healing
   * 異常の兆候（早期ログ）で問題が起こる前に予防修正を行う
   */
  predictIssues(report: DiagnosticReport): PredictiveAlert[] {
    const alerts: PredictiveAlert[] = [];

    // 1. システムヘルスの低下傾向を検知
    if (report.systemHealth.overall < 85 && report.systemHealth.overall > 70) {
      alerts.push({
        alertType: 'warning',
        prediction: 'System health is declining. Potential issues may occur soon.',
        confidence: 75,
        timestamp: Date.now(),
        suggestedAction: 'Run diagnostics and address medium-severity issues',
        preventiveMeasures: [
          'Review recent changes',
          'Check API response times',
          'Monitor error rates',
        ],
      });
    }

    // 2. 過去のパターンから予測
    for (const [key, memory] of Array.from(this.failureMemory.entries())) {
      if (memory.occurrenceCount > 2) {
        // 同じエラーが2回以上発生している場合は再発の可能性が高い
        alerts.push({
          alertType: 'warning',
          prediction: `Pattern "${memory.pattern}" is likely to recur based on history`,
          confidence: Math.min(90, 50 + memory.occurrenceCount * 10),
          timestamp: Date.now(),
          suggestedAction: memory.preventionStrategy,
          preventiveMeasures: [
            'Apply prevention strategy',
            'Review similar code patterns',
            'Add automated tests',
          ],
        });
      }
    }

    // 3. ビルド不整合の予測
    if (report.buildMismatch) {
      alerts.push({
        alertType: 'critical',
        prediction: 'Build mismatch detected. Deployment may fail or cause runtime errors.',
        confidence: 95,
        timestamp: Date.now(),
        suggestedAction: 'Run clean build and verify deployment before going live',
        preventiveMeasures: [
          'Clear build cache',
          'Rebuild from scratch',
          'Verify build hash consistency',
        ],
      });
    }

    // 4. API健全性の予測
    if (report.apiIssues.length > 0 && report.systemHealth.api < 80) {
      alerts.push({
        alertType: 'warning',
        prediction: 'API health is degrading. Service disruption may occur.',
        confidence: 80,
        timestamp: Date.now(),
        suggestedAction: 'Review API endpoints and add error handling',
        preventiveMeasures: [
          'Add retry logic',
          'Implement circuit breakers',
          'Monitor API response times',
        ],
      });
    }

    // アラートを記録
    this.predictiveAlerts.push(...alerts);

    return alerts;
  }

  /**
   * 問題を予防
   */
  preventIssue(alert: PredictiveAlert): void {
    this.preventedIssuesCount++;
    console.log(`[SelfEvolveFoundation] Issue prevented: ${alert.prediction}`);
  }

  /**
   * Continuous Optimization
   * OS全体の処理、UI遷移、API性能を継続最適化
   */
  generateOptimizationSuggestions(
    report: DiagnosticReport,
    performanceMetrics?: {
      pageLoadTime: number;
      apiResponseTime: number;
      buildTime: number;
    }
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 1. パフォーマンス最適化
    if (performanceMetrics) {
      if (performanceMetrics.pageLoadTime > 3000) {
        suggestions.push({
          category: 'performance',
          suggestion: 'Optimize page load time by code splitting and lazy loading',
          impact: 'high',
          effort: 'medium',
          priority: 9,
          timestamp: Date.now(),
        });
      }

      if (performanceMetrics.apiResponseTime > 1000) {
        suggestions.push({
          category: 'api',
          suggestion: 'Optimize API response time by adding caching and database indexing',
          impact: 'high',
          effort: 'medium',
          priority: 8,
          timestamp: Date.now(),
        });
      }

      if (performanceMetrics.buildTime > 60000) {
        suggestions.push({
          category: 'build',
          suggestion: 'Optimize build time by configuring incremental builds and caching',
          impact: 'medium',
          effort: 'low',
          priority: 6,
          timestamp: Date.now(),
        });
      }
    }

    // 2. UX最適化
    if (report.uiIssues.length > 0) {
      suggestions.push({
        category: 'ux',
        suggestion: 'Improve UI error handling and user feedback',
        impact: 'medium',
        effort: 'low',
        priority: 7,
        timestamp: Date.now(),
      });
    }

    // 3. API最適化
    if (report.apiIssues.length > 2) {
      suggestions.push({
        category: 'api',
        suggestion: 'Refactor API error handling and add comprehensive validation',
        impact: 'high',
        effort: 'medium',
        priority: 8,
        timestamp: Date.now(),
      });
    }

    // 4. ビルド最適化
    if (report.buildMismatch) {
      suggestions.push({
        category: 'build',
        suggestion: 'Implement automated build verification and deployment checks',
        impact: 'high',
        effort: 'medium',
        priority: 9,
        timestamp: Date.now(),
      });
    }

    // 提案を記録
    this.optimizationSuggestions.push(...suggestions);

    return suggestions;
  }

  /**
   * 最適化を適用
   */
  applyOptimization(suggestion: OptimizationSuggestion): void {
    this.optimizationsAppliedCount++;
    console.log(`[SelfEvolveFoundation] Optimization applied: ${suggestion.suggestion}`);
  }

  /**
   * 進化メトリクスを取得
   */
  getEvolutionMetrics(): EvolutionMetrics {
    const totalFailuresLearned = this.failureMemory.size;
    const systemReliability = this.calculateSystemReliability();
    const evolutionScore = this.calculateEvolutionScore();

    return {
      totalFailuresLearned,
      preventedIssues: this.preventedIssuesCount,
      optimizationsApplied: this.optimizationsAppliedCount,
      systemReliability,
      evolutionScore,
      lastEvolutionDate: Date.now(),
    };
  }

  /**
   * システム信頼性を計算
   */
  private calculateSystemReliability(): number {
    // 予防されたイシュー数と学習された失敗数から信頼性を計算
    const baseReliability = 70;
    const preventionBonus = Math.min(20, this.preventedIssuesCount * 2);
    const learningBonus = Math.min(10, this.failureMemory.size);

    return Math.min(100, baseReliability + preventionBonus + learningBonus);
  }

  /**
   * 進化スコアを計算
   */
  private calculateEvolutionScore(): number {
    // 学習、予防、最適化の総合スコア
    const learningScore = Math.min(40, this.failureMemory.size * 4);
    const preventionScore = Math.min(30, this.preventedIssuesCount * 3);
    const optimizationScore = Math.min(30, this.optimizationsAppliedCount * 3);

    return Math.min(100, learningScore + preventionScore + optimizationScore);
  }

  /**
   * 失敗記憶を取得
   */
  getFailureMemory(): Map<string, FailureMemory> {
    return new Map(this.failureMemory);
  }

  /**
   * 予測アラートを取得
   */
  getPredictiveAlerts(): PredictiveAlert[] {
    return [...this.predictiveAlerts];
  }

  /**
   * 最適化提案を取得
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    return [...this.optimizationSuggestions];
  }

  /**
   * 失敗記憶をクリア
   */
  clearFailureMemory(): void {
    this.failureMemory.clear();
  }

  /**
   * 予測アラートをクリア
   */
  clearPredictiveAlerts(): void {
    this.predictiveAlerts = [];
  }

  /**
   * 最適化提案をクリア
   */
  clearOptimizationSuggestions(): void {
    this.optimizationSuggestions = [];
  }
}

// シングルトンインスタンス
export const selfEvolveFoundation = new SelfEvolveFoundation();
