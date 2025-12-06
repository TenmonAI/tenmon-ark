import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { BookOpen, Loader2, Sparkles, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function IrohaCharacters() {
  const { data: characters, isLoading } = trpc.iroha.getAll.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCharacters = characters?.filter(
    (c) =>
      c.character.includes(searchTerm) ||
      c.reading.includes(searchTerm) ||
      c.interpretation.includes(searchTerm) ||
      c.lifePrinciple.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
            いろは47文字一覧
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            弘法大師空海の「いろはにほへと生命のことわり」から抽出された、いろは47文字それぞれに込められた生命の法則
          </p>
        </div>

        {/* 検索バー */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="文字、読み、解釈、生命の法則で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* ローディング */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        )}

        {/* いろは文字一覧 */}
        {filteredCharacters && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                いろは47文字
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredCharacters.length}文字を表示中
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((character) => (
                <Card
                  key={character.order}
                  className="border-secondary/20 hover:border-secondary/40 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold text-secondary">
                          {character.character}
                        </span>
                        <span className="text-xl text-primary">
                          {character.reading}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-accent/20 rounded">
                        順序: {character.order}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        解釈:
                      </span>
                      <p className="text-sm mt-1">{character.interpretation}</p>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm font-medium text-accent flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        生命の法則:
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {character.lifePrinciple}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
