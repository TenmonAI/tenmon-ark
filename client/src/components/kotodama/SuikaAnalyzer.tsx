import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplet, Wind, Circle, Loader2 } from "lucide-react";

/**
 * TENMON-ARK 水火解析コンポーネント vΩ-K
 * 
 * テキストの水火バランスを解析・可視化
 */

const SUIKA_ICONS: Record<string, any> = {
  "水": Droplet,
  "火": Flame,
  "空": Wind,
  "中": Circle,
};

const SUIKA_COLORS: Record<string, string> = {
  "水": "text-blue-500",
  "火": "text-red-500",
  "空": "text-gray-500",
  "中": "text-yellow-500",
};

export function SuikaAnalyzer() {
  const [text, setText] = useState("");
  const [activeText, setActiveText] = useState("");

  const { data: analysis, isLoading } = trpc.kotodama.analyzeSuika.useQuery(
    { text: activeText },
    { enabled: activeText.length > 0 }
  );

  const handleAnalyze = () => {
    setActiveText(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>水火解析</CardTitle>
        <CardDescription>
          テキスト中の五十音を解析し、水火バランスを算出します
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* テキスト入力 */}
        <div className="space-y-4 mb-6">
          <Textarea
            placeholder="解析したいテキストを入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <Button onClick={handleAnalyze} disabled={!text.trim()} className="w-full">
            解析開始
          </Button>
        </div>

        {/* 解析結果 */}
        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && analysis && (
          <div className="space-y-6">
            {/* 統計サマリー */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{analysis.analysis.total}</div>
                    <div className="text-sm text-muted-foreground mt-1">総文字数</div>
                  </div>
                </CardContent>
              </Card>

              {["水", "火", "空", "中"].map((type) => {
                const Icon = SUIKA_ICONS[type];
                const count = analysis.analysis[type as keyof typeof analysis.analysis] as number;
                
                return (
                  <Card key={type}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${SUIKA_COLORS[type]}`} />
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground mt-1">{type}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 水火バランス */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">水火バランス</CardTitle>
                <CardDescription>
                  支配的タイプ: <Badge variant="default">{analysis.dominantType}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analysis.balance).map(([type, percentage]) => {
                  const Icon = SUIKA_ICONS[type];
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${SUIKA_COLORS[type]}`} />
                          <span className="font-medium">{type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* 詳細解析 */}
            {analysis.analysis.details.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">詳細解析</CardTitle>
                  <CardDescription>
                    各文字の水火タイプと音義
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {analysis.analysis.details.map((detail: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                        <Badge variant="outline" className="shrink-0">
                          {detail.kana}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{detail.suikaType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {detail.ongi}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 初期状態のヘルプ */}
        {!activeText && !isLoading && (
          <div className="text-center p-12 text-muted-foreground">
            <p className="mb-2">テキストを入力して解析してください</p>
            <p className="text-sm">五十音の水火バランスを可視化します</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
