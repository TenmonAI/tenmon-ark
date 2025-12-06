import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * LP専用 ErrorBoundary
 * 
 * vΩ-FIX STEP 6: LPページのエラーを捕捉して詳細を表示
 */
export class LPErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LP ErrorBoundary] Caught error:', error);
    console.error('[LP ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-2xl w-full">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-6">
              <h1 className="text-2xl font-bold text-destructive mb-4">
                エラーが発生しました
              </h1>
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">エラーメッセージ:</h2>
                  <pre className="bg-background p-4 rounded border overflow-x-auto text-sm">
                    {this.state.error?.message || '不明なエラー'}
                  </pre>
                </div>
                
                {this.state.error?.stack && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">スタックトレース:</h2>
                    <pre className="bg-background p-4 rounded border overflow-x-auto text-xs max-h-64 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
                
                {this.state.errorInfo && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">コンポーネントスタック:</h2>
                    <pre className="bg-background p-4 rounded border overflow-x-auto text-xs max-h-64 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
                
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    ページを再読み込み
                  </button>
                  <button
                    onClick={() => {
                      this.setState({ hasError: false, error: null, errorInfo: null });
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
