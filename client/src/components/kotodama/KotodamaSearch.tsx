import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";

/**
 * TENMON-ARK 言霊検索コンポーネント vΩ-K
 * 
 * 言霊秘書準拠の言霊解釈を検索・表示
 */

export function KotodamaSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const { data: interpretations, isLoading } = trpc.kotodama.searchInterpretation.useQuery(
    { word: activeSearch },
    { enabled: activeSearch.length > 0 }
  );

  const handleSearch = () => {
    setActiveSearch(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>言霊検索</CardTitle>
        <CardDescription>
          言霊秘書に基づく言葉の解釈を検索します
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 検索入力 */}
        <div className="flex gap-2 mb-6">
          <Input
            type="text"
            placeholder="言葉を入力 (例: 言霊、布斗麻邇、水火)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
            <Search className="w-4 h-4 mr-2" />
            検索
          </Button>
        </div>

        {/* 検索結果 */}
        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && activeSearch && interpretations && interpretations.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            「{activeSearch}」の解釈が見つかりませんでした
          </div>
        )}

        {!isLoading && interpretations && interpretations.length > 0 && (
          <div className="space-y-4">
            {interpretations.map((interp) => (
              <Card key={interp.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {interp.wordKyuji || interp.word}
                    </CardTitle>
                    {interp.wordKyuji && interp.wordKyuji !== interp.word && (
                      <Badge variant="outline">
                        新字体: {interp.word}
                      </Badge>
                    )}
                  </div>
                  {interp.sourceSection && (
                    <CardDescription>
                      出典: {interp.sourceSection}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{interp.interpretation}</p>
                  </div>

                  {interp.relatedKana && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-2">関連する五十音</h4>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(interp.relatedKana).map((kana: string, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {kana}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 初期状態のヘルプ */}
        {!activeSearch && (
          <div className="text-center p-12 text-muted-foreground">
            <p className="mb-2">言葉を入力して検索してください</p>
            <p className="text-sm">例: 言霊、布斗麻邇、水火、五十音</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
