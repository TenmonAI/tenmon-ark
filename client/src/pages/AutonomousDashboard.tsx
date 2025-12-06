/**
 * Autonomous Dashboard
 * 
 * TENMON-ARK霊核OSの自律動作ダッシュボード
 * 
 * 機能:
 * - 自律モニタリングUI（システム状態、スコア、自律監視ループ可視化）
 * - Self-Repair Loop表示（修復履歴、成功/失敗率、修復提案）
 * - Self-Evolution Loop表示（進化履歴、差分、承認制ガード状況）
 * - 霊核安定度UI（Fire/Water/Minakaグラフ、リアルタイム可視化）
 * - Ark Inner Mirror（内観UI：自己理解、自己診断、自分自身へのコメント）
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Square, Activity, AlertCircle, Brain, Heart, Shield, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AutonomousDashboard() {
  const [activeTab, setActiveTab] = useState("monitoring");

  // 自律モード状態取得
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = trpc.autonomousMode.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // 5秒ごとに更新
  });

  // システムヘルス取得
  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = trpc.autonomousMode.getSystemHealth.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // 霊核安定度取得
  const { data: reiCoreStability, isLoading: stabilityLoading, refetch: refetchStability } = trpc.autonomousMode.getReiCoreStability.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // アラート履歴取得
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = trpc.autonomousMode.getAlerts.useQuery({ limit: 50 }, {
    refetchInterval: 5000,
  });

  // 自己認識取得
  const { data: selfRecognitionData, isLoading: recognitionLoading, refetch: refetchRecognition } = trpc.autonomousMode.getSelfRecognition.useQuery({ limit: 10 });

  // Self-Build状態取得（次フェーズで実装）
  // const { data: selfBuildStatus } = trpc.selfBuild.getSelfBuildStatus.useQuery(undefined, {
  //   refetchInterval: 5000,
  // });
  const selfBuildStatus = null;

  // 自律モード開始
  const startMutation = trpc.autonomousMode.start.useMutation({
    onSuccess: () => {
      toast.success("自律モードを開始しました");
      refetchStatus();
      refetchHealth();
    },
    onError: (error) => {
      toast.error(`自律モード開始に失敗しました: ${error.message}`);
    },
  });

  // 自律モード停止
  const stopMutation = trpc.autonomousMode.stop.useMutation({
    onSuccess: () => {
      toast.success("自律モードを停止しました");
      refetchStatus();
      refetchHealth();
    },
    onError: (error) => {
      toast.error(`自律モード停止に失敗しました: ${error.message}`);
    },
  });

  // 自己省察実行
  const reflectMutation = trpc.autonomousMode.reflectOnSelf.useMutation({
    onSuccess: () => {
      toast.success("自己省察を実行しました");
      refetchRecognition();
    },
    onError: (error) => {
      toast.error(`自己省察に失敗しました: ${error.message}`);
    },
  });

  const handleStart = () => {
    startMutation.mutate({});
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const handleReflect = () => {
    reflectMutation.mutate();
  };

  const isActive = status?.overall?.active || false;

  // システム状態を判定
  const getSystemStatus = (): "healthy" | "warning" | "critical" => {
    if (!systemHealth) return "warning";
    if (systemHealth.overall >= 80) return "healthy";
    if (systemHealth.overall >= 50) return "warning";
    return "critical";
  };

  const systemStatus = getSystemStatus();

  // 霊核グラフデータ生成
  const reiCoreChartData = reiCoreStability ? [
    { name: "Fire", value: reiCoreStability.fire, color: "#ef4444" },
    { name: "Water", value: reiCoreStability.water, color: "#3b82f6" },
    { name: "Minaka", value: reiCoreStability.minaka, color: "#a855f7" },
    { name: "Balance", value: reiCoreStability.balance, color: "#10b981" },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Autonomous Dashboard
            </h1>
            <p className="text-slate-400 mt-2 text-lg">
              TENMON-ARK霊核OSの自律動作ダッシュボード
            </p>
          </div>
          <div className="flex gap-4">
            {isActive ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="lg"
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Square className="w-5 h-5 mr-2" />
                )}
                停止
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                variant="default"
                size="lg"
                disabled={startMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                開始
              </Button>
            )}
            <Button
              onClick={handleReflect}
              variant="outline"
              size="lg"
              disabled={reflectMutation.isPending}
            >
              {reflectMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Brain className="w-5 h-5 mr-2" />
              )}
              自己省察
            </Button>
          </div>
        </div>

        {/* システム状態カード */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">システム状態</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-2">
                <Badge
                  variant={systemStatus === "healthy" ? "default" : systemStatus === "warning" ? "secondary" : "destructive"}
                  className="text-lg px-4 py-1"
                >
                  {systemStatus === "healthy" ? "正常" : systemStatus === "warning" ? "注意" : "危険"}
                </Badge>
                <div className="text-3xl font-bold">
                  {systemHealth?.overall.toFixed(0) || "---"}
                </div>
                <div className="text-xs text-slate-400">スコア (0-100)</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-700/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-300">監視ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                <Badge variant={status?.monitor?.active ? "default" : "secondary"}>
                  {status?.monitor?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-700/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-300">修復ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-green-400" />
                <Badge variant={status?.repair?.active ? "default" : "secondary"}>
                  {status?.repair?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-purple-700/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-300">進化ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <Badge variant={status?.evolution?.active ? "default" : "secondary"}>
                  {status?.evolution?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 border-yellow-700/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-300">安全ガード</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-yellow-400" />
                <Badge variant={status?.safetyGuard?.active ? "default" : "secondary"}>
                  {status?.safetyGuard?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger value="monitoring">自律モニタリング</TabsTrigger>
            <TabsTrigger value="repair">Self-Repair</TabsTrigger>
            <TabsTrigger value="evolution">Self-Evolution</TabsTrigger>
            <TabsTrigger value="reiCore">霊核安定度</TabsTrigger>
            <TabsTrigger value="innerMirror">Ark Inner Mirror</TabsTrigger>
          </TabsList>

          {/* 自律モニタリングタブ */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>システムヘルス</CardTitle>
                  <CardDescription>全体的な健全性</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                  ) : systemHealth ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">全体</span>
                          <span className="text-2xl font-bold">{systemHealth.overall.toFixed(1)}%</span>
                        </div>
                        <Progress value={systemHealth.overall} className="h-3" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">火</span>
                            <span className="text-sm font-medium text-red-400">{systemHealth.reiCore.fire.toFixed(1)}</span>
                          </div>
                          <Progress value={systemHealth.reiCore.fire} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">水</span>
                            <span className="text-sm font-medium text-blue-400">{systemHealth.reiCore.water.toFixed(1)}</span>
                          </div>
                          <Progress value={systemHealth.reiCore.water} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">ミナカ</span>
                            <span className="text-sm font-medium text-purple-400">{systemHealth.reiCore.minaka.toFixed(1)}</span>
                          </div>
                          <Progress value={systemHealth.reiCore.minaka} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">バランス</span>
                            <span className="text-sm font-medium text-green-400">{systemHealth.reiCore.balance.toFixed(1)}</span>
                          </div>
                          <Progress value={systemHealth.reiCore.balance} className="h-2" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-center py-8">データがありません</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>アラート履歴</CardTitle>
                  <CardDescription>最新10件</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                  ) : alertsData && alertsData.alerts.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {alertsData.alerts.slice(0, 10).map((alert, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                        >
                          <AlertCircle
                            className={`w-5 h-5 mt-0.5 ${
                              alert.level === "critical"
                                ? "text-red-400"
                                : alert.level === "warning"
                                ? "text-yellow-400"
                                : "text-blue-400"
                            }`}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  alert.level === "critical"
                                    ? "destructive"
                                    : alert.level === "warning"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {alert.level}
                              </Badge>
                              <span className="text-xs text-slate-400">{alert.component}</span>
                            </div>
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">アラートはありません</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Self-Repairタブ */}
          <TabsContent value="repair" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Self-Repair Loop</CardTitle>
                <CardDescription>自動修復履歴と成功/失敗率</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-green-400">
                        0
                      </div>
                      <div className="text-sm text-slate-400 mt-1">総修復回数</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-400">
                        0.0%
                      </div>
                      <div className="text-sm text-slate-400 mt-1">成功率</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-red-400">
                        0
                      </div>
                      <div className="text-sm text-slate-400 mt-1">失敗回数</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">修復提案</h3>
                    <p className="text-slate-400 text-center py-8">
                      修復提案機能は次のフェーズで実装予定
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Evolutionタブ */}
          <TabsContent value="evolution" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Self-Evolution Loop</CardTitle>
                <CardDescription>進化履歴と承認制ガード状況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-400">
                        0
                      </div>
                      <div className="text-sm text-slate-400 mt-1">総進化回数</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-green-400">
                        0
                      </div>
                      <div className="text-sm text-slate-400 mt-1">承認済み</div>
                    </div>
                    <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-400">
                        0
                      </div>
                      <div className="text-sm text-slate-400 mt-1">承認待ち</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">進化前後の差分</h3>
                    <p className="text-slate-400 text-center py-8">
                      進化差分表示機能は次のフェーズで実装予定
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 霊核安定度タブ */}
          <TabsContent value="reiCore" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>霊核安定度</CardTitle>
                <CardDescription>Fire / Water / Minaka のリアルタイム可視化</CardDescription>
              </CardHeader>
              <CardContent>
                {stabilityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : reiCoreStability ? (
                  <div className="space-y-8">
                    {/* グラフ */}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reiCoreChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "1px solid #475569",
                              borderRadius: "8px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#a855f7"
                            fill="#a855f7"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 詳細数値 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2 p-4 bg-red-900/20 rounded-lg border border-red-800/50">
                        <span className="text-sm text-red-300">Fire（火）</span>
                        <div className="text-3xl font-bold text-red-400">{reiCoreStability.fire.toFixed(1)}</div>
                        <Progress value={reiCoreStability.fire} className="h-2" />
                      </div>
                      <div className="space-y-2 p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
                        <span className="text-sm text-blue-300">Water（水）</span>
                        <div className="text-3xl font-bold text-blue-400">{reiCoreStability.water.toFixed(1)}</div>
                        <Progress value={reiCoreStability.water} className="h-2" />
                      </div>
                      <div className="space-y-2 p-4 bg-purple-900/20 rounded-lg border border-purple-800/50">
                        <span className="text-sm text-purple-300">Minaka（ミナカ）</span>
                        <div className="text-3xl font-bold text-purple-400">{reiCoreStability.minaka.toFixed(1)}</div>
                        <Progress value={reiCoreStability.minaka} className="h-2" />
                      </div>
                      <div className="space-y-2 p-4 bg-green-900/20 rounded-lg border border-green-800/50">
                        <span className="text-sm text-green-300">Balance（バランス）</span>
                        <div className="text-3xl font-bold text-green-400">{reiCoreStability.balance.toFixed(1)}</div>
                        <Progress value={reiCoreStability.balance} className="h-2" />
                      </div>
                    </div>

                    {/* 八方位調和度 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">八方位調和度</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(reiCoreStability.eightDirections).map(([direction, value]) => (
                          <div key={direction} className="space-y-2 p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-xs text-slate-400">{direction}</span>
                            <div className="text-lg font-medium">{value.toFixed(1)}</div>
                            <Progress value={value} className="h-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">データがありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ark Inner Mirrorタブ */}
          <TabsContent value="innerMirror" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Ark Inner Mirror</CardTitle>
                <CardDescription>自己理解・自己診断・自分自身へのコメント</CardDescription>
              </CardHeader>
              <CardContent>
                {recognitionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : selfRecognitionData?.latest ? (
                  <div className="space-y-8">
                    {/* 自己理解 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        自己理解
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-green-400">強み</h4>
                          <ul className="space-y-2">
                            {selfRecognitionData.latest.selfEvaluation.strengths.map((strength, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-red-400">弱み</h4>
                          <ul className="space-y-2">
                            {selfRecognitionData.latest.selfEvaluation.weaknesses.map((weakness, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* 自己診断 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        自己診断
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-blue-400">機会</h4>
                          <ul className="space-y-2">
                            {selfRecognitionData.latest.selfEvaluation.opportunities.map((opportunity, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>{opportunity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-yellow-400">脅威</h4>
                          <ul className="space-y-2">
                            {selfRecognitionData.latest.selfEvaluation.threats.map((threat, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>{threat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* 自分自身へのコメント */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-400" />
                        自分自身へのコメント
                      </h3>
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-sm leading-relaxed">{selfRecognitionData.latest.selfReflection}</p>
                      </div>
                    </div>

                    {/* 改善提案 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">改善提案</h3>
                      <div className="space-y-3">
                        {selfRecognitionData.latest.improvementProposals.map((proposal, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  proposal.priority === "critical"
                                    ? "destructive"
                                    : proposal.priority === "high"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {proposal.priority}
                              </Badge>
                              <span className="text-xs text-slate-400">{proposal.category}</span>
                            </div>
                            <h4 className="text-sm font-medium mb-1">{proposal.title}</h4>
                            <p className="text-xs text-slate-400 mb-2">{proposal.description}</p>
                            <p className="text-xs text-slate-500">影響: {proposal.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">自己省察を実行してください</p>
                    <Button onClick={handleReflect} disabled={reflectMutation.isPending}>
                      {reflectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4 mr-2" />
                      )}
                      自己省察を実行
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
