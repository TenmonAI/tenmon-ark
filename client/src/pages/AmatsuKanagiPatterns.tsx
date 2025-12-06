import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Hexagon, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AmatsuKanagiPatterns() {
  const { data: patterns, isLoading } = trpc.amatsuKanagi.getAllPatterns.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatterns = patterns?.filter(
    (p) =>
      p.sound.includes(searchTerm) ||
      p.pattern.includes(searchTerm) ||
      p.category.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            天津金木50パターン一覧
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            48相 + 霊核2相（ヤイ・ヤエ）= 50パターンの完全対応表
          </p>
        </div>

        {/* 検索バー */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="言霊、パターン、カテゴリーで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* ローディング */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* パターン一覧 */}
        {filteredPatterns && (
          <div className="space-y-4">
            {/* 中心霊（霊核2相） */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Hexagon className="h-6 w-6" />
                中心霊（霊核2相）
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredPatterns
                  .filter((p) => p.special)
                  .map((pattern) => (
                    <Card
                      key={pattern.number}
                      className="border-primary/30 bg-primary/5"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold text-primary">
                              {pattern.sound}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              No.{pattern.number}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-primary/20 rounded">
                            {pattern.category}
                          </span>
                        </div>
                        {pattern.meaning && (
                          <CardDescription className="text-primary font-medium text-base">
                            {pattern.meaning}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            パターン:
                          </span>
                          <p className="text-sm mt-1">{pattern.pattern}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            動作:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pattern.movements.map((movement: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-accent/10 border border-accent/20 rounded"
                              >
                                {movement}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* 天津金木24相 */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
                <Hexagon className="h-6 w-6" />
                天津金木24相（No.1-26）
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatterns
                  .filter((p) => p.category === "天津金木24相")
                  .map((pattern) => (
                    <Card key={pattern.number} className="border-secondary/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-secondary">
                              {pattern.sound}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              No.{pattern.number}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            パターン:
                          </span>
                          <p className="text-xs mt-1">{pattern.pattern}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            動作:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.movements.map((movement: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-accent/10 border border-accent/20 rounded"
                              >
                                {movement}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* 陰陽反転相 */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-accent flex items-center gap-2">
                <Hexagon className="h-6 w-6" />
                陰陽反転相（No.27-50）
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatterns
                  .filter((p) => p.category === "陰陽反転相")
                  .map((pattern) => (
                    <Card key={pattern.number} className="border-accent/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-accent">
                              {pattern.sound}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              No.{pattern.number}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            パターン:
                          </span>
                          <p className="text-xs mt-1">{pattern.pattern}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            動作:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.movements.map((movement: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-accent/10 border border-accent/20 rounded"
                              >
                                {movement}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
