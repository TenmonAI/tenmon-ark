/**
 * 🔱 WorldLaunch Wizard
 * Founder向け・最終セットアップWizard
 * 
 * PHASE 5〜6 の機能を全部理解し、すぐに販売できる状態にするための Onboarding Wizard
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

type WizardStep = "intro" | "learn" | "widget" | "embed" | "complete";

export function WorldLaunchWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>("intro");
  const [urls, setUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isLearning, setIsLearning] = useState(false);
  const [learnedSites, setLearnedSites] = useState<Array<{ url: string; siteId: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const isFounder = user && (user.plan === "founder" || user.plan === "dev");

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

  const handleAddUrl = () => {
    if (currentUrl.trim() && !urls.includes(currentUrl.trim())) {
      setUrls([...urls, currentUrl.trim()]);
      setCurrentUrl("");
    }
  };

  const handleLearnSites = async () => {
    if (urls.length === 0) return;

    setIsLearning(true);
    try {
      const response = await fetch("/api/concierge/multi-learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls,
          maxPages: 50,
          depth: 2,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLearnedSites(data.results.filter((r: any) => r.success));
        setStep("widget");
      }
    } catch (error) {
      console.error("[WorldLaunch Wizard] Error:", error);
    } finally {
      setIsLearning(false);
    }
  };

  const handleGenerateWidget = () => {
    if (selectedSiteId) {
      setStep("embed");
    }
  };

  const getEmbedCode = () => {
    if (!selectedSiteId) return "";
    return `<script src="https://cdn.tenmon-ark.com/widget/embed.min.js"></script>
<script>
  createTenmonWidget({
    siteId: "${selectedSiteId}",
    selector: "#widget-container"
  });
</script>
<div id="widget-container"></div>`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">TENMON-ARK WorldLaunch Wizard</h1>
        <p className="text-muted-foreground">
          PHASE 5〜6 の機能を全部理解し、すぐに販売できる状態にするための Onboarding Wizard
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {(["intro", "learn", "widget", "embed", "complete"] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === s
                  ? "bg-blue-600 text-white"
                  : ["intro", "learn", "widget", "embed", "complete"].indexOf(step) > i
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {["intro", "learn", "widget", "embed", "complete"].indexOf(step) > i ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 4 && <div className="w-16 h-1 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Intro */}
      {step === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle>ステップ 1: はじめに</CardTitle>
            <CardDescription>
              WorldLaunch Wizardへようこそ。このWizardでは、以下の4ステップでArkWidgetを世界展開できる状態にします。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">1. サイトを学習</h3>
              <p className="text-sm text-muted-foreground">
                複数のサイトURLを入力して、サイト専用のSemantic Indexを生成します
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2. Widget生成</h3>
              <p className="text-sm text-muted-foreground">
                学習したサイトから、Widgetを生成します
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">3. 埋め込みコード取得</h3>
              <p className="text-sm text-muted-foreground">
                Widgetの埋め込みコードを取得します
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">4. 公開</h3>
              <p className="text-sm text-muted-foreground">
                埋め込みコードをLPに貼り付けて公開します
              </p>
            </div>
            <Button onClick={() => setStep("learn")} className="w-full">
              次へ <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Learn */}
      {step === "learn" && (
        <Card>
          <CardHeader>
            <CardTitle>ステップ 2: サイトを学習</CardTitle>
            <CardDescription>
              複数のサイトURLを入力して、サイト専用のSemantic Indexを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">サイトURL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddUrl()}
                />
                <Button onClick={handleAddUrl}>追加</Button>
              </div>
            </div>

            {urls.length > 0 && (
              <div className="space-y-2">
                <Label>学習対象URL</Label>
                <div className="space-y-2">
                  {urls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUrls(urls.filter((_, idx) => idx !== i))}
                      >
                        削除
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleLearnSites}
              disabled={urls.length === 0 || isLearning}
              className="w-full"
            >
              {isLearning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  学習中...
                </>
              ) : (
                <>
                  サイトを学習 <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Widget */}
      {step === "widget" && (
        <Card>
          <CardHeader>
            <CardTitle>ステップ 3: Widget生成</CardTitle>
            <CardDescription>
              学習したサイトから、Widgetを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {learnedSites.length > 0 ? (
              <div className="space-y-2">
                <Label>学習済みサイト</Label>
                <div className="space-y-2">
                  {learnedSites.map((site) => (
                    <div
                      key={site.siteId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSiteId === site.siteId
                          ? "border-blue-600 bg-blue-50"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedSiteId(site.siteId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{site.url}</p>
                          <p className="text-sm text-muted-foreground">Site ID: {site.siteId}</p>
                        </div>
                        {selectedSiteId === site.siteId && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                学習済みサイトがありません
              </p>
            )}

            <Button
              onClick={handleGenerateWidget}
              disabled={!selectedSiteId}
              className="w-full"
            >
              Widget生成 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Embed */}
      {step === "embed" && (
        <Card>
          <CardHeader>
            <CardTitle>ステップ 4: 埋め込みコード取得</CardTitle>
            <CardDescription>
              Widgetの埋め込みコードを取得します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>埋め込みコード</Label>
              <div className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{getEmbedCode()}</pre>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(getEmbedCode());
                }}
                className="w-full"
              >
                コードをコピー
              </Button>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">完了！</h3>
              <p className="text-sm text-green-700">
                埋め込みコードをLPに貼り付けて公開してください。
              </p>
            </div>

            <Button
              onClick={() => {
                setStep("complete");
              }}
              className="w-full"
            >
              完了 <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>完了！</CardTitle>
            <CardDescription>
              WorldLaunch Wizardが完了しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">おめでとうございます！</h2>
              <p className="text-muted-foreground mb-4">
                ArkWidgetの世界展開準備が完了しました
              </p>
              <div className="space-y-2">
                <Badge variant="outline">✓ サイト学習完了</Badge>
                <Badge variant="outline">✓ Widget生成完了</Badge>
                <Badge variant="outline">✓ 埋め込みコード取得完了</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

