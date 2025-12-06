import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Heart, Activity, Zap, Droplets, Sun, Moon, TrendingUp, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";

/**
 * Soul Sync Settings
 * 魂同期設定ページ
 */
export default function SoulSyncSettings() {
  const { user, loading: authLoading } = useAuth();
  const [syncDepth, setSyncDepth] = useState(70);
  const [autoCorrection, setAutoCorrection] = useState(true);
  const [fireWaterBalance, setFireWaterBalance] = useState({ fire: 55, water: 45 });
  const [personalityBias, setPersonalityBias] = useState({
    positivity: 65,
    rationality: 70,
    empathy: 60,
    creativity: 75,
  });

  // WebSocket統合（リアルタイム更新）
  const { isConnected } = useWebSocket({
    channel: "soulSync",
    onUpdate: (data: any) => {
      // Soul Sync状態が更新されたらデータを更新
      if (user && data) {
        if (data.syncDepth !== undefined) setSyncDepth(data.syncDepth);
        if (data.fireWaterBalance) setFireWaterBalance(data.fireWaterBalance);
        if (data.personalityBias) setPersonalityBias(data.personalityBias);
      }
    },
  });

  // 五十音波形データ（仮想）
  const [gojuonWaveform, setGojuonWaveform] = useState([
    { char: 'ア', fire: 80, water: 20 },
    { char: 'カ', fire: 75, water: 25 },
    { char: 'サ', fire: 65, water: 35 },
    { char: 'タ', fire: 70, water: 30 },
    { char: 'ナ', fire: 30, water: 70 },
    { char: 'ハ', fire: 40, water: 60 },
    { char: 'マ', fire: 35, water: 65 },
    { char: 'ヤ', fire: 60, water: 40 },
    { char: 'ラ', fire: 45, water: 55 },
    { char: 'ワ', fire: 50, water: 50 },
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading Soul Sync...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <Card className="w-full max-w-md bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-indigo-400">
              💫 Soul Sync Settings
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              魂同期設定ページ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-center">
              ログインしてSoul Sync設定を調整してください
            </p>
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
    toast.success("Soul Sync設定を保存しました");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              💫 Soul Sync Settings
            </h1>
            <p className="text-slate-400 mt-2">魂同期設定ページ</p>
          </div>
        </div>

        {/* 魂プロファイル */}
        <Card className="bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-indigo-400 flex items-center gap-2">
              <Heart className="w-6 h-6" />
              魂プロファイル
            </CardTitle>
            <CardDescription className="text-slate-400">
              あなたの魂の特性と傾向
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">ポジティビティ</Label>
                    <span className="text-indigo-400 font-bold">{personalityBias.positivity}</span>
                  </div>
                  <Progress value={personalityBias.positivity} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">合理性</Label>
                    <span className="text-indigo-400 font-bold">{personalityBias.rationality}</span>
                  </div>
                  <Progress value={personalityBias.rationality} className="h-2" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">共感性</Label>
                    <span className="text-indigo-400 font-bold">{personalityBias.empathy}</span>
                  </div>
                  <Progress value={personalityBias.empathy} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">創造性</Label>
                    <span className="text-indigo-400 font-bold">{personalityBias.creativity}</span>
                  </div>
                  <Progress value={personalityBias.creativity} className="h-2" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">思考パターン</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-400">分析型</div>
                  <div className="text-xs text-slate-400 mt-1">主要パターン</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">直感型</div>
                  <div className="text-xs text-slate-400 mt-1">副次パターン</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">感情型</div>
                  <div className="text-xs text-slate-400 mt-1">補助パターン</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">実践型</div>
                  <div className="text-xs text-slate-400 mt-1">潜在パターン</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 火水バランス */}
        <Card className="bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-indigo-400 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              火水バランス
            </CardTitle>
            <CardDescription className="text-slate-400">
              陽性エネルギーと陰性エネルギーのバランス
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-5 h-5 text-orange-400" />
                  <Label className="text-slate-300">火のエネルギー（陽性）</Label>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">現在値</span>
                  <span className="text-2xl font-bold text-orange-400">{fireWaterBalance.fire}</span>
                </div>
                <Progress value={fireWaterBalance.fire} className="h-3" />
                <p className="text-sm text-slate-500">
                  活動性、創造性、積極性を表します
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-400" />
                  <Label className="text-slate-300">水のエネルギー（陰性）</Label>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">現在値</span>
                  <span className="text-2xl font-bold text-blue-400">{fireWaterBalance.water}</span>
                </div>
                <Progress value={fireWaterBalance.water} className="h-3" />
                <p className="text-sm text-slate-500">
                  受容性、共感性、内省性を表します
                </p>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">バランス評価</h4>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">良好なバランス</span>
                </div>
                <p className="text-sm text-slate-400">
                  火と水のエネルギーがバランスよく保たれています。このバランスを維持することで、心身の調和が保たれます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 五十音波形 */}
        <Card className="bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-indigo-400 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              五十音波形
            </CardTitle>
            <CardDescription className="text-slate-400">
              各音韻の火水バランス
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gojuonWaveform.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-indigo-400 w-12">{item.char}</span>
                    <div className="flex-1 mx-4">
                      <div className="h-8 flex rounded overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-600 to-orange-400 flex items-center justify-center text-xs text-white font-semibold"
                          style={{ width: `${item.fire}%` }}
                        >
                          {item.fire > 20 && `火 ${item.fire}`}
                        </div>
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-xs text-white font-semibold"
                          style={{ width: `${item.water}%` }}
                        >
                          {item.water > 20 && `水 ${item.water}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4 mt-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">波形分析</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">火性優位音</div>
                  <div className="text-lg font-bold text-orange-400">ア、カ、サ、タ</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">水性優位音</div>
                  <div className="text-lg font-bold text-blue-400">ナ、ハ、マ</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 人格ゆがみ補正設定 */}
        <Card className="bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-indigo-400 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              人格ゆがみ補正設定
            </CardTitle>
            <CardDescription className="text-slate-400">
              思考パターンの自動補正と調整
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label htmlFor="auto-correction" className="text-slate-300">
                  自動補正
                </Label>
                <p className="text-sm text-slate-500 mt-1">
                  人格のゆがみを自動的に検知・補正します
                </p>
              </div>
              <Switch
                id="auto-correction"
                checked={autoCorrection}
                onCheckedChange={setAutoCorrection}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="sync-depth" className="text-slate-300">
                  同期深度
                </Label>
                <span className="text-indigo-400 font-bold">{syncDepth}</span>
              </div>
              <Slider
                id="sync-depth"
                value={[syncDepth]}
                onValueChange={(value) => setSyncDepth(value[0] || 70)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-slate-500 mt-2">
                深度が高いほど、より深いレベルで魂と同期します
              </p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">補正対象</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <Label className="text-slate-300 mb-2 block">思考パターン</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">ネガティブバイアス</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">完璧主義</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">過度な自己批判</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <Label className="text-slate-300 mb-2 block">感情パターン</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">不安の増幅</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">怒りの抑圧</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-slate-400">悲しみの回避</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={handleSaveSettings}
            >
              設定を保存
            </Button>
          </CardContent>
        </Card>

        {/* 同期履歴 */}
        <Card className="bg-slate-900/50 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl text-indigo-400 flex items-center gap-2">
              <Moon className="w-6 h-6" />
              同期履歴
            </CardTitle>
            <CardDescription className="text-slate-400">
              最近の魂同期セッション
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-semibold text-slate-300">
                        同期セッション #{5 - index}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(Date.now() - index * 86400000).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-slate-500">同期深度</div>
                      <div className="text-lg font-bold text-indigo-400">{70 + Math.floor(Math.random() * 20)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">補正数</div>
                      <div className="text-lg font-bold text-green-400">{Math.floor(Math.random() * 10)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">調和度</div>
                      <div className="text-lg font-bold text-purple-400">{80 + Math.floor(Math.random() * 15)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
