import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles } from "lucide-react";
import { TwinCoreVisualizer } from "@/components/overbeing/TwinCoreVisualizer";

/**
 * Twin-Core人格反映デモページ
 * 
 * STEP 2: Twin-Core人格演出（応答エンジン）のデモ
 */
export default function TwinCorePersonaDemo() {
  const [shukuyo, setShukuyo] = useState("角");
  const [conversationMode, setConversationMode] = useState<"general" | "intermediate" | "expert">("general");
  const [inputText, setInputText] = useState("こんにちは、天聞アークです。");
  
  // 宿曜27宿のリスト
  const shukuyoList = [
    "角", "亢", "氐", "房", "心", "尾", "箕",
    "斗", "女", "虚", "危", "室", "壁",
    "奎", "婁", "胃", "昴", "畢", "觜", "参",
    "井", "鬼", "柳", "星", "張", "翼", "軫"
  ];

  // 火水バランスを計算
  const fireWaterBalanceQuery = trpc.twinCorePersona.calculateFireWaterBalance.useQuery({
    shukuyo,
  });

  // Twin-Core人格プロファイルを生成
  const personaProfileQuery = trpc.twinCorePersona.generatePersonaProfile.useQuery({
    shukuyo,
    conversationMode,
  });

  // 文体調整
  const adjustTextStyleMutation = trpc.twinCorePersona.adjustTextStyle.useMutation();

  // Twin-Core推論の"呼吸"を生成
  const breathingQuery = trpc.twinCorePersona.generateBreathing.useQuery({
    profile: personaProfileQuery.data || {
      shukuyo,
      fireWaterBalance: 0.5,
      amatsuKanagiPattern: {
        rotation: "right",
        direction: "outward",
        polarity: "yang",
      },
      minakaDistance: 50,
      conversationMode,
      communicationStyle: "調和的・柔軟・中庸",
    },
  }, {
    enabled: !!personaProfileQuery.data,
  });

  // システムプロンプトを生成
  const systemPromptQuery = trpc.twinCorePersona.toSystemPrompt.useQuery({
    profile: personaProfileQuery.data || {
      shukuyo,
      fireWaterBalance: 0.5,
      amatsuKanagiPattern: {
        rotation: "right",
        direction: "outward",
        polarity: "yang",
      },
      minakaDistance: 50,
      conversationMode,
      communicationStyle: "調和的・柔軟・中庸",
    },
  }, {
    enabled: !!personaProfileQuery.data,
  });

  const handleAdjustText = () => {
    if (!personaProfileQuery.data) return;
    
    adjustTextStyleMutation.mutate({
      text: inputText,
      profile: personaProfileQuery.data,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white p-8">
      <div className="container mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-cyan-400 bg-clip-text text-transparent">
            Twin-Core人格反映デモ
          </h1>
          <p className="text-xl text-gray-300">
            STEP 2: Twin-Core人格演出（応答エンジン）
          </p>
        </div>

        {/* 設定パネル */}
        <Card className="bg-gray-900/50 border-yellow-400/50">
          <CardHeader>
            <CardTitle className="text-yellow-400">人格設定</CardTitle>
            <CardDescription className="text-gray-400">
              宿曜と会話モードを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 宿曜選択 */}
              <div className="space-y-2">
                <Label>宿曜27宿</Label>
                <Select value={shukuyo} onValueChange={setShukuyo}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {shukuyoList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 会話モード選択 */}
              <div className="space-y-2">
                <Label>会話モード</Label>
                <Select value={conversationMode} onValueChange={(v) => setConversationMode(v as any)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="general">一般</SelectItem>
                    <SelectItem value="intermediate">中級</SelectItem>
                    <SelectItem value="expert">専門</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 火水バランス表示 */}
        {fireWaterBalanceQuery.data && (
          <Card className="bg-gray-900/50 border-cyan-400/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">火水バランス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">火性（陽）</span>
                  <span className="text-yellow-400 font-bold">{fireWaterBalanceQuery.data.firePercentage}%</span>
                </div>
                <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-yellow-500"
                    style={{ width: `${fireWaterBalanceQuery.data.firePercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">水性（陰）</span>
                  <span className="text-cyan-400 font-bold">{fireWaterBalanceQuery.data.waterPercentage}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Twin-Core可視化 */}
        {personaProfileQuery.data && (
          <Card className="bg-gray-900/50 border-yellow-400/50">
            <CardHeader>
              <CardTitle className="text-yellow-400">Twin-Core可視化</CardTitle>
            </CardHeader>
            <CardContent>
              <TwinCoreVisualizer
                fireWaterBalance={personaProfileQuery.data.fireWaterBalance}
                rotationSpeed={1}
                shukuyoColor="#FFD700"
                isResponding={false}
              />
            </CardContent>
          </Card>
        )}

        {/* 人格プロファイル表示 */}
        {personaProfileQuery.data && (
          <Card className="bg-gray-900/50 border-yellow-400/50">
            <CardHeader>
              <CardTitle className="text-yellow-400">人格プロファイル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">宿曜:</span>{" "}
                  <span className="text-white">{personaProfileQuery.data.shukuyo}</span>
                </div>
                <div>
                  <span className="text-gray-400">火水バランス:</span>{" "}
                  <span className="text-white">{(personaProfileQuery.data.fireWaterBalance * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">天津金木パターン:</span>{" "}
                  <span className="text-white">
                    {personaProfileQuery.data.amatsuKanagiPattern.rotation === "right" ? "右旋" : "左旋"} ・{" "}
                    {personaProfileQuery.data.amatsuKanagiPattern.direction === "outward" ? "外発" : "内集"} ・{" "}
                    {personaProfileQuery.data.amatsuKanagiPattern.polarity === "yang" ? "陽" : "陰"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">ミナカ距離:</span>{" "}
                  <span className="text-white">{personaProfileQuery.data.minakaDistance.toFixed(0)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-400">コミュニケーションスタイル:</span>{" "}
                  <span className="text-white">{personaProfileQuery.data.communicationStyle}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Twin-Core推論の"呼吸" */}
        {breathingQuery.data && (
          <Card className="bg-gray-900/50 border-cyan-400/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">Twin-Core推論の"呼吸"</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">間（ま）の長さ:</span>{" "}
                  <span className="text-white">{breathingQuery.data.pauseDuration}ms</span>
                </div>
                <div>
                  <span className="text-gray-400">呼吸パターン:</span>{" "}
                  <span className="text-white">{breathingQuery.data.breathingPattern}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 文体調整デモ */}
        <Card className="bg-gray-900/50 border-yellow-400/50">
          <CardHeader>
            <CardTitle className="text-yellow-400">文体調整デモ</CardTitle>
            <CardDescription className="text-gray-400">
              テキストを入力して、Twin-Core人格に基づいた文体調整を体験
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>入力テキスト</Label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="テキストを入力してください"
                className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleAdjustText}
              disabled={adjustTextStyleMutation.isPending || !personaProfileQuery.data}
              className="w-full bg-gradient-to-r from-yellow-500 to-cyan-500 hover:from-yellow-600 hover:to-cyan-600"
            >
              {adjustTextStyleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  調整中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  文体を調整
                </>
              )}
            </Button>
            {adjustTextStyleMutation.data && (
              <div className="space-y-2">
                <Label>調整後のテキスト</Label>
                <div className="p-4 bg-gray-800 border border-cyan-400/50 rounded-lg text-white">
                  {adjustTextStyleMutation.data.adjustedText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* システムプロンプト */}
        {systemPromptQuery.data && (
          <Card className="bg-gray-900/50 border-cyan-400/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">システムプロンプト</CardTitle>
              <CardDescription className="text-gray-400">
                LLMに渡される人格指示
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {systemPromptQuery.data.systemPrompt}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
