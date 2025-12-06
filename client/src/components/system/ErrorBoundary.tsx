/**
 * Enhanced Error Boundary for React Error #185 Detection
 * 壊れたコンポーネントを特定するログ機能付き
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // React Error #185の詳細ログ
    console.error('🚨 [Error Boundary] Caught error:', error);
    console.error('📍 [Error Boundary] Component stack:', errorInfo.componentStack);
    
    // エラーメッセージの解析
    const errorMessage = error.message || error.toString();
    const isReactError185 = errorMessage.includes('Minified React error #185');
    
    if (isReactError185) {
      console.error('🔥 [React Error #185 Detected]');
      console.error('原因: 無効なノードがReactツリーに返されています');
      console.error('可能性: undefined, 空のreturn, 壊れたLayout階層');
    }

    // コンポーネントスタックの解析
    const componentStack = errorInfo.componentStack || '';
    const componentNames = this.extractComponentNames(componentStack);
    console.error('🎯 [Broken Components]:', componentNames);

    // エラーカウント更新
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // カスタムエラーハンドラ呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // ローカルストレージにエラーログを保存
    this.saveErrorLog(error, errorInfo, componentNames);
  }

  extractComponentNames(componentStack: string): string[] {
    const lines = componentStack.split('\n');
    const componentNames: string[] = [];
    
    for (const line of lines) {
      const match = line.match(/at (\w+)/);
      if (match && match[1]) {
        componentNames.push(match[1]);
      }
    }
    
    return componentNames;
  }

  saveErrorLog(error: Error, errorInfo: ErrorInfo, componentNames: string[]) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      brokenComponents: componentNames,
      errorCount: this.state.errorCount + 1,
    };

    try {
      const existingLogs = localStorage.getItem('react_error_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);
      
      // 最新10件のみ保存
      if (logs.length > 10) {
        logs.shift();
      }
      
      localStorage.setItem('react_error_logs', JSON.stringify(logs));
      console.log('💾 [Error Log Saved]:', errorLog);
    } catch (e) {
      console.error('Failed to save error log:', e);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIがある場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトエラーUI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-2xl w-full p-8 bg-card border-destructive">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 rounded-full bg-destructive/20">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  エラーが発生しました
                </h1>
                <p className="text-muted-foreground">
                  アプリケーションで予期しないエラーが発生しました。
                </p>
              </div>

              {/* エラー詳細（開発環境のみ） */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full p-4 bg-muted rounded-lg text-left overflow-auto max-h-64">
                  <p className="text-sm font-mono text-destructive mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  再試行
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  ホームに戻る
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                エラーログは開発者ツールのコンソールで確認できます
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
