import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User as UserIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * Profile Page - GPT風プロフィール管理画面
 * - 名前、メール、アバター表示
 * - 保存機能（将来実装）
 */
export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">{t("profile.title") || "プロフィール"}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserIcon className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("profile.avatar_hint") || "アバター画像は今後追加予定です"}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name") || "名前"}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.name_placeholder") || "名前を入力"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("profile.email") || "メールアドレス"}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("profile.email_placeholder") || "メールアドレスを入力"}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {t("profile.email_hint") || "メールアドレスは変更できません"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("profile.plan") || "現在のプラン"}</Label>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-md bg-primary/10 text-primary font-semibold">
                  {user?.plan?.toUpperCase() || "FREE"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/subscription')}
                >
                  {t("profile.change_plan") || "プラン変更"}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => {
                  // TODO: 保存機能を実装
                  alert("保存機能は今後実装予定です");
                }}
              >
                {t("profile.save") || "保存"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
