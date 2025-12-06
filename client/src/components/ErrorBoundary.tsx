import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Store error info in state
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8 border border-destructive/20 rounded-lg">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-2 font-semibold">エラーが発生しました</h2>
            <p className="text-sm text-muted-foreground mb-6">アプリケーションで予期しないエラーが発生しました。</p>

            {/* Error Message */}
            <div className="w-full mb-4">
              <h3 className="text-sm font-medium mb-2">エラーメッセージ:</h3>
              <div className="p-3 rounded bg-muted">
                <pre className="text-xs text-destructive whitespace-pre-wrap break-words">
                  {this.state.error?.message || 'Unknown error'}
                </pre>
              </div>
            </div>

            {/* Error Stack */}
            <div className="w-full mb-4">
              <h3 className="text-sm font-medium mb-2">スタックトレース:</h3>
              <div className="p-3 rounded bg-muted max-h-40 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {this.state.error?.stack || 'No stack trace available'}
                </pre>
              </div>
            </div>

            {/* Component Stack */}
            {this.state.errorInfo && (
              <div className="w-full mb-6">
                <h3 className="text-sm font-medium mb-2">コンポーネントスタック:</h3>
                <div className="p-3 rounded bg-muted max-h-40 overflow-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer transition-opacity"
                )}
              >
                <RotateCcw size={16} />
                再試行
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 cursor-pointer transition-opacity"
                )}
              >
                <Home size={16} />
                ホームに戻る
              </button>
            </div>

            {/* Debug Info */}
            <div className="mt-6 text-xs text-muted-foreground">
              エラーログは開発者ツールのコンソールでも確認できます
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
