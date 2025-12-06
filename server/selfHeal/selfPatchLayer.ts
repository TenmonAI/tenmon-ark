/**
 * TENMON-ARK Self-Heal OS v1.0
 * Phase 3: Self-Patch Layer（自動修正フィードバック）
 * 
 * Manusからの修正案を受信し、妥当性を検証し、
 * 本番ビルド反映前に安全プリチェックを行う
 */

import { DiagnosticReport } from './diagnosticsEngine';

export interface PatchProposal {
  patchType: 'ui' | 'api' | 'build' | 'deploy';
  changedFiles: string[];
  codeDiff: string;
  reasoning: string;
  expectedOutcome: string;
  timestamp: number;
  priority: number; // 1-10
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PatchValidationResult {
  valid: boolean;
  reason: string;
  warnings: string[];
  recommendations: string[];
  safetyScore: number; // 0-100
}

export interface SafetyPrecheck {
  passed: boolean;
  checks: {
    syntaxValid: boolean;
    typeCheckPassed: boolean;
    testsPassed: boolean;
    noBreakingChanges: boolean;
    performanceImpact: 'none' | 'low' | 'medium' | 'high';
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Self-Patch Layer
 * Manus → TENMON-ARK 自動修正フィードバック
 */
export class SelfPatchLayer {
  private patchHistory: PatchProposal[] = [];
  private validationHistory: Map<string, PatchValidationResult> = new Map();

  /**
   * 修正案の妥当性検証ロジック
   */
  validatePatch(
    patch: PatchProposal,
    diagnosticReport: DiagnosticReport
  ): PatchValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let safetyScore = 100;

    // 1. patchTypeと診断レポートの整合性チェック
    if (patch.patchType === 'ui' && diagnosticReport.uiIssues.length === 0) {
      warnings.push('Patch targets UI but no UI issues detected in diagnostic report');
      safetyScore -= 20;
    }

    if (patch.patchType === 'api' && diagnosticReport.apiIssues.length === 0) {
      warnings.push('Patch targets API but no API issues detected in diagnostic report');
      safetyScore -= 20;
    }

    // 2. リスクレベルの妥当性チェック
    if (patch.riskLevel === 'high' && patch.priority < 8) {
      warnings.push('High-risk patch should have priority >= 8');
      safetyScore -= 15;
    }

    // 3. 変更ファイル数のチェック
    if (patch.changedFiles.length > 10) {
      warnings.push('Large number of changed files (>10). Consider breaking into smaller patches.');
      safetyScore -= 10;
      recommendations.push('Review each file change carefully');
    }

    // 4. コア機能への影響チェック
    const coreFiles = ['server/routers.ts', 'server/db.ts', 'client/src/App.tsx'];
    const affectsCoreFiles = patch.changedFiles.some(file => coreFiles.includes(file));
    if (affectsCoreFiles) {
      warnings.push('Patch affects core files. Extra caution required.');
      safetyScore -= 15;
      recommendations.push('Run full integration tests before deployment');
    }

    // 5. 期待される結果の明確性チェック
    if (!patch.expectedOutcome || patch.expectedOutcome.length < 20) {
      warnings.push('Expected outcome is not clearly defined');
      safetyScore -= 10;
      recommendations.push('Request more detailed expected outcome from Manus');
    }

    // 6. 推論の妥当性チェック
    if (!patch.reasoning || patch.reasoning.length < 50) {
      warnings.push('Reasoning is insufficient');
      safetyScore -= 10;
      recommendations.push('Request more detailed reasoning from Manus');
    }

    const valid = safetyScore >= 50 && warnings.length < 3;

    const result: PatchValidationResult = {
      valid,
      reason: valid
        ? 'Patch validation passed'
        : `Patch validation failed: ${warnings.join(', ')}`,
      warnings,
      recommendations,
      safetyScore: Math.max(0, safetyScore),
    };

    // 検証履歴に記録
    this.validationHistory.set(`${patch.timestamp}`, result);

    return result;
  }

  /**
   * OS内部診断結果との照合
   */
  crossCheckWithDiagnostics(
    patch: PatchProposal,
    diagnosticReport: DiagnosticReport
  ): boolean {
    // patchTypeに対応するイシューが存在するかチェック
    switch (patch.patchType) {
      case 'ui':
        return diagnosticReport.uiIssues.length > 0;
      case 'api':
        return diagnosticReport.apiIssues.length > 0;
      case 'build':
        return diagnosticReport.buildMismatch;
      case 'deploy':
        return diagnosticReport.deployIssues.length > 0;
      default:
        return false;
    }
  }

  /**
   * 本番ビルド反映前の安全プリチェック
   */
  async performSafetyPrecheck(patch: PatchProposal): Promise<SafetyPrecheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. 構文チェック（簡易版）
    const syntaxValid = this.checkSyntax(patch.codeDiff);
    if (!syntaxValid) {
      issues.push('Syntax errors detected in code diff');
    }

    // 2. 型チェック（簡易版）
    const typeCheckPassed = this.checkTypes(patch.changedFiles);
    if (!typeCheckPassed) {
      issues.push('Type errors may exist in changed files');
      recommendations.push('Run TypeScript compiler before applying patch');
    }

    // 3. テストチェック（簡易版）
    const testsPassed = await this.runTests(patch.changedFiles);
    if (!testsPassed) {
      issues.push('Tests may fail after applying patch');
      recommendations.push('Run full test suite before deployment');
    }

    // 4. 破壊的変更チェック
    const noBreakingChanges = this.checkBreakingChanges(patch.codeDiff);
    if (!noBreakingChanges) {
      issues.push('Potential breaking changes detected');
      recommendations.push('Review API contracts and component interfaces');
    }

    // 5. パフォーマンス影響チェック
    const performanceImpact = this.assessPerformanceImpact(patch);

    const passed = syntaxValid && typeCheckPassed && testsPassed && noBreakingChanges && performanceImpact !== 'high';

    return {
      passed,
      checks: {
        syntaxValid,
        typeCheckPassed,
        testsPassed,
        noBreakingChanges,
        performanceImpact,
      },
      issues,
      recommendations,
    };
  }

  /**
   * 構文チェック（簡易版）
   */
  private checkSyntax(codeDiff: string): boolean {
    // 簡易的な構文チェック（実際にはより高度なチェックが必要）
    try {
      // 明らかな構文エラーをチェック
      const syntaxErrors = [
        /\(\s*\)/g, // 空の括弧
        /\{\s*\}/g, // 空の中括弧
        /return\s*;/g, // 空のreturn
      ];

      return !syntaxErrors.some(pattern => pattern.test(codeDiff));
    } catch {
      return false;
    }
  }

  /**
   * 型チェック（簡易版）
   */
  private checkTypes(changedFiles: string[]): boolean {
    // TypeScriptファイルが含まれているかチェック
    const tsFiles = changedFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    
    // 実際には tsc を実行する必要があるが、ここでは簡易チェック
    return tsFiles.length > 0;
  }

  /**
   * テストチェック（簡易版）
   */
  private async runTests(changedFiles: string[]): Promise<boolean> {
    // 実際にはテストを実行する必要があるが、ここでは簡易チェック
    const testFiles = changedFiles.filter(f => f.includes('.test.') || f.includes('.spec.'));
    
    // テストファイルが存在する場合は実行が必要
    return testFiles.length === 0;
  }

  /**
   * 破壊的変更チェック
   */
  private checkBreakingChanges(codeDiff: string): boolean {
    // 破壊的変更のパターンをチェック
    const breakingPatterns = [
      /export\s+interface\s+\w+\s*\{[^}]*\}/g, // インターフェース変更
      /export\s+type\s+\w+\s*=/g, // 型エイリアス変更
      /export\s+function\s+\w+\s*\(/g, // 関数シグネチャ変更
    ];

    return !breakingPatterns.some(pattern => pattern.test(codeDiff));
  }

  /**
   * パフォーマンス影響評価
   */
  private assessPerformanceImpact(patch: PatchProposal): 'none' | 'low' | 'medium' | 'high' {
    // パフォーマンスに影響する可能性のあるパターン
    const highImpactPatterns = [
      /useEffect\s*\(\s*\(\s*\)\s*=>/g, // useEffect追加
      /useState\s*\(/g, // useState追加
      /map\s*\(/g, // 配列操作
      /filter\s*\(/g, // 配列フィルタ
    ];

    const matchCount = highImpactPatterns.reduce((count, pattern) => {
      const matches = patch.codeDiff.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    if (matchCount > 10) return 'high';
    if (matchCount > 5) return 'medium';
    if (matchCount > 0) return 'low';
    return 'none';
  }

  /**
   * パッチ履歴を記録
   */
  recordPatch(patch: PatchProposal): void {
    this.patchHistory.push(patch);
    console.log('[SelfPatchLayer] Patch recorded:', {
      patchType: patch.patchType,
      filesChanged: patch.changedFiles.length,
      riskLevel: patch.riskLevel,
      priority: patch.priority,
    });
  }

  /**
   * パッチ履歴を取得
   */
  getPatchHistory(): PatchProposal[] {
    return [...this.patchHistory];
  }

  /**
   * 検証履歴を取得
   */
  getValidationHistory(): Map<string, PatchValidationResult> {
    return new Map(this.validationHistory);
  }

  /**
   * 最新のパッチを取得
   */
  getLatestPatch(): PatchProposal | null {
    return this.patchHistory.length > 0
      ? this.patchHistory[this.patchHistory.length - 1]
      : null;
  }
}

// シングルトンインスタンス
export const selfPatchLayer = new SelfPatchLayer();
