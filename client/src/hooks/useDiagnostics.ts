/**
 * TENMON-ARK Self-Heal OS v1.0
 * Phase 1: Frontend Diagnostics Hook
 * 
 * フロントエンドでのリアルタイム診断を行うReact Hook
 */

import { useEffect, useRef } from 'react';

export interface FrontendDiagnosticIssue {
  type: 'ui' | 'api' | 'router' | 'state' | 'dom';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location?: string;
  stackTrace?: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

class FrontendDiagnosticsEngine {
  private issues: FrontendDiagnosticIssue[] = [];
  private listeners: Array<(issues: FrontendDiagnosticIssue[]) => void> = [];

  constructor() {
    // グローバルエラーハンドラー
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.recordError(event.error, 'dom');
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.recordError(new Error(event.reason), 'api');
      });

      // React Error Boundary互換
      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        const message = args.join(' ');
        
        // React 19エラーの検知
        if (message.includes('Minified React error #185')) {
          this.recordIssue({
            type: 'ui',
            severity: 'critical',
            message: 'React Error #185: Component returned undefined. Should return null instead.',
            location: 'React Component',
            timestamp: Date.now(),
            context: { args },
          });
        }

        originalConsoleError.apply(console, args);
      };
    }
  }

  recordError(error: Error, type: FrontendDiagnosticIssue['type']): void {
    const issue: FrontendDiagnosticIssue = {
      type,
      severity: 'high',
      message: error.message,
      stackTrace: error.stack,
      timestamp: Date.now(),
      context: { error: error.message },
    };

    this.recordIssue(issue);
  }

  recordIssue(issue: FrontendDiagnosticIssue): void {
    this.issues.push(issue);
    console.warn('[FrontendDiagnostics] Issue detected:', issue);
    this.notifyListeners();
  }

  subscribe(listener: (issues: FrontendDiagnosticIssue[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.issues]));
  }

  getAllIssues(): FrontendDiagnosticIssue[] {
    return [...this.issues];
  }

  clearIssues(): void {
    this.issues = [];
    this.notifyListeners();
  }

  getSystemHealth(): number {
    if (this.issues.length === 0) return 100;

    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
    };

    const totalDeduction = this.issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }
}

// シングルトンインスタンス
export const frontendDiagnosticsEngine = new FrontendDiagnosticsEngine();

/**
 * フロントエンド診断Hook
 */
export function useDiagnostics() {
  const issuesRef = useRef<FrontendDiagnosticIssue[]>([]);

  useEffect(() => {
    const unsubscribe = frontendDiagnosticsEngine.subscribe((issues) => {
      issuesRef.current = issues;
    });

    return unsubscribe;
  }, []);

  return {
    issues: issuesRef.current,
    recordIssue: (issue: FrontendDiagnosticIssue) => frontendDiagnosticsEngine.recordIssue(issue),
    clearIssues: () => frontendDiagnosticsEngine.clearIssues(),
    systemHealth: frontendDiagnosticsEngine.getSystemHealth(),
  };
}

/**
 * React Component診断用ラッパー
 */
export function withDiagnostics<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function DiagnosticsWrapper(props: P) {
    try {
      const result = Component(props);

      // undefined返却の検知
      if (result === undefined) {
        frontendDiagnosticsEngine.recordIssue({
          type: 'ui',
          severity: 'critical',
          message: `Component "${componentName}" returned undefined. React 19 requires null for conditional rendering.`,
          location: componentName,
          timestamp: Date.now(),
          context: { returnValue: 'undefined' },
        });
        return null;
      }

      return result;
    } catch (error) {
      frontendDiagnosticsEngine.recordError(error as Error, 'ui');
      return null;
    }
  };
}
