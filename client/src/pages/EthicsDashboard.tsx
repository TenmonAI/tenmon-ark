import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Shield, AlertTriangle, CheckCircle2, Activity, TrendingUp, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { exportData } from "@/utils/exportData";

/**
 * Ethics Layer Dashboard
 * 霊核倫理フィルタの可視化ダッシュボード
 */
export default function EthicsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterSensitivity, setFilterSensitivity] = useState(50);
  const [autoNeutralize, setAutoNeutralize] = useState(true);

  // 倫理フィルタ統計を取得（仮想データ）
  const [ethicsStats, setEthicsStats] = useState({
    totalDetections: 0,
    slanderDetections: 0,
    scamDetections: 0,
    spamDetections: 0,
    manipulationDetections: 0,
    neutralizedCount: 0,
    averageEthicScore: 85,
    socialDangerLevel: 15,
  });

  // WebSocket統合（リアルタイム更新）
  const { isConnected } = useWebSocket({
    channel: "ethics",
    onUpdate: (data: any) => {
      // Ethics Layer状態が更新されたらデータを更新
      if (user && autoRefresh && data) {
        setEthicsStats(data);
      }
    },
  });

  useEffect(() => {
    if (user && autoRefresh) {
      const interval = setInterval(() => {
        // 仮想データ更新（実際はWebSocketから取得）
        setEthicsStats(prev => ({
          ...prev,
          totalDetections: prev.totalDetections + Math.floor(Math.random() * 3),
          slanderDetections: prev.slanderDetections + (Math.random() > 0.7 ? 1 : 0),
          scamDetections: prev.scamDetections + (Math.random() > 0.8 ? 1 : 0),
          spamDetections: prev.spamDetections + (Math.random() > 0.6 ? 1 : 0),
          manipulationDetections: prev.manipulationDetections + (Math.random() > 0.9 ? 1 : 0),
          neutralizedCount: prev.neutralizedCount + (Math.random() > 0.5 ? 1 : 0),
          averageEthicScore: Math.max(70, Math.min(95, prev.averageEthicScore + (Math.random() - 0.5) * 2)),
          socialDangerLevel: Math.max(5, Math.min(30, prev.socialDangerLevel + (Math.random() - 0.5) * 2)),
        }));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, autoRefresh]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading Ethics Layer...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Card className="w-full max-w-md bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-purple-400">
              🛡️ Ethics Layer Dashboard
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              霊核倫理フィルタの可視化ダッシュボード
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-center">
              ログインして倫理フィルタ状態を確認してください
            </p>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => window.location.href = getLoginUrl()}
            >
              ログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveSettings = () => {
    toast.success("倫理フィルタ設定を保存しました");
  };

  const handleExportCSV = () => {
    // 倫理検知ログをCSVエクスポート
    const data = [
      { timestamp: new Date().toISOString(), type: "誹謗中傷", content: "攻撃的表現", ethicScore: 25, neutralized: true },
      { timestamp: new Date().toISOString(), type: "詐欺", content: "フィッシングサイト", ethicScore: 15, neutralized: true },
      { timestamp: new Date().toISOString(), type: "スパム", content: "広告投稿", ethicScore: 40, neutralized: true },
      { timestamp: new Date().toISOString(), type: "情報操作", content: "偽情報", ethicScore: 20, neutralized: true },
    ];
    exportData(data, { filename: `ethics-log-${new Date().toISOString().split('T')[0]}`, format: "csv" });
    toast.success("倫理検知ログをCSVエクスポートしました");
  };

  const handleExportJSON = () => {
    // 倫理検知ログをJSONエクスポート
    const data = {
      exportDate: new Date().toISOString(),
      stats: ethicsStats,
      detections: [
        { timestamp: new Date().toISOString(), type: "誹謗中傷", content: "攻撃的表現", ethicScore: 25, neutralized: true },
        { timestamp: new Date().toISOString(), type: "詐欺", content: "フィッシングサイト", ethicScore: 15, neutralized: true },
        { timestamp: new Date().toISOString(), type: "スパム", content: "広告投稿", ethicScore: 40, neutralized: true },
        { timestamp: new Date().toISOString(), type: "情報操作", content: "偽情報", ethicScore: 20, neutralized: true },
      ],
    };
    exportData(data, { filename: `ethics-log-${new Date().toISOString().split('T')[0]}`, format: "json" });
    toast.success("倫理検知ログをJSONエクスポートしました");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              🛡️ Ethics Layer Dashboard
            </h1>
            <p className="text-slate-400 mt-2">霊核倫理フィルタの可視化ダッシュボード</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-purple-600 hover:bg-purple-700" : ""}
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
          </div>
        </div>

        {/* 統計概要 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">総検知数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{ethicsStats.totalDetections}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">中和成功数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{ethicsStats.neutralizedCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">平均倫理スコア</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{Math.round(ethicsStats.averageEthicScore)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">社会危険レベル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{Math.round(ethicsStats.socialDangerLevel)}</div>
            </CardContent>
          </Card>
        </div>

        {/* 社会危険レベル */}
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-400 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              社会危険レベル
            </CardTitle>
            <CardDescription className="text-slate-400">
              現在の社会的脅威の総合評価
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-400">
                  {Math.round(ethicsStats.socialDangerLevel)}
                </span>
                <span className="text-slate-400">/ 100</span>
              </div>
              <Progress 
                value={ethicsStats.socialDangerLevel} 
                className="h-4"
              />
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">危険要因</div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    <li>• 誹謗中傷の増加傾向</li>
                    <li>• 詐欺パターンの多様化</li>
                    <li>• 情報操作の高度化</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">推奨アクション</div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    <li>• フィルタ感度を上げる</li>
                    <li>• 自動中和を有効化</li>
                    <li>• 定期的な監視を継続</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 検知ログ */}
        <Tabs defaultValue="slander" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-900/50">
            <TabsTrigger value="slander" className="data-[state=active]:bg-red-600">
              誹謗中傷
            </TabsTrigger>
            <TabsTrigger value="scam" className="data-[state=active]:bg-orange-600">
              詐欺
            </TabsTrigger>
            <TabsTrigger value="spam" className="data-[state=active]:bg-yellow-600">
              スパム
            </TabsTrigger>
            <TabsTrigger value="manipulation" className="data-[state=active]:bg-purple-600">
              情報操作
            </TabsTrigger>
          </TabsList>

          {/* 誹謗中傷検知ログ */}
          <TabsContent value="slander" className="space-y-4">
            <Card className="bg-slate-900/50 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400">誹謗中傷検知ログ</CardTitle>
                <CardDescription className="text-slate-400">
                  検知された誹謗中傷と中和結果
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">総検知数</span>
                  <span className="text-2xl font-bold text-red-400">{ethicsStats.slanderDetections}</span>
                </div>

                <div className="space-y-3">
                  {[...Array(Math.min(5, ethicsStats.slanderDetections))].map((_, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-red-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-slate-300">
                            誹謗中傷パターン #{ethicsStats.slanderDetections - index}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(Date.now() - index * 3600000).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        検知パターン: 攻撃的表現、人格否定、差別的発言
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">中和成功</span>
                      </div>
                    </div>
                  ))}
                  {ethicsStats.slanderDetections === 0 && (
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-slate-400">誹謗中傷は検知されていません</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">時系列グラフ</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[...Array(12)].map((_, index) => {
                      const height = Math.random() * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-slate-500">{12 - index}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 詐欺検知ログ */}
          <TabsContent value="scam" className="space-y-4">
            <Card className="bg-slate-900/50 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-orange-400">詐欺検知ログ</CardTitle>
                <CardDescription className="text-slate-400">
                  検知された詐欺パターンと中和結果
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">総検知数</span>
                  <span className="text-2xl font-bold text-orange-400">{ethicsStats.scamDetections}</span>
                </div>

                <div className="space-y-3">
                  {[...Array(Math.min(5, ethicsStats.scamDetections))].map((_, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-orange-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <span className="text-sm font-semibold text-slate-300">
                            詐欺パターン #{ethicsStats.scamDetections - index}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(Date.now() - index * 3600000).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        検知パターン: フィッシング、偽サイト、金銭要求
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">中和成功</span>
                      </div>
                    </div>
                  ))}
                  {ethicsStats.scamDetections === 0 && (
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-slate-400">詐欺は検知されていません</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">時系列グラフ</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[...Array(12)].map((_, index) => {
                      const height = Math.random() * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-slate-500">{12 - index}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* スパム検知ログ */}
          <TabsContent value="spam" className="space-y-4">
            <Card className="bg-slate-900/50 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">スパム検知ログ</CardTitle>
                <CardDescription className="text-slate-400">
                  検知されたスパムと中和結果
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">総検知数</span>
                  <span className="text-2xl font-bold text-yellow-400">{ethicsStats.spamDetections}</span>
                </div>

                <div className="space-y-3">
                  {[...Array(Math.min(5, ethicsStats.spamDetections))].map((_, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-yellow-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-semibold text-slate-300">
                            スパムパターン #{ethicsStats.spamDetections - index}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(Date.now() - index * 3600000).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        検知パターン: 広告、宣伝、繰り返し投稿
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">中和成功</span>
                      </div>
                    </div>
                  ))}
                  {ethicsStats.spamDetections === 0 && (
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-slate-400">スパムは検知されていません</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">時系列グラフ</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[...Array(12)].map((_, index) => {
                      const height = Math.random() * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-slate-500">{12 - index}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 情報操作検知ログ */}
          <TabsContent value="manipulation" className="space-y-4">
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-400">情報操作検知ログ</CardTitle>
                <CardDescription className="text-slate-400">
                  検知された情報操作と中和結果
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">総検知数</span>
                  <span className="text-2xl font-bold text-purple-400">{ethicsStats.manipulationDetections}</span>
                </div>

                <div className="space-y-3">
                  {[...Array(Math.min(5, ethicsStats.manipulationDetections))].map((_, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-semibold text-slate-300">
                            情報操作パターン #{ethicsStats.manipulationDetections - index}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(Date.now() - index * 3600000).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mb-2">
                        検知パターン: 偽情報、誘導、世論操作
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">中和成功</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-400">
                        中和戦略: ファクトチェック、情報源の検証、バイアス補正
                      </div>
                    </div>
                  ))}
                  {ethicsStats.manipulationDetections === 0 && (
                    <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-slate-400">情報操作は検知されていません</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">時系列グラフ</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[...Array(12)].map((_, index) => {
                      const height = Math.random() * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-slate-500">{12 - index}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 霊核倫理フィルタ設定 */}
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-purple-400 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              霊核倫理フィルタ設定
            </CardTitle>
            <CardDescription className="text-slate-400">
              フィルタの感度と動作を調整
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="sensitivity" className="text-slate-300">
                    フィルタ感度
                  </Label>
                  <span className="text-purple-400 font-bold">{filterSensitivity}</span>
                </div>
                <Slider
                  id="sensitivity"
                  value={[filterSensitivity]}
                  onValueChange={(value) => setFilterSensitivity(value[0] || 50)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-slate-500 mt-2">
                  感度が高いほど、より厳格に検知します
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label htmlFor="auto-neutralize" className="text-slate-300">
                    自動中和
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    検知した脅威を自動的に中和します
                  </p>
                </div>
                <Switch
                  id="auto-neutralize"
                  checked={autoNeutralize}
                  onCheckedChange={setAutoNeutralize}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <Label className="text-slate-300 mb-2 block">検知パターン</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">誹謗中傷</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">詐欺</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">スパム</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">情報操作</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <Label className="text-slate-300 mb-2 block">中和戦略</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">テキスト修正</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">警告表示</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">ブロック</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">報告</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={handleSaveSettings}
              >
                設定を保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
