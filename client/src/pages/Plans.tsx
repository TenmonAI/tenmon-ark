import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Check, Sparkles, Zap, Crown, Star } from "lucide-react";
import { FounderBadge } from "@/components/FounderBadge";
import { toast } from "sonner";

/**
 * プラン選択UI完全刷新（vΩ-GPT-PRO）
 * 
 * GPT Upgrade UI完全模倣
 * 4プラン対応：Free、Basic、Pro、Founder's Edition
 * Founder's Edition専用リボンバッジ実装
 */

function CheckoutButton({
  planName,
  variant,
}: {
  planName: "basic" | "pro" | "founder";
  variant: "default" | "outline";
}) {
  const { t } = useTranslation();
  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.success(t("subscription.manage"));
      window.open(data.checkoutUrl, "_blank");
    },
    onError: (error) => {
      toast.error(`${t("errors.generic")}: ${error.message}`);
    },
  });

  return (
    <Button
      className="w-full"
      variant={variant}
      onClick={() => createCheckout.mutate({ planName })}
      disabled={createCheckout.isPending}
    >
      {createCheckout.isPending ? t("common.loading") : t("subscription.upgrade")}
    </Button>
  );
}

/**
 * Founder's Edition専用リボンバッジ（FounderBadgeコンポーネントを使用）
 */
function FounderRibbon() {
  return (
    <div className="absolute -top-3 -right-3">
      <FounderBadge variant="compact" />
    </div>
  );
}

/**
 * プラン定義（GPT Upgrade UI完全模倣）
 */
const PLAN_DEFINITIONS = [
  {
    id: "free",
    name: "free",
    displayName: "Free",
    price: 0,
    icon: Sparkles,
    colorClass: "border-muted",
    buttonText: "無料で使いはじめる",
    description: "基本的なチャット機能が利用できます。月30メッセージまで。言靈モードとTwin-Core Lightが使用可能。",
    features: [
      "基本的なチャット機能",
      "月30メッセージまで",
      "言靈モード",
      "Twin-Core Light",
    ],
  },
  {
    id: "basic",
    name: "basic",
    displayName: "Basic",
    price: 6000,
    icon: Zap,
    colorClass: "border-accent",
    buttonText: "アップグレード",
    description: "個人運用向けの標準プラン。チャット無制限。Twin-Core Advanced。言靈解析・宿曜解析がフル解放。外部アプリ連携（WordPress/Slack/Notion）。",
    features: [
      "チャット無制限",
      "Twin-Core Advanced",
      "言靈解析フル解放",
      "宿曜解析フル解放",
      "外部アプリ連携（WordPress/Slack/Notion）",
    ],
  },
  {
    id: "pro",
    name: "pro",
    displayName: "Pro",
    price: 29800,
    icon: Crown,
    colorClass: "border-primary",
    buttonText: "強化する",
    description: "AI国家OSとして運用するための全機能が解放。動画生成・音楽生成・自動投稿・SNS運用。Tradingモジュール（MT5/市場分析）。ULCE・FractalOS・SoulSync完全解放。",
    features: [
      "全機能解放",
      "動画生成・音楽生成",
      "自動投稿・SNS運用",
      "Tradingモジュール（MT5/市場分析）",
      "ULCE・FractalOS・SoulSync完全解放",
    ],
    popular: true,
  },
  {
    id: "founder",
    name: "founder",
    displayName: "Founder's Edition",
    price: 198000,
    priceMonthly: 19800,
    icon: Star,
    colorClass: "border-[#D4AF37]",
    buttonText: "永久ライセンスを受け取る",
    description: "TENMON-ARK を共に創造する創設メンバー。Proプラン（月額29,800円）を永久無料で利用可能。AI国家OSの全アップデートを生涯受け取れる唯一の権利。",
    features: [
      "Proプラン永久無料",
      "AI国家OS全アップデート生涯受け取り",
      "Founder専用コミュニティ",
      "開発ロードマップへの意見反映権",
      "限定バッジ",
      "優先サポート",
    ],
    isFounder: true,
    limited: "限定300名",
  },
];

export default function Plans() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { data: subscription } = trpc.subscription.getMy.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="py-16">
        <div className="container">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16 space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t("plans.title")}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t("plans.subtitle")}
              </p>
            </div>

            {/* Plans Grid - GPT Upgrade UI完全模倣 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {PLAN_DEFINITIONS.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = subscription?.planName === plan.name;

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${plan.colorClass} ${
                      plan.popular ? "border-2 shadow-lg shadow-primary/20" : ""
                    } ${plan.isFounder ? "border-2 shadow-lg shadow-[#D4AF37]/30" : ""}`}
                  >
                    {/* Founder's Edition専用リボンバッジ */}
                    {plan.isFounder && <FounderRibbon />}

                    {/* 人気No.1バッジ */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                        人気No.1
                      </div>
                    )}

                    {/* 限定バッジ */}
                    {plan.limited && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold rounded-full" style={{ backgroundColor: "#D4AF37", color: "#000" }}>
                        {plan.limited}
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-6 h-6" />
                        <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                      </div>
                      <CardDescription className="text-2xl font-bold text-foreground">
                        {plan.price === 0 ? (
                          "無料"
                        ) : plan.isFounder ? (
                          <>
                            ¥{plan.price.toLocaleString()}
                            <span className="text-base font-normal text-muted-foreground"> (一括)</span>
                            <br />
                            <span className="text-lg">または ¥{plan.priceMonthly?.toLocaleString()}/月 (12ヶ月)</span>
                          </>
                        ) : (
                          <>
                            ¥{plan.price.toLocaleString()}
                            <span className="text-base font-normal text-muted-foreground">/月</span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 説明文 */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {plan.description}
                      </p>

                      {/* 機能リスト */}
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* ボタン */}
                      {isAuthenticated ? (
                        isCurrentPlan ? (
                          <Button className="w-full" disabled>
                            現在のプラン
                          </Button>
                        ) : plan.name === "free" ? (
                          <Button className="w-full" variant="outline" disabled>
                            無料プラン
                          </Button>
                        ) : (
                          <CheckoutButton
                            planName={plan.name as "basic" | "pro" | "founder"}
                            variant={plan.popular || plan.isFounder ? "default" : "outline"}
                          />
                        )
                      ) : (
                        <Button className="w-full" variant="outline" asChild>
                          <a href={getLoginUrl()}>{plan.buttonText}</a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQ Section */}
            <div className="mt-16 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">よくある質問</h2>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">プランはいつでも変更できますか？</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      はい、いつでもアップグレードまたはダウングレードが可能です。アップグレードは即座に反映され、ダウングレードは次の請求サイクルから適用されます。
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">支払い方法は何がありますか？</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      クレジットカード（Visa、Mastercard、American Express、JCB）に対応しています。Stripeを通じた安全な決済システムを使用しています。
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Freeプランでどこまで使えますか？</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Freeプランでは、基本的なチャット機能が利用できます。月30メッセージまで。言靈モードとTwin-Core Lightが使用可能です。
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Founder's Editionとは何ですか？</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Founder's Editionは、TENMON-ARKを共に創造する創設メンバーのための特別プランです。Proプラン（月額29,800円）を永久無料で利用可能で、AI国家OSの全アップデートを生涯受け取れる唯一の権利です。限定300名のみの募集となります。
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
