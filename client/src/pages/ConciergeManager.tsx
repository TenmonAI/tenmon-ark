/**
 * 🔱 LP Concierge Manager
 * サイトURLを入力すると、そのサイト専用のコンシェルジュを自動生成
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ConciergeManager() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [siteId, setSiteId] = useState("");
  const [isLearning, setIsLearning] = useState(false);
  const [learnResult, setLearnResult] = useState<{
    success: boolean;
    pages?: number;
    siteId?: string;
    error?: string;
  } | null>(null);

  const isFounder = user && (user.plan === "founder" || user.plan === "dev");

  // URLからsiteIdを自動生成
  const generateSiteId = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace(/\./g, "-").replace(/[^a-z0-9-]/gi, "");
    } catch {
      return urlString.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      setSiteId(generateSiteId(value));
    }
  };

  const handleLearn = async () => {
    if (!url || !siteId) {
      return;
    }

    setIsLearning(true);
    setLearnResult(null);

    try {
      const response = await fetch("/api/concierge/auto-learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          siteId,
          maxPages: 50,
          depth: 2,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLearnResult({
          success: true,
          pages: data.pages,
          siteId: data.siteId,
        });
      } else {
        setLearnResult({
          success: false,
          error: data.error || "学習に失敗しました",
        });
      }
    } catch (error) {
      setLearnResult({
        success: false,
        error: error instanceof Error ? error.message : "エラーが発生しました",
      });
    } finally {
      setIsLearning(false);
    }
  };

  if (!isFounder) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">この機能はFounder/Devプランのみ利用可能です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">LP Concierge Manager</h1>
        <p className="text-muted-foreground">
          サイトURLを入力すると、そのサイト専用のコンシェルジュを自動生成します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>サイト自動学習</CardTitle>
          <CardDescription>
            サイトをクロールして、サイト専用のSemantic Indexを生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">サイトURL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLearning}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteId">サイトID</Label>
            <Input
              id="siteId"
              type="text"
              placeholder="example-com"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={isLearning}
            />
            <p className="text-xs text-muted-foreground">
              サイトIDは自動生成されますが、手動で変更することもできます
            </p>
          </div>

          <Button
            onClick={handleLearn}
            disabled={!url || !siteId || isLearning}
            className="w-full"
          >
            {isLearning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                学習中...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                サイトを学習
              </>
            )}
          </Button>

          {learnResult && (
            <div
              className={`p-4 rounded-lg ${
                learnResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {learnResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="font-semibold">
                  {learnResult.success ? "学習完了" : "学習失敗"}
                </h3>
              </div>
              {learnResult.success ? (
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>サイトID:</strong> {learnResult.siteId}
                  </p>
                  <p>
                    <strong>学習ページ数:</strong> {learnResult.pages} ページ
                  </p>
                  <p className="text-muted-foreground mt-2">
                    このサイト専用のコンシェルジュが利用可能になりました
                  </p>
                </div>
              ) : (
                <p className="text-sm text-red-600">{learnResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>埋め込み方法</CardTitle>
          <CardDescription>
            学習したサイトのWidgetを埋め込む方法
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>1. スクリプトを追加</Label>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm">
              {`<script src="https://tenmon-ai.com/widget/embed.js"></script>`}
            </div>
          </div>

          <div className="space-y-2">
            <Label>2. Widgetを初期化</Label>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm">
              {`<script>
  createTenmonWidget({
    siteId: "${siteId || "example-com"}",
    selector: "#widget-container"
  });
</script>`}
            </div>
          </div>

          <div className="space-y-2">
            <Label>3. コンテナを追加</Label>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm">
              {`<div id="widget-container"></div>`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

