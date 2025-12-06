/**
 * Ark Browser V2
 * 世界検索 × Deep Parse
 * - UI最適化（検索バー、結果表示）
 * - 意図翻訳バー実装
 * - DeepParse段落抽出エンジン
 * - 多言語検索対応
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Shield, Sparkles, AlertTriangle, Globe, Languages, MessageSquare, FileText, Globe2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  language?: string;
  thumbnail?: string;
  favicon?: string;
  publishedDate?: string;
}

interface DeepParseResult {
  paragraphs: {
    text: string;
    importance: number;
    topic?: string;
  }[];
  keyPoints: string[];
  summary: string;
}

export default function ArkBrowserV2() {
  const [searchQuery, setSearchQuery] = useState("");
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pageContent, setPageContent] = useState("");
  const [deepParseResult, setDeepParseResult] = useState<DeepParseResult | null>(null);
  const [summary, setSummary] = useState("");
  const [kotodamaText, setKotodamaText] = useState("");
  const [threats, setThreats] = useState<any>(null);
  const [intentTranslation, setIntentTranslation] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [, setLocation] = useLocation();

  const fetchPageMutation = trpc.arkBrowser.fetchPage.useMutation();
  const summarizeMutation = trpc.arkBrowser.summarizePage.useMutation();
  const transformMutation = trpc.arkBrowser.convertPageToSpiritual.useMutation();
  const detectThreatsMutation = trpc.arkBrowser.detectDangerousSite.useMutation();

  // 世界検索（多言語対応）
  const handleWorldSearch = async () => {
    if (!searchQuery) return;
    
    try {
      // TODO: 実際の検索APIを呼び出す
      // 仮の検索結果
      const mockResults: SearchResult[] = [
        {
          title: searchQuery + " - Wikipedia",
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(searchQuery)}`,
          snippet: `${searchQuery}に関する詳細な情報...`,
          language: "en"
        },
        {
          title: searchQuery + " - 解説",
          url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(searchQuery)}`,
          snippet: `${searchQuery}についての日本語の解説...`,
          language: "ja"
        }
      ];
      setSearchResults(mockResults);
    } catch (error) {
      console.error("Failed to search:", error);
    }
  };

  const translateIntentMutation = trpc.arkBrowser.translateIntent.useMutation();

  // 意図翻訳（ユーザーの検索意図を翻訳）
  const handleIntentTranslation = async () => {
    if (!searchQuery) return;
    
    try {
      const result = await translateIntentMutation.mutateAsync({
        query: searchQuery,
        targetLanguage,
      });
      setIntentTranslation(result.translatedIntent);
    } catch (error) {
      console.error("Failed to translate intent:", error);
    }
  };

  const deepParseMutation = trpc.arkBrowser.deepParse.useMutation();

  // DeepParse段落抽出
  const handleDeepParse = async () => {
    if (!pageContent) return;
    
    try {
      const result = await deepParseMutation.mutateAsync({
        content: pageContent,
        maxParagraphs: 10,
      });
      setDeepParseResult(result);
    } catch (error) {
      console.error("Failed to deep parse:", error);
    }
  };

  const handleOpenPage = async () => {
    if (!url) return;
    
    try {
      const result = await fetchPageMutation.mutateAsync({ url });
      setCurrentUrl(url);
      setPageContent(result.content);
      setSummary("");
      setKotodamaText("");
      setThreats(null);
      setDeepParseResult(null);
      
      // 自動的にDeepParseを実行
      setTimeout(() => handleDeepParse(), 1000);
    } catch (error) {
      console.error("Failed to open page:", error);
    }
  };

  const handleSummarize = async () => {
    if (!currentUrl) return;
    
    try {
      const result = await summarizeMutation.mutateAsync({ content: pageContent, maxLength: 500 });
      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to summarize:", error);
    }
  };

  const handleTransformKotodama = async () => {
    if (!currentUrl) return;
    
    try {
      const result = await transformMutation.mutateAsync({ content: pageContent });
      setKotodamaText(result.spiritualText);
    } catch (error) {
      console.error("Failed to transform:", error);
    }
  };

  const handleDetectThreats = async () => {
    if (!currentUrl) return;
    
    try {
      const result = await detectThreatsMutation.mutateAsync({ url: currentUrl, content: pageContent });
      setThreats(result);
    } catch (error) {
      console.error("Failed to detect threats:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      {/* 世界検索バー（最上部、最優先） */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="container mx-auto p-4 space-y-3">
          {/* メイン検索バー */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="🌐 世界を検索... (キーワード or URL)"
              value={searchQuery || url}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("http")) {
                  setUrl(value);
                  setSearchQuery("");
                } else {
                  setSearchQuery(value);
                  setUrl("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (url) {
                    handleOpenPage();
                  } else {
                    handleWorldSearch();
                  }
                }
              }}
              className="flex-1 bg-slate-800/50 border-amber-500/50 text-slate-100 placeholder:text-slate-400 text-lg h-12 focus:border-amber-500"
            />
            <Button 
              onClick={() => url ? handleOpenPage() : handleWorldSearch()} 
              disabled={fetchPageMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold h-12 px-6"
            >
              {fetchPageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span className="ml-2">検索</span>
            </Button>
          </div>

          {/* 意図翻訳バー */}
          {searchQuery && (
            <div className="flex gap-2 items-center">
              <Languages className="h-4 w-4 text-amber-400" />
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100 rounded px-2 py-1 text-sm"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
              </select>
              <Button 
                onClick={handleIntentTranslation}
                variant="ghost"
                size="sm"
                className="text-amber-400 hover:text-amber-300"
              >
                意図を翻訳
              </Button>
              {intentTranslation && (
                <span className="text-sm text-slate-400">{intentTranslation}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">

        {/* 検索結果（改善版） */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              🌐 検索結果
              <span className="text-sm text-slate-400 font-normal">({searchResults.length}件)</span>
            </h2>
            <div className="grid gap-4">
              {searchResults.map((result, index) => (
                <Card 
                  key={index} 
                  className="bg-slate-900/50 border-slate-700 hover:border-amber-500/70 hover:bg-slate-900/70 transition-all cursor-pointer group overflow-hidden"
                  onClick={() => {
                    setUrl(result.url);
                    handleOpenPage();
                  }}
                >
                  <div className="flex gap-4 p-4">
                    {/* サムネイル画像 */}
                    {result.thumbnail ? (
                      <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-slate-800">
                        <img 
                          src={result.thumbnail} 
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-32 h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-slate-600" />
                      </div>
                    )}
                    
                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      {/* タイトルとファビコン */}
                      <div className="flex items-start gap-2 mb-2">
                        {result.favicon && (
                          <img 
                            src={result.favicon} 
                            alt="" 
                            className="w-4 h-4 mt-1 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <h3 className="text-lg font-semibold text-amber-400 group-hover:text-amber-300 transition-colors line-clamp-2">
                          {result.title}
                        </h3>
                      </div>
                      
                      {/* URL */}
                      <p className="text-sm text-slate-500 mb-2 truncate">{result.url}</p>
                      
                      {/* 抽出 */}
                      <p className="text-slate-300 text-sm line-clamp-2 mb-3">{result.snippet}</p>
                      
                      {/* メタ情報 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {result.language && (
                          <span className="px-2 py-1 bg-slate-800 text-xs text-slate-400 rounded-full border border-slate-700">
                            {result.language.toUpperCase()}
                          </span>
                        )}
                        {result.publishedDate && (
                          <span className="px-2 py-1 bg-slate-800 text-xs text-slate-400 rounded-full border border-slate-700">
                            {result.publishedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 危険検知アラート */}
        {threats && threats.dangerLevel !== "safe" && (
          <Alert variant="destructive" className="border-2 bg-red-950/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ 危険を検知しました</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>危険レベル:</strong> {threats.dangerLevel}</p>
                <p><strong>危険タイプ:</strong> {threats.dangerType.join(", ")}</p>
                <p><strong>説明:</strong> {threats.description}</p>
                <p className="text-sm text-muted-foreground">このページは安全でない可能性があります。閲覧を続ける場合は注意してください。</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* DeepParse結果 */}
        {deepParseResult && (
          <Card className="bg-slate-900/50 border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-400">📊 DeepParse 分析結果</CardTitle>
              <CardDescription>段落の重要度順に抽出</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* キーポイント */}
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">🔑 キーポイント</h3>
                <ul className="list-disc list-inside space-y-1">
                  {deepParseResult.keyPoints.map((point, index) => (
                    <li key={index} className="text-slate-300">{point}</li>
                  ))}
                </ul>
              </div>

              {/* 重要段落（改善版） */}
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                  📝 重要段落
                  <span className="text-xs text-slate-400 font-normal">（重要度順）</span>
                </h3>
                <div className="space-y-4">
                  {deepParseResult.paragraphs.map((para, index) => {
                    // 重要度に応じた色分け
                    const importanceLevel = para.importance >= 0.8 ? 'high' : para.importance >= 0.5 ? 'medium' : 'low';
                    const borderColor = importanceLevel === 'high' ? 'border-amber-500/70' : importanceLevel === 'medium' ? 'border-blue-500/50' : 'border-slate-600';
                    const bgColor = importanceLevel === 'high' ? 'bg-amber-950/30' : importanceLevel === 'medium' ? 'bg-blue-950/20' : 'bg-slate-800/30';
                    const badgeColor = importanceLevel === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : importanceLevel === 'medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-slate-700/50 text-slate-400 border-slate-600';
                    
                    return (
                      <div key={index} className={`${bgColor} p-5 rounded-xl border-2 ${borderColor} transition-all hover:scale-[1.01] hover:shadow-lg`}>
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 順番バッジ */}
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-700/50 text-slate-300 text-sm font-bold">
                              {index + 1}
                            </span>
                            {/* トピックタグ */}
                            {para.topic && (
                              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold border border-amber-500/50">
                                {para.topic}
                              </span>
                            )}
                          </div>
                          {/* 重要度バッジ */}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor} whitespace-nowrap`}>
                            重要度 {(para.importance * 100).toFixed(0)}%
                          </span>
                        </div>
                        {/* 段落テキスト（読みやすさ改善） */}
                        <p className="text-slate-200 leading-relaxed text-base">
                          {para.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 要約 */}
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">📄 要約</h3>
                <p className="text-slate-300 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  {deepParseResult.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ページコンテンツとAI機能 */}
        {currentUrl && (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-amber-400">📄 {currentUrl}</CardTitle>
              <CardDescription>AI機能を使用してページを分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* AI機能ボタン */}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleDeepParse} variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                    <Sparkles className="h-4 w-4 mr-2" />
                    DeepParse
                  </Button>
                  <Button onClick={handleSummarize} disabled={summarizeMutation.isPending} variant="outline" className="border-slate-600">
                    {summarizeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    要約
                  </Button>
                  <Button onClick={handleTransformKotodama} disabled={transformMutation.isPending} variant="outline" className="border-slate-600">
                    {transformMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    言霊変換
                  </Button>
                  <Button onClick={handleDetectThreats} disabled={detectThreatsMutation.isPending} variant="outline" className="border-slate-600">
                    {detectThreatsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    危険検知
                  </Button>
                  
                  {/* Chat連動ボタン */}
                  <Button 
                    onClick={() => {
                      const message = `以下のページを解析してください：\n\nURL: ${currentUrl}\n\n${deepParseResult ? `キーポイント:\n${deepParseResult.keyPoints.join('\n')}\n\n要約:\n${deepParseResult.summary}` : pageContent.substring(0, 500)}`;
                      setLocation(`/chat?message=${encodeURIComponent(message)}`);
                    }}
                    variant="outline" 
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chatで解析
                  </Button>
                  <Button 
                    onClick={() => {
                      const message = `以下の内容を要約してください：\n\n${pageContent.substring(0, 1000)}`;
                      setLocation(`/chat?message=${encodeURIComponent(message)}`);
                    }}
                    variant="outline" 
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Chatで要約
                  </Button>
                  <Button 
                    onClick={() => {
                      const message = `以下の内容を${targetLanguage}に翻訳してください：\n\n${pageContent.substring(0, 1000)}`;
                      setLocation(`/chat?message=${encodeURIComponent(message)}`);
                    }}
                    variant="outline" 
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <Globe2 className="h-4 w-4 mr-2" />
                    Chatで翻訳
                  </Button>
                </div>

                {/* タブでコンテンツを表示 */}
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="bg-slate-800">
                    <TabsTrigger value="content">コンテンツ</TabsTrigger>
                    <TabsTrigger value="summary">要約</TabsTrigger>
                    <TabsTrigger value="kotodama">言霊</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content" className="mt-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 max-h-96 overflow-y-auto">
                      <Streamdown>{pageContent || "コンテンツを読み込み中..."}</Streamdown>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="summary" className="mt-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      {summary ? (
                        <Streamdown>{summary}</Streamdown>
                      ) : (
                        <p className="text-slate-400">「要約」ボタンをクリックして要約を生成してください</p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="kotodama" className="mt-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      {kotodamaText ? (
                        <Streamdown>{kotodamaText}</Streamdown>
                      ) : (
                        <p className="text-slate-400">「言霊変換」ボタンをクリックして変換してください</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
