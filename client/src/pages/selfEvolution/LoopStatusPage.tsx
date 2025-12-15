/**
 * Loop Status Page
 * 自己進化ループの状態を表示
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { runCycle, fetchCycleHistory, type CycleLog, type CycleHistoryResponse } from '@/lib/selfEvolution/loop';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

export default function LoopStatusPage() {
  const { user } = useAuth();
  const [latestCycle, setLatestCycle] = useState<CycleLog | null>(null);
  const [cycleHistory, setCycleHistory] = useState<CycleLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoApply, setAutoApply] = useState(false);
  
  const isFounder = user && (user.plan === 'founder' || user.plan === 'dev');

  useEffect(() => {
    loadCycleHistory();
  }, []);

  const loadCycleHistory = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCycleHistory(10);
      setLatestCycle(data.latest);
      setCycleHistory(data.cycles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サイクル履歴の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCycle = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const cycleLog = await runCycle({ autoApply: autoApply && isFounder });
      setLatestCycle(cycleLog);
      
      // 履歴を再読み込み
      await loadCycleHistory();

      if (cycleLog.status === 'completed') {
        toast.success('進化サイクルが完了しました');
      } else if (cycleLog.status === 'failed') {
        toast.error(`進化サイクルが失敗しました: ${cycleLog.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '進化サイクルの実行に失敗しました';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'running':
        return '実行中';
      case 'failed':
        return '失敗';
      default:
        return '不明';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Self-Evolution Loop</h1>
        <p className="text-muted-foreground">
          自己進化ループの状態と履歴
        </p>
      </div>

      {/* 手動実行コントロール */}
      {isFounder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              進化サイクル実行
            </CardTitle>
            <CardDescription>
              手動で進化サイクルを開始します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoApply"
                checked={autoApply}
                onCheckedChange={(checked) => setAutoApply(checked === true)}
              />
              <Label htmlFor="autoApply" className="cursor-pointer">
                自動適用を有効にする（Founderのみ）
              </Label>
            </div>
            <Button
              onClick={handleRunCycle}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  実行中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  進化サイクル開始
                </>
              )}
            </Button>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 最新のサイクル状態 */}
      {latestCycle ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                最新の進化サイクル
              </CardTitle>
              <Badge className={getStatusColor(latestCycle.status)}>
                {getStatusLabel(latestCycle.status)}
              </Badge>
            </div>
            <CardDescription>
              開始: {new Date(latestCycle.startedAt).toLocaleString('ja-JP')}
              {latestCycle.completedAt && (
                <> • 完了: {new Date(latestCycle.completedAt).toLocaleString('ja-JP')}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* サマリー */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">改善タスク数</p>
                <p className="text-2xl font-bold">{latestCycle.summary.totalTasks}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">自動修復可能</p>
                <p className="text-2xl font-bold text-green-600">
                  {latestCycle.summary.autoFixableCount}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">適用済み</p>
                <p className="text-2xl font-bold text-blue-600">
                  {latestCycle.summary.appliedCount}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">保留中</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {latestCycle.summary.pendingCount}
                </p>
              </div>
            </div>

            {/* エラー表示 */}
            {latestCycle.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-semibold mb-1">エラー</p>
                <p className="text-xs text-red-500">{latestCycle.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            まだ進化サイクルが実行されていません
          </CardContent>
        </Card>
      )}

      {/* サイクル履歴 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              サイクル履歴
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadCycleHistory}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cycleHistory.length > 0 ? (
            <div className="space-y-2">
              {cycleHistory.map((cycle) => (
                <div
                  key={cycle.id}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(cycle.status)}>
                          {getStatusLabel(cycle.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(cycle.startedAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>タスク: {cycle.summary.totalTasks}</span>
                        <span>修復可能: {cycle.summary.autoFixableCount}</span>
                        <span>適用: {cycle.summary.appliedCount}</span>
                        <span>保留: {cycle.summary.pendingCount}</span>
                      </div>
                    </div>
                    {cycle.status === 'running' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                    {cycle.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {cycle.status === 'failed' && (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              サイクル履歴がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

