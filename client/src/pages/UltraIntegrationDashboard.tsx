/**
 * Ultra Integration Dashboard v1.0
 * 
 * TENMON-ARK の内部状態をリアルタイム可視化
 * System Health Score, Diagnostics Timeline, Self-Heal Cycles, API健全性モニター
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield,
  Database,
  Globe,
  RefreshCw,
} from 'lucide-react';

export default function UltraIntegrationDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // システム状態を取得
  const { data: systemState, refetch: refetchSystemState } = trpc.directLink.getSystemState.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  // 最新の診断レポートを取得
  const { data: latestReport, refetch: refetchLatestReport } = trpc.directLink.getLatestDiagnosticReport.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  // すべての診断レポートを取得
  const { data: allReports } = trpc.directLink.getAllDiagnosticReports.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? 10000 : false }
  );

  // Self-Heal サイクルを取得
  const { data: healCycles } = trpc.directLink.getAllSelfHealCycles.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  // Shared Memory の健全性を取得
  const { data: memoryHealth } = trpc.directLink.checkSharedMemoryHealth.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? 10000 : false }
  );

  // 診断を実行
  const runDiagnosticsMutation = trpc.directLink.runDiagnostics.useMutation({
    onSuccess: () => {
      refetchLatestReport();
      refetchSystemState();
    },
  });

  // バッチ Self-Heal を実行
  const runBatchHealMutation = trpc.directLink.executeBatchSelfHeal.useMutation({
    onSuccess: () => {
      refetchSystemState();
    },
  });

  // ステータスバッジを取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">健全</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">警告</Badge>;
      case 'critical':
        return <Badge className="bg-red-500">危機</Badge>;
      default:
        return <Badge>不明</Badge>;
    }
  };

  // 重大度バッジを取得
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline">低</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">中</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">高</Badge>;
      case 'critical':
        return <Badge className="bg-red-500">危機</Badge>;
      default:
        return <Badge>不明</Badge>;
    }
  };

  // 結果バッジを取得
  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'healed':
        return <Badge className="bg-green-500">修復完了</Badge>;
      case 'partially-healed':
        return <Badge className="bg-yellow-500">部分修復</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">失敗</Badge>;
      case 'escalated-to-manus':
        return <Badge className="bg-blue-500">Manusへ</Badge>;
      default:
        return <Badge>不明</Badge>;
    }
  };

  // タイムラインデータを準備
  const timelineData = allReports?.slice(-10).map(report => ({
    time: new Date(report.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    score: report.systemHealth.score,
    issues: report.issues.length,
  })) || [];

  // レーダーチャートデータを準備
  const radarData = latestReport ? [
    {
      category: 'API',
      score: latestReport.metrics.apiHealth,
    },
    {
      category: 'UI',
      score: latestReport.metrics.uiHealth,
    },
    {
      category: 'Build',
      score: latestReport.metrics.buildHealth,
    },
    {
      category: 'SSL',
      score: latestReport.metrics.sslHealth,
    },
    {
      category: 'Performance',
      score: latestReport.metrics.performanceScore,
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Ultra Integration Dashboard v1.0
            </h1>
            <p className="text-slate-400 mt-2">TENMON-ARK 内部状態リアルタイム可視化</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? '自動更新中' : '自動更新停止'}
            </Button>
            <Button
              onClick={() => runDiagnosticsMutation.mutate()}
              disabled={runDiagnosticsMutation.isPending}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <Activity className="h-4 w-4" />
              診断実行
            </Button>
            <Button
              onClick={() => runBatchHealMutation.mutate()}
              disabled={runBatchHealMutation.isPending}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Zap className="h-4 w-4" />
              Self-Heal実行
            </Button>
          </div>
        </div>

        {/* System Health Score */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              System Health Score
            </CardTitle>
            <CardDescription>システム全体の健全性スコア</CardDescription>
          </CardHeader>
          <CardContent>
            {latestReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {latestReport.systemHealth.score}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(latestReport.systemHealth.status)}
                    <div className="text-sm text-slate-400 mt-2">
                      最終診断: {new Date(latestReport.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                </div>
                <Progress value={latestReport.systemHealth.score} className="h-4" />
                <div className="grid grid-cols-5 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{latestReport.metrics.apiHealth}</div>
                    <div className="text-xs text-slate-400">API</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{latestReport.metrics.uiHealth}</div>
                    <div className="text-xs text-slate-400">UI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-400">{latestReport.metrics.buildHealth}</div>
                    <div className="text-xs text-slate-400">Build</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{latestReport.metrics.sslHealth}</div>
                    <div className="text-xs text-slate-400">SSL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{latestReport.metrics.performanceScore}</div>
                    <div className="text-xs text-slate-400">Performance</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                診断データがありません。「診断実行」ボタンをクリックしてください。
              </div>
            )}
          </CardContent>
        </Card>

        {/* タブコンテンツ */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-slate-700">
            <TabsTrigger value="timeline">Diagnostics Timeline</TabsTrigger>
            <TabsTrigger value="heal">Self-Heal Cycles</TabsTrigger>
            <TabsTrigger value="api">API健全性</TabsTrigger>
            <TabsTrigger value="system">System State</TabsTrigger>
          </TabsList>

          {/* Diagnostics Timeline */}
          <TabsContent value="timeline">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  Diagnostics Timeline
                </CardTitle>
                <CardDescription>診断履歴とスコア推移</CardDescription>
              </CardHeader>
              <CardContent>
                {timelineData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="time" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Health Score" />
                        <Line type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={2} name="Issues" />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* 問題リスト */}
                    {latestReport && latestReport.issues.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">検出された問題</h3>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {latestReport.issues.map(issue => (
                              <div key={issue.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getSeverityBadge(issue.severity)}
                                    <Badge variant="outline">{issue.category}</Badge>
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {new Date(issue.detectedAt).toLocaleString('ja-JP')}
                                  </div>
                                </div>
                                <div className="text-sm">{issue.description}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    診断履歴がありません。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Heal Cycles */}
          <TabsContent value="heal">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-400" />
                  Self-Heal Cycles
                </CardTitle>
                <CardDescription>自己修復サイクルの履歴</CardDescription>
              </CardHeader>
              <CardContent>
                {healCycles && healCycles.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {healCycles.slice(-20).reverse().map(cycle => (
                        <div key={cycle.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getOutcomeBadge(cycle.outcome)}
                              <Badge variant="outline">{cycle.trigger}</Badge>
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(cycle.timestamp).toLocaleString('ja-JP')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {cycle.steps.map((step, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {step.status === 'completed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : step.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-400" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-400" />
                                )}
                                <span className="text-slate-300">{step.step}</span>
                                {step.result && (
                                  <span className="text-xs text-slate-400">- {step.result}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    Self-Heal履歴がありません。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API健全性モニター */}
          <TabsContent value="api">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-400" />
                  API健全性モニター
                </CardTitle>
                <CardDescription>各カテゴリーの健全性スコア</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="category" stroke="#94a3b8" />
                      <PolarRadiusAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Radar name="Health Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    診断データがありません。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System State */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* システム状態 */}
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-400" />
                    System State
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemState ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-slate-400">バージョン</div>
                        <div className="text-lg font-semibold">{systemState.version}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">稼働時間</div>
                        <div className="text-lg font-semibold">{Math.floor(systemState.uptime / 3600)}時間</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">最終更新</div>
                        <div className="text-lg font-semibold">
                          {new Date(systemState.lastUpdated).toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Manus接続状態</div>
                        <div className="text-lg font-semibold">
                          {systemState.manus.connectionStatus === 'connected' ? (
                            <Badge className="bg-green-500">接続中</Badge>
                          ) : (
                            <Badge className="bg-gray-500">未接続</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      システム状態を読み込み中...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shared Memory健全性 */}
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-400" />
                    Shared Memory Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {memoryHealth ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-slate-400">健全性</div>
                        <div className="text-lg font-semibold">
                          {memoryHealth.healthy ? (
                            <Badge className="bg-green-500">正常</Badge>
                          ) : (
                            <Badge className="bg-red-500">異常</Badge>
                          )}
                        </div>
                      </div>
                      {memoryHealth.stats && (
                        <>
                          <div>
                            <div className="text-sm text-slate-400">診断レポート数</div>
                            <div className="text-lg font-semibold">{memoryHealth.stats.totalReports}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">パッチ数</div>
                            <div className="text-lg font-semibold">{memoryHealth.stats.totalPatches}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Self-Healサイクル数</div>
                            <div className="text-lg font-semibold">{memoryHealth.stats.totalCycles}</div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      メモリ状態を読み込み中...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
