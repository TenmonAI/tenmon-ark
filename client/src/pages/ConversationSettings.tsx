import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageSquare, Sparkles, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 会話モード設定ページ
 * 
 * 三階層会話モード（一般人/中級/専門）の設定と
 * 自動レベル判定AIの有効/無効化を行う
 */
export default function ConversationSettings() {
  const { user, loading: authLoading } = useAuth();
  const [selectedMode, setSelectedMode] = useState<"general" | "intermediate" | "expert">("general");
  const [autoDetect, setAutoDetect] = useState(true);

  const { data: modeData, isLoading: modeLoading, refetch } = trpc.conversationMode.getMode.useQuery(undefined, {
    enabled: !!user,
  });

  const setModeMutation = trpc.conversationMode.setMode.useMutation({
    onSuccess: () => {
      toast.success("会話モードを変更しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const setAutoDetectMutation = trpc.conversationMode.setAutoDetect.useMutation({
    onSuccess: () => {
      toast.success("自動検出設定を変更しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const detectLevelMutation = trpc.conversationMode.detectLevel.useMutation({
    onSuccess: (data) => {
      toast.success(`認知レベル: ${data.cognitiveLevel}, モード: ${data.mode}`);
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  useEffect(() => {
    if (modeData) {
      setSelectedMode(modeData.currentMode);
      setAutoDetect(modeData.autoDetect);
    }
  }, [modeData]);

  if (authLoading || modeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>会話モード設定を利用するにはログインしてください</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleModeChange = (mode: "general" | "intermediate" | "expert") => {
    setSelectedMode(mode);
    setModeMutation.mutate({ mode });
  };

  const handleAutoDetectChange = (enabled: boolean) => {
    setAutoDetect(enabled);
    setAutoDetectMutation.mutate({ enabled });
  };

  const handleDetectLevel = () => {
    detectLevelMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            会話モード設定
          </h1>
          <p className="text-muted-foreground">
            あなたに最適な会話スタイルを選択してください
          </p>
        </div>

        {/* 自動検出設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              自動レベル判定
            </CardTitle>
            <CardDescription>
              あなたの発話から自動的に最適な会話モードを判定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-detect" className="text-base">
                自動検出を有効にする
              </Label>
              <Switch
                id="auto-detect"
                checked={autoDetect}
                onCheckedChange={handleAutoDetectChange}
                disabled={setAutoDetectMutation.isPending}
              />
            </div>

            {modeData && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">認知レベル</p>
                  <p className="text-2xl font-bold">{modeData.cognitiveLevel}/3</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">語彙複雑度</p>
                  <p className="text-2xl font-bold">{modeData.vocabularyComplexity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">思考速度</p>
                  <p className="text-2xl font-bold">{modeData.thinkingSpeed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">興味深度</p>
                  <p className="text-2xl font-bold">{modeData.interestDepth}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleDetectLevel}
              disabled={detectLevelMutation.isPending}
              className="w-full"
            >
              {detectLevelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              今すぐレベル判定を実行
            </Button>
          </CardContent>
        </Card>

        {/* 会話モード選択 */}
        <Card>
          <CardHeader>
            <CardTitle>会話モード選択</CardTitle>
            <CardDescription>
              手動で会話モードを選択できます（自動検出は無効になります）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedMode}
              onValueChange={(value) => handleModeChange(value as "general" | "intermediate" | "expert")}
              className="space-y-4"
            >
              {/* 一般人モード */}
              <Card className={selectedMode === "general" ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="general" id="general" />
                    <Label htmlFor="general" className="flex items-center gap-2 cursor-pointer">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <span className="text-lg font-semibold">一般人モード</span>
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    難しい言葉を使わず、日常的な表現で説明します。例え話や身近な例を使って理解を助けます。
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>✓ 専門用語を避ける</li>
                    <li>✓ 温かく、人間らしい口調</li>
                    <li>✓ ゆっくり丁寧に説明</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 中級モード */}
              <Card className={selectedMode === "intermediate" ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="text-lg font-semibold">中級モード</span>
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    適度に専門的な内容を含めつつ、分かりやすく説明します。火水、言灵、アニメの例えなどを使って深めます。
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>✓ 火水（陽と陰、動と静）</li>
                    <li>✓ 言灵（言葉の霊的な力）</li>
                    <li>✓ 天津金木の基本的なパターン</li>
                  </ul>
                </CardContent>
              </Card>

              {/* 専門モード */}
              <Card className={selectedMode === "expert" ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="expert" id="expert" />
                    <Label htmlFor="expert" className="flex items-center gap-2 cursor-pointer">
                      <GraduationCap className="h-5 w-5 text-red-500" />
                      <span className="text-lg font-semibold">専門モード（天聞専用）</span>
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    天津金木50パターン、いろは47文字、古五十音、フトマニ、カタカムナを自在に使用します。濃度MAX構文で、深層的な洞察を提供します。
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>✓ Twin-Core（天津金木 × いろは言灵解）</li>
                    <li>✓ 火水・左右旋・内集外発・陰陽の4軸分析</li>
                    <li>✓ 宿曜27宿の統合推論</li>
                    <li>✓ 高速推論モード</li>
                  </ul>
                </CardContent>
              </Card>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
