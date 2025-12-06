/**
 * Ark Browser UI
 * AI統合ブラウザ画面
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Shield, Sparkles, AlertTriangle } from "lucide-react";
import { Streamdown } from "streamdown";

export default function ArkBrowser() {
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [summary, setSummary] = useState("");
  const [kotodamaText, setKotodamaText] = useState("");
  const [threats, setThreats] = useState<any>(null);

  const fetchPageMutation = trpc.arkBrowser.fetchPage.useMutation();
  const summarizeMutation = trpc.arkBrowser.summarizePage.useMutation();
  const transformMutation = trpc.arkBrowser.convertPageToSpiritual.useMutation();
  const detectThreatsMutation = trpc.arkBrowser.detectDangerousSite.useMutation();

  const handleOpenPage = async () => {
    if (!url) return;
    
    try {
      const result = await fetchPageMutation.mutateAsync({ url });
      setCurrentUrl(url);
      setPageContent(result.content);
      setSummary("");
      setKotodamaText("");
      setThreats(null);
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
    if (!pageContent) return;
    
    try {
      const result = await transformMutation.mutateAsync({ content: pageContent });
      setKotodamaText(result.converted);
    } catch (error) {
      console.error("Failed to transform:", error);
    }
  };

  const handleDetectThreats = async () => {
    if (!currentUrl || !pageContent) return;
    
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
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
        <div className="container mx-auto p-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="🌐 世界を検索... (URL or キーワード)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOpenPage()}
              className="flex-1 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 text-lg h-12"
            />
            <Button 
              onClick={handleOpenPage} 
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
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">

      {/* 危険検知アラート */}
      {threats && threats.dangerLevel !== "safe" && (
        <Alert variant="destructive" className="border-2">
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

      {/* ページコンテンツとAI機能 */}
      {currentUrl && (
        <Card>
          <CardHeader>
            <CardTitle>📄 {currentUrl}</CardTitle>
            <CardDescription>AI機能を使用してページを分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI機能ボタン */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSummarize} disabled={summarizeMutation.isPending} variant="outline">
                  {summarizeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="ml-2">要約</span>
                </Button>
                <Button onClick={handleTransformKotodama} disabled={transformMutation.isPending} variant="outline">
                  {transformMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="ml-2">言灵変換</span>
                </Button>
                <Button onClick={handleDetectThreats} disabled={detectThreatsMutation.isPending} variant="outline">
                  {detectThreatsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  <span className="ml-2">危険検知</span>
                </Button>
              </div>

              {/* タブ表示 */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">コンテンツ</TabsTrigger>
                  <TabsTrigger value="summary">要約</TabsTrigger>
                  <TabsTrigger value="kotodama">言灵変換</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="space-y-4">
                  <div className="max-h-[600px] overflow-y-auto border rounded-lg p-4 bg-muted/50">
                    <Streamdown>{pageContent || "ページを読み込んでいます..."}</Streamdown>
                  </div>
                </TabsContent>
                <TabsContent value="summary" className="space-y-4">
                  {summary ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <Streamdown>{summary}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">「要約」ボタンをクリックしてページを要約します</p>
                  )}
                </TabsContent>
                <TabsContent value="kotodama" className="space-y-4">
                  {kotodamaText ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <Streamdown>{kotodamaText}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">「言灵変換」ボタンをクリックしてページを靈性日本語に変換します</p>
                  )}
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
