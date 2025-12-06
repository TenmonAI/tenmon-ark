import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Calendar, CreditCard, Loader2, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Subscription() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: subscription, isLoading: subLoading } = trpc.subscription.getMy.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: plans } = trpc.plans.list.useQuery();

  const createPortal = trpc.subscription.createPortal.useMutation({
    onSuccess: (data) => {
      toast.success("カスタマーポータルへリダイレクトします...");
      window.open(data.portalUrl, "_blank");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const cancelSubscription = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      toast.success("サブスクリプションをキャンセルしました");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">ログインが必要です</h2>
            <Button asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = plans?.find((p) => p.name === (subscription?.planName || "free"));

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">サブスクリプション管理</h1>
            <p className="text-muted-foreground">
              現在のプランと請求情報を管理できます
            </p>
          </div>

          {/* Current Plan */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                現在のプラン
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{currentPlan?.displayName || "Free"}</h3>
                  <p className="text-muted-foreground">
                    {currentPlan?.price === 0
                      ? "無料プラン"
                      : `¥${currentPlan?.price.toLocaleString()}/月`}
                  </p>
                </div>
                {subscription?.status && (
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === "active"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {subscription.status === "active" ? "有効" : subscription.status}
                  </div>
                )}
              </div>

              {subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  次回更新日:{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("ja-JP")}
                </div>
              )}

              <div className="flex gap-3">
                <Link href="/plans">
                  <Button variant="outline">プランを変更</Button>
                </Link>
                {subscription?.stripeCustomerId && (
                  <Button
                    variant="outline"
                    onClick={() => createPortal.mutate()}
                    disabled={createPortal.isPending}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {createPortal.isPending ? "処理中..." : "請求情報を管理"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          {currentPlan && (
            <Card>
              <CardHeader>
                <CardTitle>プランに含まれる機能</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {JSON.parse(currentPlan.features).map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          {subscription?.stripeCustomerId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  お支払い方法
                </CardTitle>
                <CardDescription>
                  お支払い方法の変更や請求履歴の確認は、カスタマーポータルで行えます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => createPortal.mutate()}
                  disabled={createPortal.isPending}
                >
                  {createPortal.isPending ? "処理中..." : "カスタマーポータルを開く"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
