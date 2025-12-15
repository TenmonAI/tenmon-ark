/**
 * AutoFix Page
 * 自動修復候補を表示
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Code, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { fetchAutoFixSummary, type AutoFixSummary, type AutoFixableTask, type AutoFixPatch } from '@/lib/selfEvolution/autoFix';
import { applyPatches, type AutoApplyResult } from '@/lib/selfEvolution/autoApply';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

export default function AutoFixPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AutoFixSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPatches, setExpandedPatches] = useState<Set<string>>(new Set());
  const [selectedPatches, setSelectedPatches] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<AutoApplyResult | null>(null);
  
  const isFounder = user && (user.plan === 'founder' || user.plan === 'dev');

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAutoFixSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '自動修復候補の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, []);

  const togglePatch = (patchId: string) => {
    setExpandedPatches(prev => {
      const next = new Set(prev);
      if (next.has(patchId)) {
        next.delete(patchId);
      } else {
        next.add(patchId);
      }
      return next;
    });
  };

  const togglePatchSelection = (patchId: string) => {
    setSelectedPatches(prev => {
      const next = new Set(prev);
      if (next.has(patchId)) {
        next.delete(patchId);
      } else {
        next.add(patchId);
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (!summary || selectedPatches.size === 0) {
      toast.error('適用するパッチを選択してください');
      return;
    }

    if (!commitMessage.trim()) {
      toast.error('コミットメッセージを入力してください');
      return;
    }

    setIsApplying(true);
    setApplyResult(null);

    try {
      // 選択されたパッチを取得
      const patchesToApply: AutoFixPatch[] = [];
      for (const task of summary.tasks) {
        for (const patch of task.patches) {
          if (selectedPatches.has(patch.id)) {
            patchesToApply.push(patch);
          }
        }
      }

      const result = await applyPatches({
        patches: patchesToApply,
        commitMessage: commitMessage.trim(),
      });

      setApplyResult(result);

      if (result.success) {
        toast.success('パッチの適用が完了しました');
        // 選択をクリア
        setSelectedPatches(new Set());
        setCommitMessage('');
      } else {
        toast.error(`パッチの適用に失敗しました: ${result.message}`);
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'パッチの適用に失敗しました');
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const autoFixableTasks = summary.tasks.filter(t => t.autoFixable);
  const nonAutoFixableTasks = summary.tasks.filter(t => !t.autoFixable);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AutoFix Engine</h1>
        <p className="text-muted-foreground">
          自動修復候補 • 最終更新: {new Date(summary.generatedAt).toLocaleString('ja-JP')}
        </p>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              自動修復可能
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summary.autoFixableCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-600" />
              手動対応必要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-600">
              {summary.totalTasks - summary.autoFixableCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 自動修復可能なタスク */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            自動修復候補 ({autoFixableTasks.length}件)
          </h2>
          {isFounder && selectedPatches.size > 0 && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="コミットメッセージ"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-64"
              />
              <Button
                onClick={handleApply}
                disabled={isApplying || !commitMessage.trim()}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    適用中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Approve and Apply ({selectedPatches.size}件)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {autoFixableTasks.length > 0 ? (
            autoFixableTasks.map((autoFixableTask) => (
              <TaskCard
                key={autoFixableTask.task.id}
                autoFixableTask={autoFixableTask}
                expandedPatches={expandedPatches}
                selectedPatches={selectedPatches}
                onTogglePatch={togglePatch}
                onToggleSelection={togglePatchSelection}
                getPriorityColor={getPriorityColor}
                getRiskColor={getRiskColor}
                isFounder={isFounder || false}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                自動修復可能なタスクはありません
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 適用結果ログ */}
      {applyResult && (
        <Card className={applyResult.success ? 'border-green-200' : 'border-red-200'}>
          <CardHeader>
            <CardTitle className={applyResult.success ? 'text-green-600' : 'text-red-600'}>
              {applyResult.success ? '適用成功' : '適用失敗'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{applyResult.message}</p>
            
            {/* 適用結果 */}
            {applyResult.applied.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">適用結果:</p>
                {applyResult.applied.map((result, idx) => (
                  <div key={idx} className="text-xs p-2 rounded bg-muted">
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✓' : '✗'}
                    </span>
                    <span className="ml-2">{result.message}</span>
                    {result.error && (
                      <p className="text-xs text-red-500 mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* コミット結果 */}
            {applyResult.commit && (
              <div>
                <p className="text-sm font-semibold mb-1">コミット結果:</p>
                <div className={`text-xs p-2 rounded ${applyResult.commit.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className={applyResult.commit.success ? 'text-green-600' : 'text-red-600'}>
                    {applyResult.commit.success ? '✓' : '✗'}
                  </span>
                  <span className="ml-2">{applyResult.commit.message}</span>
                  {applyResult.commit.commitHash && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Commit: {applyResult.commit.commitHash}
                    </p>
                  )}
                  {applyResult.commit.error && (
                    <p className="text-xs text-red-500 mt-1">{applyResult.commit.error}</p>
                  )}
                </div>
              </div>
            )}

            {/* プッシュ結果 */}
            {applyResult.push && (
              <div>
                <p className="text-sm font-semibold mb-1">プッシュ結果:</p>
                <div className={`text-xs p-2 rounded ${applyResult.push.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className={applyResult.push.success ? 'text-green-600' : 'text-red-600'}>
                    {applyResult.push.success ? '✓' : '✗'}
                  </span>
                  <span className="ml-2">{applyResult.push.message}</span>
                  {applyResult.push.error && (
                    <p className="text-xs text-red-500 mt-1">{applyResult.push.error}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 手動対応が必要なタスク */}
      {nonAutoFixableTasks.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-gray-600" />
            手動対応が必要なタスク ({nonAutoFixableTasks.length}件)
          </h2>
          <div className="space-y-4">
            {nonAutoFixableTasks.map((autoFixableTask) => (
              <Card key={autoFixableTask.task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{autoFixableTask.task.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {autoFixableTask.task.description}
                      </CardDescription>
                    </div>
                    <Badge className={getPriorityColor(autoFixableTask.task.priority)}>
                      {autoFixableTask.task.priority === 'high' ? '高' : 
                       autoFixableTask.task.priority === 'medium' ? '中' : '低'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {autoFixableTask.reason || '自動修正が困難なタスクです。'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  autoFixableTask: AutoFixableTask;
  expandedPatches: Set<string>;
  selectedPatches: Set<string>;
  onTogglePatch: (patchId: string) => void;
  onToggleSelection: (patchId: string) => void;
  getPriorityColor: (priority: string) => string;
  getRiskColor: (risk: string) => string;
  isFounder: boolean;
}

function TaskCard({
  autoFixableTask,
  expandedPatches,
  selectedPatches,
  onTogglePatch,
  onToggleSelection,
  getPriorityColor,
  getRiskColor,
  isFounder,
}: TaskCardProps) {
  const { task, patches } = autoFixableTask;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription className="mt-1">
              {task.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
            </Badge>
            <Badge variant="outline">{task.category}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* パッチ一覧 */}
        {patches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">生成されたパッチ ({patches.length}件)</p>
            {patches.map((patch) => (
              <PatchCard
                key={patch.id}
                patch={patch}
                isExpanded={expandedPatches.has(patch.id)}
                isSelected={selectedPatches.has(patch.id)}
                onToggle={() => onTogglePatch(patch.id)}
                onToggleSelection={() => onToggleSelection(patch.id)}
                getRiskColor={getRiskColor}
                isFounder={isFounder}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PatchCardProps {
  patch: AutoFixPatch;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onToggleSelection: () => void;
  getRiskColor: (risk: string) => string;
  isFounder: boolean;
}

function PatchCard({ 
  patch, 
  isExpanded, 
  isSelected,
  onToggle, 
  onToggleSelection,
  getRiskColor,
  isFounder,
}: PatchCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Code className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">{patch.description}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {patch.filePath}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getRiskColor(patch.riskLevel)}>
              {patch.riskLevel === 'high' ? '高リスク' : 
               patch.riskLevel === 'medium' ? '中リスク' : '低リスク'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs font-semibold">予想される影響:</p>
            <p className="text-xs text-muted-foreground">{patch.estimatedImpact}</p>
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2">パッチ内容（差分形式）:</p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                <code>{patch.patch}</code>
              </pre>
            </div>
            {/* 選択・承認ボタン */}
            {isFounder && (
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={onToggleSelection}
                >
                  {isSelected ? '選択解除' : '選択'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

