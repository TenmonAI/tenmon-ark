import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/about">
            <Button variant="ghost">{t("nav.about")}</Button>
          </Link>
          <Link href="/ark-core">
            <Button variant="ghost">{t("nav.arkCore")}</Button>
          </Link>
          <Link href="/ark">
            <Button variant="ghost">{t("nav.arkProjects")}</Button>
          </Link>
          <Link href="/plans">
            <Button variant="ghost">{t("nav.plans")}</Button>
          </Link>
          <Link href="/amatsu-kanagi/analysis">
            <Button variant="ghost">⬡ 天津金木</Button>
          </Link>
          <Link href="/iroha/analysis">
            <Button variant="ghost">🌸 いろは</Button>
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/chat">
                <Button variant="ghost">{t("nav.chat")}</Button>
              </Link>
              <Link href="/fractal/dashboard">
                <Button variant="ghost">🌕 Fractal OS</Button>
              </Link>
              <Link href="/ethics/dashboard">
                <Button variant="ghost">🛡️ Ethics</Button>
              </Link>
              <Link href="/soul-sync/settings">
                <Button variant="ghost">💫 Soul Sync</Button>
              </Link>
              <Link href="/notifications">
                <Button variant="ghost">🔔 Notifications</Button>
              </Link>
            </>
          )}
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Button variant="outline" onClick={handleLogout}>
              {t("nav.logout")}
            </Button>
          ) : (
            <Button asChild>
              <a href={getLoginUrl()}>{t("auth.login")}</a>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
