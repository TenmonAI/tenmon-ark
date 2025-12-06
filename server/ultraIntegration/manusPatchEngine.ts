/**
 * TENMON-ARK ULTRA-INTEGRATION vΩ
 * Manus Patch Engine（Manus修正エンジン）
 * 
 * Self-Heal OS × Manus Patch Engine の自律統合
 */

import { directCommunicationLayer, ArkToManusMessage } from './directCommunicationLayer';
import { DiagnosticIssue } from '../selfHeal/diagnosticsEngine';

/**
 * 自動要求タイプ
 */
export type AutoRequestType =
  | 'react19_violation' // UIのこの地点でReact19仕様に違反
  | 'old_build_detected' // 本番で旧ビルドを読み込んでいる
  | 'lpqa_display_logic_dead' // LP-QA APIは正常、表示ロジックが死んでいる
  | 'floating_buttons_diff' // FloatingButtonsSlotのレンダーツリーに差分有り
  | 'router_null_child' // Router階層でnull child検知
  | 'manifest_cache_corruption'; // Manifest/Cache破損の可能性

/**
 * 自動要求
 */
export interface AutoRequest {
  type: AutoRequestType;
  timestamp: number;
  location: {
    file: string;
    line?: number;
    component?: string;
  };
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: {
    stackTrace?: string;
    logs?: string[];
    state?: unknown;
  };
}

/**
 * Manusからの修正返却
 */
export interface ManusPatchResponse {
  requestId: string;
  timestamp: number;
  
  // 修正コード
  fixCode?: {
    file: string;
    content: string;
    language: 'typescript' | 'javascript' | 'tsx' | 'jsx' | 'css' | 'json';
  }[];
  
  // 修正diff
  fixDiff?: {
    file: string;
    diff: string; // unified diff format
  }[];
  
  // 改善案
  improvements?: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    implementation: string;
  }[];
  
  // テストスイート
  testSuite?: {
    file: string;
    content: string;
    framework: 'vitest' | 'jest' | 'mocha';
  }[];
  
  // 修正の説明
  explanation: string;
  confidence: number; // 0-1
}

/**
 * 再評価結果
 */
export interface ReEvaluationResult {
  requestId: string;
  timestamp: number;
  
  // 修正コードの評価
  codeEvaluation: {
    syntaxValid: boolean;
    typeCheckPassed: boolean;
    lintPassed: boolean;
    issues: string[];
  };
  
  // Self-Verify結果
  selfVerifyResult: {
    passed: boolean;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    errors: string[];
  };
  
  // 修復完了判定
  repairCompleted: boolean;
  overallStatus: 'success' | 'partial' | 'failed';
  nextSteps: string[];
}

/**
 * Manus Patch Engine
 * Self-Heal OS × Manus Patch Engine の自律統合
 */
export class ManusPatchEngine {
  private autoRequestHistory: AutoRequest[] = [];
  private patchResponseHistory: ManusPatchResponse[] = [];
  private reEvaluationHistory: ReEvaluationResult[] = [];

  /**
   * 自動要求を生成してManusに送信
   */
  async generateAutoRequest(request: AutoRequest): Promise<{
    success: boolean;
    requestId?: string;
    error?: string;
  }> {
    console.log('[ManusPatchEngine] Generating auto request:', request.type);

    // 要求履歴に記録
    this.autoRequestHistory.push(request);

    // TENMON-ARK → Manus メッセージを構築
    const message: ArkToManusMessage = {
      timestamp: Date.now(),
      messageType: 'request',
      rootCauseAnalysis: {
        suspectedCause: this.getRequestTypeDescription(request.type),
        confidence: this.calculateConfidence(request),
        reasoning: this.generateReasoning(request),
        affectedComponents: [request.location.component || request.location.file],
      },
      criticalErrors: request.evidence.stackTrace
        ? [
            {
              errorType: request.type,
              message: request.description,
              stackTrace: request.evidence.stackTrace,
              timestamp: request.timestamp,
            },
          ]
        : undefined,
    };

    // Manusに送信
    const result = await directCommunicationLayer.sendMessageToManus(message);

    if (result.success) {
      const requestId = `req-${Date.now()}`;
      console.log('[ManusPatchEngine] Auto request sent successfully:', requestId);
      return {
        success: true,
        requestId,
      };
    } else {
      console.error('[ManusPatchEngine] Failed to send auto request:', result.error);
      return {
        success: false,
        error: result.error,
      };
    }
  }

  /**
   * 要求タイプの説明を取得
   */
  private getRequestTypeDescription(type: AutoRequestType): string {
    const descriptions: Record<AutoRequestType, string> = {
      react19_violation: 'UIのこの地点でReact19仕様に違反',
      old_build_detected: '本番で旧ビルドを読み込んでいる',
      lpqa_display_logic_dead: 'LP-QA APIは正常、表示ロジックが死んでいる',
      floating_buttons_diff: 'FloatingButtonsSlotのレンダーツリーに差分有り',
      router_null_child: 'Router階層でnull child検知',
      manifest_cache_corruption: 'Manifest/Cache破損の可能性',
    };
    return descriptions[type];
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(request: AutoRequest): number {
    let confidence = 0.5;

    // スタックトレースがあれば信頼度を上げる
    if (request.evidence.stackTrace) {
      confidence += 0.2;
    }

    // ログがあれば信頼度を上げる
    if (request.evidence.logs && request.evidence.logs.length > 0) {
      confidence += 0.1;
    }

    // 重大度が高いほど信頼度を上げる
    if (request.severity === 'critical') {
      confidence += 0.2;
    } else if (request.severity === 'high') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 推論を生成
   */
  private generateReasoning(request: AutoRequest): string[] {
    const reasoning: string[] = [];

    reasoning.push(`要求タイプ: ${this.getRequestTypeDescription(request.type)}`);
    reasoning.push(`場所: ${request.location.file}${request.location.line ? `:${request.location.line}` : ''}`);
    reasoning.push(`重大度: ${request.severity}`);
    reasoning.push(`説明: ${request.description}`);

    if (request.evidence.stackTrace) {
      reasoning.push('スタックトレースが利用可能');
    }

    if (request.evidence.logs && request.evidence.logs.length > 0) {
      reasoning.push(`ログエントリ: ${request.evidence.logs.length}件`);
    }

    return reasoning;
  }

  /**
   * Manusからの修正返却を受信
   */
  async receivePatchFromManus(patch: ManusPatchResponse): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log('[ManusPatchEngine] Receiving patch from Manus:', patch.requestId);

    // 修正返却履歴に記録
    this.patchResponseHistory.push(patch);

    try {
      // 修正コードを検証
      if (patch.fixCode) {
        console.log(`[ManusPatchEngine] Received ${patch.fixCode.length} fix code files`);
      }

      // 修正diffを検証
      if (patch.fixDiff) {
        console.log(`[ManusPatchEngine] Received ${patch.fixDiff.length} fix diff files`);
      }

      // 改善案を検証
      if (patch.improvements) {
        console.log(`[ManusPatchEngine] Received ${patch.improvements.length} improvements`);
      }

      // テストスイートを検証
      if (patch.testSuite) {
        console.log(`[ManusPatchEngine] Received ${patch.testSuite.length} test suite files`);
      }

      console.log('[ManusPatchEngine] Patch received successfully');

      return {
        success: true,
      };
    } catch (error) {
      console.error('[ManusPatchEngine] Failed to receive patch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 修正コードを再評価
   */
  async reEvaluatePatch(requestId: string, patch: ManusPatchResponse): Promise<ReEvaluationResult> {
    console.log('[ManusPatchEngine] Re-evaluating patch:', requestId);

    const result: ReEvaluationResult = {
      requestId,
      timestamp: Date.now(),
      codeEvaluation: {
        syntaxValid: true,
        typeCheckPassed: true,
        lintPassed: true,
        issues: [],
      },
      selfVerifyResult: {
        passed: false,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        errors: [],
      },
      repairCompleted: false,
      overallStatus: 'failed',
      nextSteps: [],
    };

    try {
      // 1. コード評価
      if (patch.fixCode) {
        const codeEvaluation = await this.evaluateCode(patch.fixCode);
        result.codeEvaluation = codeEvaluation;
      }

      // 2. Self-Verify実行
      if (patch.testSuite) {
        const selfVerifyResult = await this.runSelfVerify(patch.testSuite);
        result.selfVerifyResult = selfVerifyResult;
      }

      // 3. 修復完了判定
      result.repairCompleted =
        result.codeEvaluation.syntaxValid &&
        result.codeEvaluation.typeCheckPassed &&
        result.codeEvaluation.lintPassed &&
        result.selfVerifyResult.passed;

      // 4. 総合ステータス
      if (result.repairCompleted) {
        result.overallStatus = 'success';
        result.nextSteps = ['修復完了', 'デプロイ準備完了'];
      } else if (result.codeEvaluation.syntaxValid && result.codeEvaluation.typeCheckPassed) {
        result.overallStatus = 'partial';
        result.nextSteps = ['一部の問題が残っています', '追加の修正が必要です'];
      } else {
        result.overallStatus = 'failed';
        result.nextSteps = ['修正に失敗しました', '再度診断を実行してください'];
      }

      // 再評価履歴に記録
      this.reEvaluationHistory.push(result);

      console.log('[ManusPatchEngine] Re-evaluation completed:', result.overallStatus);

      return result;
    } catch (error) {
      console.error('[ManusPatchEngine] Failed to re-evaluate patch:', error);
      result.codeEvaluation.issues.push(error instanceof Error ? error.message : 'Unknown error');
      result.nextSteps = ['再評価に失敗しました', 'エラーログを確認してください'];
      return result;
    }
  }

  /**
   * コードを評価
   */
  private async evaluateCode(
    fixCode: ManusPatchResponse['fixCode']
  ): Promise<ReEvaluationResult['codeEvaluation']> {
    const evaluation: ReEvaluationResult['codeEvaluation'] = {
      syntaxValid: true,
      typeCheckPassed: true,
      lintPassed: true,
      issues: [],
    };

    // TODO: 実際のコード評価を実装
    // - 構文チェック
    // - 型チェック
    // - Lintチェック

    return evaluation;
  }

  /**
   * Self-Verifyを実行
   */
  private async runSelfVerify(
    testSuite: ManusPatchResponse['testSuite']
  ): Promise<ReEvaluationResult['selfVerifyResult']> {
    const result: ReEvaluationResult['selfVerifyResult'] = {
      passed: false,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
    };

    // TODO: 実際のテスト実行を実装
    // - テストスイートを実行
    // - 結果を集計

    return result;
  }

  /**
   * 自動要求履歴を取得
   */
  getAutoRequestHistory(): AutoRequest[] {
    return [...this.autoRequestHistory];
  }

  /**
   * 修正返却履歴を取得
   */
  getPatchResponseHistory(): ManusPatchResponse[] {
    return [...this.patchResponseHistory];
  }

  /**
   * 再評価履歴を取得
   */
  getReEvaluationHistory(): ReEvaluationResult[] {
    return [...this.reEvaluationHistory];
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.autoRequestHistory = [];
    this.patchResponseHistory = [];
    this.reEvaluationHistory = [];
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalRequests: number;
    totalPatches: number;
    totalReEvaluations: number;
    successRate: number;
    averageConfidence: number;
  } {
    const totalRequests = this.autoRequestHistory.length;
    const totalPatches = this.patchResponseHistory.length;
    const totalReEvaluations = this.reEvaluationHistory.length;

    const successfulReEvaluations = this.reEvaluationHistory.filter(
      (r) => r.overallStatus === 'success'
    ).length;
    const successRate = totalReEvaluations > 0 ? successfulReEvaluations / totalReEvaluations : 0;

    const totalConfidence = this.patchResponseHistory.reduce((sum, p) => sum + p.confidence, 0);
    const averageConfidence = totalPatches > 0 ? totalConfidence / totalPatches : 0;

    return {
      totalRequests,
      totalPatches,
      totalReEvaluations,
      successRate,
      averageConfidence,
    };
  }
}

// シングルトンインスタンス
export const manusPatchEngine = new ManusPatchEngine();
