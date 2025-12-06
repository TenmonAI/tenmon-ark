import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Shield, Globe, Laptop, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Fractal OS Dashboard
 * 三層守護構造の可視化ダッシュボード
 */
export default function FractalDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 三層守護状態を取得
  const { data: fractalStatus, refetch, isLoading } = trpc.fractalGuardian.getStatus.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchInterval: false, // WebSocketでリアルタイム更新するため無効化
    }
  );

  // WebSocket統合（リアルタイム更新）
  const { isConnected } = useWebSocket({
    channel: "fractal",
    onUpdate: () => {
      // Fractal Guardian状態が更新されたらrefetch
      if (user && autoRefresh) {
        refetch();
      }
    },
  });

  // 統合保護レポートを取得
  const { data: protectionReport } = trpc.fractalGuardian.getReport.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  // 初回データ取得
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading Fractal OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <Card className="w-full max-w-md bg-slate-900/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-blue-400">
              🌕 Fractal OS Dashboard
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              三層守護構造の可視化ダッシュボード
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-center">
              ログインして三層守護状態を確認してください
            </p>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => window.location.href = getLoginUrl()}
            >
              ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallLevel = fractalStatus?.overallProtectionLevel || 0;
  const personalLevel = fractalStatus?.personalLayer.protectionLevel || 0;
  const deviceSocialLevel = fractalStatus?.deviceSocialLayer.protectionLevel || 0;
  const globalLevel = fractalStatus?.globalLayer.protectionLevel || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              🌕 Fractal OS Dashboard
            </h1>
            <p className="text-slate-400 mt-2">三層守護構造の可視化ダッシュボード</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {autoRefresh ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  自動更新中
                </>
              ) : (
                "自動更新停止"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-blue-500/20"
            >
              手動更新
            </Button>
          </div>
        </div>

        {/* 統合保護レベル */}
        <Card className="bg-slate-900/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-400 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              統合保護レベル
            </CardTitle>
            <CardDescription className="text-slate-400">
              三層守護の総合的な保護レベル
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {overallLevel}
                </span>
                <span className="text-slate-400">/ 100</span>
              </div>
              <Progress value={overallLevel} className="h-4" />
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{personalLevel}</div>
                  <div className="text-sm text-slate-400">個人守護</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{deviceSocialLevel}</div>
                  <div className="text-sm text-slate-400">端末・社会守護</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{globalLevel}</div>
                  <div className="text-sm text-slate-400">地球守護</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フラクタル円環ビジュアライゼーション */}
        <Card className="bg-slate-900/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-400">フラクタル円環</CardTitle>
            <CardDescription className="text-slate-400">
              三層守護の階層構造と連携状態
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full h-96 flex items-center justify-center">
              {/* 地球守護（外側） */}
              <div className="absolute w-80 h-80 rounded-full border-4 border-cyan-500/30 flex items-center justify-center">
                <div className="absolute -top-8 text-cyan-400 font-bold">地球守護</div>
                <div className="absolute -top-4 text-cyan-300 text-sm">{globalLevel}%</div>
                
                {/* 端末・社会守護（中間） */}
                <div className="absolute w-56 h-56 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                  <div className="absolute -top-8 text-purple-400 font-bold">端末・社会守護</div>
                  <div className="absolute -top-4 text-purple-300 text-sm">{deviceSocialLevel}%</div>
                  
                  {/* 個人守護（内側） */}
                  <div className="absolute w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-blue-400 font-bold text-sm">個人守護</div>
                      <div className="text-blue-300 text-xs">{personalLevel}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 階層間連携状態 */}
              {fractalStatus?.layerSyncStatus && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4">
                  <div className="flex items-center gap-2">
                    {fractalStatus.layerSyncStatus.personalToDevice ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-xs text-slate-400">個人→端末</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fractalStatus.layerSyncStatus.deviceToGlobal ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-xs text-slate-400">端末→地球</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fractalStatus.layerSyncStatus.globalToDevice ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-xs text-slate-400">地球→端末</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fractalStatus.layerSyncStatus.deviceToPersonal ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-xs text-slate-400">端末→個人</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 三層守護詳細 */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50">
            <TabsTrigger value="personal" className="data-[state=active]:bg-blue-600">
              <Shield className="w-4 h-4 mr-2" />
              個人守護
            </TabsTrigger>
            <TabsTrigger value="device" className="data-[state=active]:bg-purple-600">
              <Laptop className="w-4 h-4 mr-2" />
              端末・社会守護
            </TabsTrigger>
            <TabsTrigger value="global" className="data-[state=active]:bg-cyan-600">
              <Globe className="w-4 h-4 mr-2" />
              地球守護
            </TabsTrigger>
          </TabsList>

          {/* 個人守護タブ */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="bg-slate-900/50 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-400">個人守護（Guardian Mode）</CardTitle>
                <CardDescription className="text-slate-400">
                  デバイス保護と個人脅威検知
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">保護レベル</span>
                    <span className="text-blue-400 font-bold">{personalLevel}%</span>
                  </div>
                  <Progress value={personalLevel} className="h-2" />
                </div>

                {fractalStatus?.personalLayer.deviceProtection && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      {fractalStatus.personalLayer.deviceProtection.cameraProtection ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-slate-300">カメラ保護</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fractalStatus.personalLayer.deviceProtection.microphoneProtection ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-slate-300">マイク保護</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fractalStatus.personalLayer.deviceProtection.locationProtection ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-slate-300">位置情報保護</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fractalStatus.personalLayer.deviceProtection.storageProtection ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-slate-300">ストレージ保護</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fractalStatus.personalLayer.deviceProtection.networkProtection ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-slate-300">ネットワーク保護</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">個人脅威</h4>
                  <div className="space-y-2">
                    {fractalStatus?.personalLayer.recentThreats && fractalStatus.personalLayer.recentThreats.length > 0 ? (
                      fractalStatus.personalLayer.recentThreats.map((threat: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          {typeof threat === 'string' ? threat : threat.description || '脅威検知'}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        脅威は検知されていません
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 端末・社会守護タブ */}
          <TabsContent value="device" className="space-y-4">
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-400">端末・社会守護（Ark Browser + Ethics Layer）</CardTitle>
                <CardDescription className="text-slate-400">
                  ブラウザ保護と倫理フィルタ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">保護レベル</span>
                    <span className="text-purple-400 font-bold">{deviceSocialLevel}%</span>
                  </div>
                  <Progress value={deviceSocialLevel} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">倫理スコア</span>
                    <span className="text-purple-400 font-bold">{fractalStatus?.deviceSocialLayer.ethicScore || 0}%</span>
                  </div>
                  <Progress value={fractalStatus?.deviceSocialLayer.ethicScore || 0} className="h-2" />
                </div>

                {fractalStatus?.deviceSocialLayer.browserProtection && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {fractalStatus.deviceSocialLayer.browserProtection.blockedSites || 0}
                      </div>
                      <div className="text-xs text-slate-400">ブロック済みサイト</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {fractalStatus.deviceSocialLayer.browserProtection.analyzedPages || 0}
                      </div>
                      <div className="text-xs text-slate-400">分析済みページ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {Math.round(fractalStatus.deviceSocialLayer.browserProtection.averageEthicScore || 0)}
                      </div>
                      <div className="text-xs text-slate-400">平均倫理スコア</div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">端末・社会脅威</h4>
                  <div className="space-y-2">
                    {fractalStatus?.deviceSocialLayer.socialThreats && fractalStatus.deviceSocialLayer.socialThreats.length > 0 ? (
                      fractalStatus.deviceSocialLayer.socialThreats.map((threat: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          {threat}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        脅威は検知されていません
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 地球守護タブ */}
          <TabsContent value="global" className="space-y-4">
            <Card className="bg-slate-900/50 border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-cyan-400">地球守護（Ark Shield）</CardTitle>
                <CardDescription className="text-slate-400">
                  世界規模の脅威検知と中和
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">保護レベル</span>
                    <span className="text-cyan-400 font-bold">{globalLevel}%</span>
                  </div>
                  <Progress value={globalLevel} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {fractalStatus?.globalLayer.globalThreatLevel || "none"}
                    </div>
                    <div className="text-xs text-slate-400">脅威レベル</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {fractalStatus?.globalLayer.globalThreats?.length || 0}
                    </div>
                    <div className="text-xs text-slate-400">検知脅威数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {fractalStatus?.globalLayer.neutralizationStrategies || 0}
                    </div>
                    <div className="text-xs text-slate-400">中和戦略数</div>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">地球脅威</h4>
                  <div className="space-y-2">
                    {fractalStatus?.globalLayer.globalThreats && fractalStatus.globalLayer.globalThreats.length > 0 ? (
                      fractalStatus.globalLayer.globalThreats.map((threat: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          {threat}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        脅威は検知されていません
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 統合保護レポート */}
        {protectionReport && (
          <Card className="bg-slate-900/50 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400">統合保護レポート</CardTitle>
              <CardDescription className="text-slate-400">
                三層守護の総合分析と推奨アクション
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300">{protectionReport.summary}</p>
              </div>

              {protectionReport.recommendations && protectionReport.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">推奨アクション</h4>
                  <div className="space-y-2">
                    {protectionReport.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5" />
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
