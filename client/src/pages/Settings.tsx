import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, User, CreditCard, Globe, Shield, Info, LogOut, Keyboard } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * ChatGPT Mobile UI - 設定画面
 * - GPTの階層式設定画面を完全模倣
 * - アカウント、プラン管理、支払い情報、言語設定、デバイス設定、プライバシー/セキュリティ、About TENMON-ARK
 */

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();

  const { data: subscription } = trpc.subscription.getMy.useQuery(undefined, {
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const settingsItems = [
    {
      icon: <User className="w-5 h-5" />,
      title: t("settings.account") || "アカウント",
      description: user?.email || "",
      onClick: () => {
        // TODO: アカウント詳細画面へ遷移
      },
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: t("settings.plan") || "プラン管理",
      description: subscription?.planName || "Free",
      onClick: () => {
        setLocation("/plans");
      },
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: t("settings.billing") || "支払い情報",
      description: "Stripe",
      onClick: () => {
        // TODO: 支払い情報画面へ遷移
      },
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: t("settings.language") || "言語設定",
      description: i18n.language === "ja" ? "日本語" : "English",
      onClick: () => {
        // TODO: 言語設定画面へ遷移
      },
    },
    {
      icon: <Keyboard className="w-5 h-5" />,
      title: "入力方式",
      description: "Enter=改行 / Ctrl+Enter=送信",
      onClick: () => {
        // TODO: 入力方式詳細画面へ遷移
      },
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t("settings.privacy") || "プライバシー / セキュリティ",
      description: "",
      onClick: () => {
        // TODO: プライバシー設定画面へ遷移
      },
    },
    {
      icon: <Info className="w-5 h-5" />,
      title: "About TENMON-ARK",
      description: "v2.0",
      onClick: () => {
        setLocation("/about");
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">{t("settings.title") || "設定"}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">

        {/* ユーザー情報カード */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* 設定項目リスト */}
        <div className="space-y-2">
          {settingsItems.map((item, index) => (
            <Card
              key={index}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={item.onClick}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-foreground">{item.icon}</div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        {/* ログアウトボタン */}
        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("settings.logout") || "ログアウト"}
          </Button>
        </div>
      </div>
    </div>
  );
}
