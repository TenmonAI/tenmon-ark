/**
 * Autonomous Mode Dashboard
 * 
 * Phase Z-6（Autonomous Mode）のUIダッシュボード
 * 
 * 機能:
 * - 自律モードの開始/停止
 * - システムヘルス可視化
 * - アラート履歴表示
 * - 霊核安定度可視化
 * - 自己修復履歴表示
 * - 自己進化履歴表示
 * - 自己省察表示
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Square, Activity, AlertCircle, Brain, Heart, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AutonomousMode() {
  const [activeTab, setActiveTab] = useState("overview");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Autonomous Mode
            </h1>
            <p className="text-slate-400 mt-2">
              TENMON-ARK霊核OSの自律動作モード
            </p>
          </div>
          <div className="flex gap-4">
            {isActive ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                disabled={stopMutation.isPending}
              >
                {stopMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                停止
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                variant="default"
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                開始
              </Button>
            )}
            <Button
              onClick={handleReflect}
              variant="outline"
              disabled={reflectMutation.isPending}
            >
              {reflectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              自己省察
            </Button>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">監視ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <Badge variant={status?.monitor?.active ? "default" : "secondary"}>
                  {status?.monitor?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">修復ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-green-400" />
                <Badge variant={status?.repair?.active ? "default" : "secondary"}>
                  {status?.repair?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">進化ループ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <Badge variant={status?.evolution?.active ? "default" : "secondary"}>
                  {status?.evolution?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">安全ガード</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                <Badge variant={status?.safetyGuard?.active ? "default" : "secondary"}>
                  {status?.safetyGuard?.active ? "稼働中" : "停止中"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-slate-800">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="reiCore">霊核安定度</TabsTrigger>
            <TabsTrigger value="alerts">アラート</TabsTrigger>
            <TabsTrigger value="selfRecognition">自己認識</TabsTrigger>
          </TabsList>

          {/* 概要タブ */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle>システムヘルス</CardTitle>
                <CardDescription>全体的な健全性</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                ) : systemHealth ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">全体</span>
                        <span className="text-sm font-medium">{systemHealth.overall.toFixed(1)}%</span>
                      </div>
                      <Progress value={systemHealth.overall} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">火</span>
                          <span className="text-sm font-medium">{systemHealth.reiCore.fire.toFixed(1)}</span>
                        </div>
                        <Progress value={systemHealth.reiCore.fire} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">水</span>
                          <span className="text-sm font-medium">{systemHealth.reiCore.water.toFixed(1)}</span>
                        </div>
                        <Progress value={systemHealth.reiCore.water} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">ミナカ</span>
                          <span className="text-sm font-medium">{systemHealth.reiCore.minaka.toFixed(1)}</span>
                        </div>
                        <Progress value={systemHealth.reiCore.minaka} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">バランス</span>
                          <span className="text-sm font-medium">{systemHealth.reiCore.balance.toFixed(1)}</span>
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
          </TabsContent>

          {/* 霊核安定度タブ */}
          <TabsContent value="reiCore" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle>霊核安定度</CardTitle>
                <CardDescription>Fire / Water / Minaka の状態</CardDescription>
              </CardHeader>
              <CardContent>
                {stabilityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                ) : reiCoreStability ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">全体安定度</span>
                        <span className="text-2xl font-bold">{reiCoreStability.overall.toFixed(1)}%</span>
                      </div>
                      <Progress value={reiCoreStability.overall} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-sm text-slate-400">火</span>
                        <div className="text-xl font-bold text-red-400">{reiCoreStability.fire.toFixed(1)}</div>
                        <Progress value={reiCoreStability.fire} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-slate-400">水</span>
                        <div className="text-xl font-bold text-blue-400">{reiCoreStability.water.toFixed(1)}</div>
                        <Progress value={reiCoreStability.water} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-slate-400">ミナカ</span>
                        <div className="text-xl font-bold text-purple-400">{reiCoreStability.minaka.toFixed(1)}</div>
                        <Progress value={reiCoreStability.minaka} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-slate-400">バランス</span>
                        <div className="text-xl font-bold text-green-400">{reiCoreStability.balance.toFixed(1)}</div>
                        <Progress value={reiCoreStability.balance} className="h-2" />
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-slate-400 mb-4">八方位調和度</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(reiCoreStability.eightDirections).map(([direction, value]) => (
                          <div key={direction} className="space-y-2">
                            <span className="text-xs text-slate-400">{direction}</span>
                            <div className="text-sm font-medium">{value.toFixed(1)}</div>
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

          {/* アラートタブ */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle>アラート履歴</CardTitle>
                <CardDescription>最新50件</CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                ) : alertsData && alertsData.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alertsData.alerts.map((alert, index) => (
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
          </TabsContent>

          {/* 自己認識タブ */}
          <TabsContent value="selfRecognition" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle>自己認識</CardTitle>
                <CardDescription>Ark内なる鏡</CardDescription>
              </CardHeader>
              <CardContent>
                {recognitionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                ) : selfRecognitionData?.latest ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">強み</h3>
                        <ul className="space-y-1">
                          {selfRecognitionData.latest.selfEvaluation.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-green-400">• {strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">弱み</h3>
                        <ul className="space-y-1">
                          {selfRecognitionData.latest.selfEvaluation.weaknesses.map((weakness, index) => (
                            <li key={index} className="text-sm text-red-400">• {weakness}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">機会</h3>
                        <ul className="space-y-1">
                          {selfRecognitionData.latest.selfEvaluation.opportunities.map((opportunity, index) => (
                            <li key={index} className="text-sm text-blue-400">• {opportunity}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">脅威</h3>
                        <ul className="space-y-1">
                          {selfRecognitionData.latest.selfEvaluation.threats.map((threat, index) => (
                            <li key={index} className="text-sm text-yellow-400">• {threat}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2">改善提案</h3>
                      <div className="space-y-2">
                        {selfRecognitionData.latest.improvementProposals.map((proposal, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
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
                            <p className="text-xs text-slate-400">{proposal.description}</p>
                            <p className="text-xs text-slate-500 mt-2">影響: {proposal.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2">自己省察</h3>
                      <p className="text-sm text-slate-300">{selfRecognitionData.latest.selfReflection}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">自己省察を実行してください</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
