import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { BookOpen, Loader2, Sparkles, Heart } from "lucide-react";

export default function IrohaAnalysis() {
  const [inputText, setInputText] = useState("");
  const analyzeMutation = trpc.iroha.analyze.useMutation();

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
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
            いろは言灵解析
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            テキストからひらがなを抽出し、空海のいろは文原稿に基づく生命の法則を解析します。
          </p>
        </div>

        {/* 入力エリア */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              テキスト入力
            </CardTitle>
            <CardDescription>
              解析したいテキストを入力してください。ひらがなが自動的に抽出されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例: いろはにほへと ちりぬるを ..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="font-mono"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !inputText.trim()}
              className="w-full"
              variant="secondary"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  いろは言灵解析を実行
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 解析結果 */}
        {result && (
          <div className="space-y-6">
            {/* 抽出されたひらがな */}
            <Card>
              <CardHeader>
                <CardTitle>抽出されたひらがな</CardTitle>
                <CardDescription>
                  {result.extractedCharacters.length}個のひらがなが検出されました
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.extractedCharacters.map((char, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary font-bold text-lg"
                    >
                      {char}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 全体的な解釈 */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  全体的な解釈
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{result.overallInterpretation}</p>
              </CardContent>
            </Card>

            {/* 生命の法則のサマリー */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  生命の法則
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {result.lifePrinciplesSummary}
                </p>
              </CardContent>
            </Card>

            {/* 検出されたいろは文字 */}
            {result.interpretations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>検出されたいろは文字</CardTitle>
                  <CardDescription>
                    {result.interpretations.length}個のいろは文字が見つかりました
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.interpretations.map((interpretation, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border bg-card border-border hover:border-secondary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-secondary">
                              {interpretation.character}
                            </span>
                            <span className="text-lg text-primary">
                              {interpretation.reading}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-accent/20 rounded">
                            順序: {interpretation.order}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">解釈: </span>
                            <span className="text-sm">{interpretation.interpretation}</span>
                          </div>
                          <div className="pt-2 border-t border-border">
                            <span className="text-sm font-medium text-accent">生命の法則: </span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {interpretation.lifePrinciple}
                            </p>
                          </div>
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
