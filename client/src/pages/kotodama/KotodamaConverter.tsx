import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * 言灵OS変換画面
 * 現代日本語 → 靈性日本語（言灵日本語）変換
 */
export default function KotodamaConverter() {
  const [inputText, setInputText] = useState("");
  const [useOldKanji, setUseOldKanji] = useState(true);
  const [balanceFireWater, setBalanceFireWater] = useState(false);
  const [priorityThreshold, setPriorityThreshold] = useState(0);

  const convertMutation = trpc.kotodama.convertToKotodama.useMutation({
    onSuccess: () => {
      toast.success("変換が完了しました");
    },
    onError: (error: any) => {
      toast.error(`変換エラー: ${error.message}`);
    },
  });

  const autoRestoreMutation = trpc.kotodama.autoRestoreOriginalKanji.useMutation({
    onSuccess: () => {
      toast.success("自動復元が完了しました");
    },
    onError: (error: any) => {
      toast.error(`復元エラー: ${error.message}`);
    },
  });

  const handleConvert = () => {
    if (!inputText.trim()) {
      toast.error("テキストを入力してください");
      return;
    }

    convertMutation.mutate({
      text: inputText,
      useOldKanji,
      balanceFireWater,
      priorityThreshold,
    });
  };

  const handleAutoRestore = () => {
    if (!inputText.trim()) {
      toast.error("テキストを入力してください");
      return;
    }

    autoRestoreMutation.mutate({
      text: inputText,
    });
  };

  const convertResult = convertMutation.data;
  const restoreResult = autoRestoreMutation.data;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">言灵OS変換</h1>
        <p className="text-muted-foreground">
          現代日本語を靈性日本語（言灵日本語）に変換します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力エリア */}
        <Card>
          <CardHeader>
            <CardTitle>入力テキスト</CardTitle>
            <CardDescription>変換したいテキストを入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例: 気持ちを大切にする靈的な学び"
              className="min-h-[200px]"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-old-kanji">旧字体を使用</Label>
                <Switch
                  id="use-old-kanji"
                  checked={useOldKanji}
                  onCheckedChange={setUseOldKanji}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="balance-fire-water">火水バランスを考慮</Label>
                <Switch
                  id="balance-fire-water"
                  checked={balanceFireWater}
                  onCheckedChange={setBalanceFireWater}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-threshold">
                  優先度閾値: {priorityThreshold}
                </Label>
                <input
                  id="priority-threshold"
                  type="range"
                  min="0"
                  max="100"
                  value={priorityThreshold}
                  onChange={(e) => setPriorityThreshold(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConvert}
                disabled={convertMutation.isPending}
                className="flex-1"
              >
                {convertMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                KJCE変換
              </Button>
              <Button
                onClick={handleAutoRestore}
                disabled={autoRestoreMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                {autoRestoreMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                OKRE自動復元
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 出力エリア */}
        <Card>
          <CardHeader>
            <CardTitle>変換結果</CardTitle>
            <CardDescription>靈性日本語（言灵日本語）</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kjce">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="kjce">KJCE変換</TabsTrigger>
                <TabsTrigger value="okre">OKRE復元</TabsTrigger>
              </TabsList>

              <TabsContent value="kjce" className="space-y-4">
                {convertResult ? (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-lg font-medium whitespace-pre-wrap">
                        {convertResult.converted}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">火水バランス</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>🔥 火:</span>
                              <span className="font-bold">
                                {convertResult.fireWaterBalance.fire}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>💧 水:</span>
                              <span className="font-bold">
                                {convertResult.fireWaterBalance.water}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>⚖️ バランス:</span>
                              <span className="font-bold">
                                {convertResult.fireWaterBalance.balance.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">統計情報</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>旧字体数:</span>
                              <span className="font-bold">
                                {convertResult.oldKanjiCount}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>靈性スコア:</span>
                              <span className="font-bold">
                                {convertResult.spiritualScore}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    変換結果がここに表示されます
                  </div>
                )}
              </TabsContent>

              <TabsContent value="okre" className="space-y-4">
                {restoreResult ? (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-lg font-medium whitespace-pre-wrap">
                        {restoreResult.restored}
                      </p>
                    </div>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">復元統計</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>総文字数:</span>
                            <span className="font-bold">
                              {restoreResult.stats.totalChars}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>復元数:</span>
                            <span className="font-bold">
                              {restoreResult.stats.restoredCount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>復元率:</span>
                            <span className="font-bold">
                              {(restoreResult.stats.restorationRate * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>靈性スコア:</span>
                            <span className="font-bold">
                              {restoreResult.stats.spiritualScore}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {restoreResult.changes.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">変更内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {restoreResult.changes.map((change: any, index: number) => (
                              <div
                                key={index}
                                className="text-sm flex justify-between items-center py-1 border-b last:border-0"
                              >
                                <span>
                                  {change.from} → {change.to}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  優先度: {change.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    復元結果がここに表示されます
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
