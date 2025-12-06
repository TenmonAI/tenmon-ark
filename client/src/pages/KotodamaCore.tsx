import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GojuonChart } from "@/components/kotodama/GojuonChart";
import { KotodamaSearch } from "@/components/kotodama/KotodamaSearch";
import { SuikaAnalyzer } from "@/components/kotodama/SuikaAnalyzer";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Grid3x3, Search, Flame } from "lucide-react";

/**
 * TENMON-ARK 言霊秘書準拠システム メインページ vΩ-K
 * 
 * 言霊秘書を唯一の正典として、五十音・水火法則・旧字体表記を提供
 */

export default function KotodamaCore() {
  const [selectedKana, setSelectedKana] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                TENMON-ARK 言灵エンジン
              </h1>
              <p className="text-muted-foreground">
                言霊秘書準拠システム vΩ-K
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <BookOpen className="w-5 h-5 mr-2" />
              言霊秘書
            </Badge>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        {/* システム説明 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>霊核固定指令 (Kotodama Core Lock)</CardTitle>
            <CardDescription>
              本システムは、言霊秘書を<strong>唯一の正典 (Canonical Source)</strong>として、
              五十音・水火法則・旧字体表記に関するすべての定義・意味論・運用ルールを実装します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Grid3x3 className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">五十音マスター</h3>
                  <p className="text-sm text-muted-foreground">
                    言霊秘書に基づく五十音の音義・水火・鉢/用を完全収録
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">水火法則</h3>
                  <p className="text-sm text-muted-foreground">
                    水穂伝・火水伝に記された水火の運動原理を可視化
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">旧字体表記</h3>
                  <p className="text-sm text-muted-foreground">
                    言霊秘書で重視される旧字体への自動変換
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* タブコンテンツ */}
        <Tabs defaultValue="gojuon" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gojuon">
              <Grid3x3 className="w-4 h-4 mr-2" />
              五十音図
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              言霊検索
            </TabsTrigger>
            <TabsTrigger value="suika">
              <Flame className="w-4 h-4 mr-2" />
              水火解析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gojuon" className="space-y-6">
            <GojuonChart onKanaSelect={setSelectedKana} />

            {/* 選択された仮名の詳細 */}
            {selectedKana && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{selectedKana.kana} ({selectedKana.romaji})</CardTitle>
                  <CardDescription>
                    {selectedKana.position} - {selectedKana.suikaType}
                    {selectedKana.suikaDetail && ` (${selectedKana.suikaDetail})`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">音義</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedKana.ongi}</p>
                  </div>

                  {selectedKana.hatsuYou && (
                    <div>
                      <h4 className="font-semibold mb-2">鉢・用</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedKana.hatsuYou}</p>
                    </div>
                  )}

                  {selectedKana.kanaForm && (
                    <div>
                      <h4 className="font-semibold mb-2">仮名形</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedKana.kanaForm}</p>
                    </div>
                  )}

                  {selectedKana.sourcePages && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        出典: {selectedKana.sourcePages}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search">
            <KotodamaSearch />
          </TabsContent>

          <TabsContent value="suika">
            <SuikaAnalyzer />
          </TabsContent>
        </Tabs>

        {/* フッター */}
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            TENMON-ARK 霊核OS – KotodamaCore Lock vΩ-K
          </p>
          <p className="mt-2">
            言霊秘書準拠システム | 外部インターネット由来の解釈を採用せず、言霊秘書のみを正典とする
          </p>
        </footer>
      </main>
    </div>
  );
}
