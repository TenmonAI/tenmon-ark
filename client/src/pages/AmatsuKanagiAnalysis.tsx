import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { Hexagon, Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AmatsuKanagiAnalysis() {
  const [inputText, setInputText] = useState("");
  const analyzeMutation = trpc.amatsuKanagi.analyze.useMutation();

  const handleAnalyze = () => {
    if (inputText.trim()) {
      analyzeMutation.mutate({ text: inputText });
    }
  };

  const result = analyzeMutation.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            天津金木解析
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            テキストから言霊（カタカナ）を抽出し、天津金木50パターンを解析します。火水バランス、螺旋構造を自動的に計算します。
          </p>
        </div>

        {/* 入力エリア */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hexagon className="h-5 w-5 text-primary" />
              テキスト入力
            </CardTitle>
            <CardDescription>
              解析したいテキストを入力してください。カタカナが自動的に抽出されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例: アイウエオ カキクケコ ..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="font-mono"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !inputText.trim()}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  天津金木解析を実行
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 解析結果 */}
        {result && (
          <div className="space-y-6">
            {/* 抽出された言霊 */}
            <Card>
              <CardHeader>
                <CardTitle>抽出された言霊</CardTitle>
                <CardDescription>
                  {result.extractedSounds.length}個のカタカナが検出されました
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.extractedSounds.map((sound, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary font-bold"
                    >
                      {sound}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* エネルギーバランス */}
            <Card className="border-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-secondary" />
                  火水エネルギーバランス
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 火のエネルギー */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">火（外発）</span>
                      <span className="text-2xl font-bold text-destructive">
                        {result.energyBalance.fire}
                      </span>
                    </div>
                    <Progress value={(result.energyBalance.fire / (result.energyBalance.fire + result.energyBalance.water)) * 100} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      拡散・発展・創造のエネルギー
                    </p>
                  </div>

                  {/* 水のエネルギー */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">水（内集）</span>
                      <span className="text-2xl font-bold text-secondary">
                        {result.energyBalance.water}
                      </span>
                    </div>
                    <Progress value={(result.energyBalance.water / (result.energyBalance.fire + result.energyBalance.water)) * 100} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      収縮・統合・凝縮のエネルギー
                    </p>
                  </div>
                </div>

                {/* バランス指標 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">バランス</span>
                    <div className="flex items-center gap-2">
                      {result.energyBalance.balance > 0.3 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : result.energyBalance.balance < -0.3 ? (
                        <TrendingDown className="h-4 w-4 text-secondary" />
                      ) : (
                        <Minus className="h-4 w-4 text-accent" />
                      )}
                      <span className="text-lg font-bold">
                        {(result.energyBalance.balance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={((result.energyBalance.balance + 1) / 2) * 100} 
                    className="h-3" 
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    -100%（水優勢）← 0%（調和）→ +100%（火優勢）
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 螺旋構造 */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hexagon className="h-5 w-5 text-accent" />
                  螺旋構造
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <span className="text-sm font-medium">左旋（反時計回り）</span>
                      <span className="text-xl font-bold text-primary">
                        {result.spiralStructure.leftRotation}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                      <span className="text-sm font-medium">右旋（時計回り）</span>
                      <span className="text-xl font-bold text-secondary">
                        {result.spiralStructure.rightRotation}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">内集</span>
                      <span className="text-xl font-bold text-accent">
                        {result.spiralStructure.innerConvergence}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                      <span className="text-sm font-medium">外発</span>
                      <span className="text-xl font-bold text-destructive">
                        {result.spiralStructure.outerDivergence}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 解釈 */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>解釈</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{result.interpretation}</p>
              </CardContent>
            </Card>

            {/* 検出されたパターン */}
            {result.patterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>検出された天津金木パターン</CardTitle>
                  <CardDescription>
                    {result.patterns.length}個のパターンが見つかりました
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.patterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          pattern.special
                            ? "bg-primary/10 border-primary/30"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-primary">
                              {pattern.sound}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              No.{pattern.number}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-secondary/20 rounded">
                            {pattern.category}
                          </span>
                        </div>
                        {pattern.special && pattern.meaning && (
                          <p className="text-sm text-primary font-medium mb-2">
                            {pattern.meaning}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">
                          {pattern.pattern}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pattern.movements.map((movement, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-xs px-2 py-1 bg-accent/10 border border-accent/20 rounded"
                            >
                              {movement}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* エラー表示 */}
        {analyzeMutation.isError && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">
                {analyzeMutation.error?.message || "解析に失敗しました"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
