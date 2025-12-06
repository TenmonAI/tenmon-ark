/**
 * TENMON-ARK Self-Heal OS v1.0
 * Phase 1: Diagnostics Engine（診断エンジン）
 * 
 * TENMON-ARK内部で以下をリアルタイム監視する診断エンジン:
 * - UIレンダーツリー（React 19仕様準拠チェック）
 * - 条件付きレンダリングのnull/undefined返却
 * - tRPC入出力
 * - APIレスポンス（4xx, 5xx）
 * - 本番のindex-*.jsの不一致（ビルド/キャッシュ差分）
 * - LP-QAのレスポンスフロー
 * - Router階層
 * - 状態管理（global store不整合）
 * - Manifest/SWのキャッシュ不整合
 * - DOMクラッシュ（Invalid Node）
 */

export interface DiagnosticIssue {
  type: 'ui' | 'api' | 'build' | 'deploy' | 'router' | 'state' | 'cache' | 'dom';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location?: string;
  stackTrace?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface DiagnosticReport {
  timestamp: number;
  uiIssues: DiagnosticIssue[];
  apiIssues: DiagnosticIssue[];
  deployIssues: DiagnosticIssue[];
  buildMismatch: boolean;
  buildMismatchDetails?: {
    expected: string;
    actual: string;
    diff: string[];
  };
  suggestions: string[];
  systemHealth: {
    overall: number; // 0-100
    ui: number;
    api: number;
    build: number;
    deploy: number;
  };
}

/**
 * Diagnostics Engine Core
 * すべての異常をJSON レポート化する
 */
export class DiagnosticsEngine {
  private issues: DiagnosticIssue[] = [];
  private buildHash: string | null = null;
  private deployedBuildHash: string | null = null;

  /**
   * UIレンダーツリー監視（React 19仕様準拠チェック）
   */
  checkUIRenderTree(componentName: string, returnValue: unknown): DiagnosticIssue | null {
    // React 19では条件付きレンダリングで<></>を返すとエラー
    // null を返すべき
    if (returnValue === undefined) {
      return {
        type: 'ui',
        severity: 'critical',
        message: `Component "${componentName}" returned undefined. React 19 requires null for conditional rendering.`,
        location: componentName,
        timestamp: Date.now(),
        context: { returnValue: 'undefined' },
      };
    }

    // 空のフラグメント<></>の検出
    if (typeof returnValue === 'object' && returnValue !== null) {
      const obj = returnValue as Record<string, unknown>;
      if (obj.type === Symbol.for('react.fragment') && !obj.props) {
        return {
          type: 'ui',
          severity: 'high',
          message: `Component "${componentName}" returned empty fragment <>...</>. Consider returning null instead.`,
          location: componentName,
          timestamp: Date.now(),
          context: { returnValue: 'empty fragment' },
        };
      }
    }

    return null;
  }

  /**
   * tRPC入出力監視
   */
  checkTRPCIO(
    procedure: string,
    input: unknown,
    output: unknown,
    error?: Error
  ): DiagnosticIssue | null {
    if (error) {
      return {
        type: 'api',
        severity: 'high',
        message: `tRPC procedure "${procedure}" failed: ${error.message}`,
        location: procedure,
        stackTrace: error.stack,
        timestamp: Date.now(),
        context: { input, error: error.message },
      };
    }

    // 出力の型チェック
    if (output === undefined) {
      return {
        type: 'api',
        severity: 'medium',
        message: `tRPC procedure "${procedure}" returned undefined. Consider returning null or a proper value.`,
        location: procedure,
        timestamp: Date.now(),
        context: { input, output: 'undefined' },
      };
    }

    return null;
  }

  /**
   * APIレスポンス監視（4xx, 5xx）
   */
  checkAPIResponse(
    endpoint: string,
    statusCode: number,
    response: unknown,
    error?: Error
  ): DiagnosticIssue | null {
    if (statusCode >= 500) {
      return {
        type: 'api',
        severity: 'critical',
        message: `API endpoint "${endpoint}" returned 5xx error: ${statusCode}`,
        location: endpoint,
        stackTrace: error?.stack,
        timestamp: Date.now(),
        context: { statusCode, response, error: error?.message },
      };
    }

    if (statusCode >= 400) {
      return {
        type: 'api',
        severity: statusCode === 404 ? 'low' : 'medium',
        message: `API endpoint "${endpoint}" returned 4xx error: ${statusCode}`,
        location: endpoint,
        timestamp: Date.now(),
        context: { statusCode, response },
      };
    }

    return null;
  }

  /**
   * 本番index-*.jsの不一致検知（ビルド/キャッシュ差分）
   */
  checkBuildMismatch(expectedHash: string, actualHash: string): DiagnosticIssue | null {
    this.buildHash = expectedHash;
    this.deployedBuildHash = actualHash;

    if (expectedHash !== actualHash) {
      return {
        type: 'build',
        severity: 'critical',
        message: `Build mismatch detected. Expected: ${expectedHash}, Actual: ${actualHash}`,
        location: 'build',
        timestamp: Date.now(),
        context: { expectedHash, actualHash },
      };
    }

    return null;
  }

  /**
   * LP-QAレスポンスフロー監視
   */
  checkLPQAResponse(response: unknown, error?: Error): DiagnosticIssue | null {
    if (error) {
      return {
        type: 'api',
        severity: 'high',
        message: `LP-QA response failed: ${error.message}`,
        location: 'LP-QA',
        stackTrace: error.stack,
        timestamp: Date.now(),
        context: { error: error.message },
      };
    }

    // レスポンスの妥当性チェック
    if (!response || typeof response !== 'object') {
      return {
        type: 'api',
        severity: 'medium',
        message: 'LP-QA response is invalid or empty',
        location: 'LP-QA',
        timestamp: Date.now(),
        context: { response },
      };
    }

    return null;
  }

  /**
   * Router階層監視
   */
  checkRouterHierarchy(route: string, exists: boolean): DiagnosticIssue | null {
    if (!exists) {
      return {
        type: 'router',
        severity: 'medium',
        message: `Route "${route}" does not exist`,
        location: route,
        timestamp: Date.now(),
        context: { route, exists },
      };
    }

    return null;
  }

  /**
   * 状態管理（global store不整合）監視
   */
  checkStateConsistency(
    storeName: string,
    expectedState: unknown,
    actualState: unknown
  ): DiagnosticIssue | null {
    if (JSON.stringify(expectedState) !== JSON.stringify(actualState)) {
      return {
        type: 'state',
        severity: 'high',
        message: `State inconsistency detected in "${storeName}"`,
        location: storeName,
        timestamp: Date.now(),
        context: { expectedState, actualState },
      };
    }

    return null;
  }

  /**
   * Manifest/SWキャッシュ不整合監視
   */
  checkCacheConsistency(
    cacheName: string,
    expectedVersion: string,
    actualVersion: string
  ): DiagnosticIssue | null {
    if (expectedVersion !== actualVersion) {
      return {
        type: 'cache',
        severity: 'medium',
        message: `Cache inconsistency detected in "${cacheName}". Expected: ${expectedVersion}, Actual: ${actualVersion}`,
        location: cacheName,
        timestamp: Date.now(),
        context: { expectedVersion, actualVersion },
      };
    }

    return null;
  }

  /**
   * DOMクラッシュ（Invalid Node）監視
   */
  checkDOMCrash(error: Error, element?: string): DiagnosticIssue | null {
    if (error.message.includes('Invalid') || error.message.includes('Node')) {
      return {
        type: 'dom',
        severity: 'critical',
        message: `DOM crash detected: ${error.message}`,
        location: element || 'unknown',
        stackTrace: error.stack,
        timestamp: Date.now(),
        context: { error: error.message, element },
      };
    }

    return null;
  }

  /**
   * 診断イシューを記録
   */
  recordIssue(issue: DiagnosticIssue | null): void {
    if (issue) {
      this.issues.push(issue);
      console.warn('[DiagnosticsEngine] Issue detected:', issue);
    }
  }

  /**
   * システムヘルススコアを計算（0-100）
   */
  private calculateHealthScore(issues: DiagnosticIssue[], type?: DiagnosticIssue['type']): number {
    const filteredIssues = type ? issues.filter(i => i.type === type) : issues;

    if (filteredIssues.length === 0) return 100;

    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
    };

    const totalDeduction = filteredIssues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * 修正提案を生成
   */
  private generateSuggestions(issues: DiagnosticIssue[]): string[] {
    const suggestions: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      suggestions.push(`🔥 ${criticalIssues.length} critical issues detected. Immediate action required.`);
    }

    const uiIssues = issues.filter(i => i.type === 'ui');
    if (uiIssues.length > 0) {
      suggestions.push(`🎨 Fix ${uiIssues.length} UI rendering issues. Check React 19 compliance.`);
    }

    const apiIssues = issues.filter(i => i.type === 'api');
    if (apiIssues.length > 0) {
      suggestions.push(`🔌 Fix ${apiIssues.length} API issues. Check tRPC procedures and endpoints.`);
    }

    const buildIssues = issues.filter(i => i.type === 'build');
    if (buildIssues.length > 0) {
      suggestions.push(`🏗️ Fix ${buildIssues.length} build issues. Run clean build and verify deployment.`);
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ All systems operational. No issues detected.');
    }

    return suggestions;
  }

  /**
   * JSON診断レポート生成
   */
  generateReport(): DiagnosticReport {
    const uiIssues = this.issues.filter(i => i.type === 'ui');
    const apiIssues = this.issues.filter(i => i.type === 'api');
    const deployIssues = this.issues.filter(i => i.type === 'deploy');
    const buildMismatch = this.buildHash !== null && this.deployedBuildHash !== null && this.buildHash !== this.deployedBuildHash;

    const report: DiagnosticReport = {
      timestamp: Date.now(),
      uiIssues,
      apiIssues,
      deployIssues,
      buildMismatch,
      buildMismatchDetails: buildMismatch ? {
        expected: this.buildHash!,
        actual: this.deployedBuildHash!,
        diff: [`Expected: ${this.buildHash}`, `Actual: ${this.deployedBuildHash}`],
      } : undefined,
      suggestions: this.generateSuggestions(this.issues),
      systemHealth: {
        overall: this.calculateHealthScore(this.issues),
        ui: this.calculateHealthScore(this.issues, 'ui'),
        api: this.calculateHealthScore(this.issues, 'api'),
        build: this.calculateHealthScore(this.issues, 'build'),
        deploy: this.calculateHealthScore(this.issues, 'deploy'),
      },
    };

    return report;
  }

  /**
   * イシューをクリア
   */
  clearIssues(): void {
    this.issues = [];
  }

  /**
   * 全イシューを取得
   */
  getAllIssues(): DiagnosticIssue[] {
    return [...this.issues];
  }
}

// シングルトンインスタンス
export const diagnosticsEngine = new DiagnosticsEngine();
