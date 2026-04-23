import React from "react";
import { useEffect, useState } from "react";
import KoshikiConsolePage from "./pages/KoshikiConsole";
import LoginLocal from "./pages/LoginLocal";
import RegisterLocal from "./pages/RegisterLocal";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";
import { initSync, stopPeriodicSync } from "./lib/crossDeviceSync";

/* MC (Mission Control) — lazy loaded */
const McOverview = React.lazy(() => import("./pages/mc/McOverview"));
const McHandoff = React.lazy(() => import("./pages/mc/McHandoff"));
const McLive = React.lazy(() => import("./pages/mc/McLive"));
const McGit = React.lazy(() => import("./pages/mc/McGit"));
const McSoul = React.lazy(() => import("./pages/mc/McSoul"));
const McVnextApp = React.lazy(() => import("./pages/mission-control-vnext/McVnextApp"));

const TENMON_AUTH_OK_V1 = "TENMON_AUTH_OK_V1";
const TENMON_USER_KEY = "TENMON_USER_KEY";

type MeResult = { ok: boolean; user?: { id?: string; email?: string } | null };

async function tenmonCheckMe(): Promise<MeResult> {
  try {
    const r = await fetch("/api/me", { credentials: "include" });
    if (!r.ok) return { ok: false };
    const j = await r.json();
    const ok = !!(j && (j.ok === true || j.authenticated === true || j.user));
    return { ok, user: j?.user ?? null };
  } catch {
    return { ok: false };
  }
}

function userKeyFromUser(user: { id?: string; email?: string } | null | undefined): string {
  if (!user) return "";
  const id = user.id ?? "";
  const email = user.email ?? "";
  return (id && String(id).trim()) || (email && String(email).trim()) || "";
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authOk, setAuthOk] = useState(false);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/pwa/";

  const isLoginPage = pathname === "/pwa/login-local.html" || pathname === "/pwa/login-local";
  const isRegisterPage = pathname === "/pwa/register-local.html" || pathname === "/pwa/register-local";
  const isForgotPasswordPage = pathname === "/pwa/forgot-password" || pathname === "/pwa/forgot-password/";
  const isResetPasswordPage = pathname === "/pwa/reset-password" || pathname === "/pwa/reset-password/";
  const isPublicAuthPage = isLoginPage || isRegisterPage || isForgotPasswordPage || isResetPasswordPage;
  const isKoshiki = pathname.startsWith("/pwa/koshiki");
  const isSukuyou = pathname === "/pwa/sukuyou" || pathname === "/pwa/sukuyou/";
  const isSukuyouAbout = pathname === "/pwa/sukuyou-about" || pathname === "/pwa/sukuyou-about/";
  const isKotodamaAbout = pathname === "/pwa/kotodama-about" || pathname === "/pwa/kotodama-about/";
  const isAmatsuKanagiAbout = pathname === "/pwa/amatsu-kanagi-about" || pathname === "/pwa/amatsu-kanagi-about/";
  const isMcVnext = pathname.startsWith("/mc/vnext");
  const isMcClassic = pathname === "/mc/classic" || pathname.startsWith("/mc/classic/");
  const isMc = pathname.startsWith("/mc/") || isMcClassic;
  const mcSub = isMc
    ? pathname
        .replace(/^\/mc\/vnext\/?/, "")
        .replace(/^\/mc\/classic\/?/, "")
        .replace(/\/$/, "")
    : "";

  useEffect(() => {
    let dead = false;

    (async () => {
      const result = await tenmonCheckMe();
      if (dead) return;
      setAuthOk(result.ok);
      setAuthReady(true);

      try {
        localStorage.setItem(TENMON_AUTH_OK_V1, result.ok ? "1" : "0");
        const ukey = userKeyFromUser(result.user);
        if (ukey) localStorage.setItem(TENMON_USER_KEY, ukey);
        if (ukey) localStorage.setItem("TENMON_PWA_USER_ID", ukey);
        const email = result.user?.email;
        if (email) localStorage.setItem("tenmon_user_display_v1", String(email));
      } catch {}

      // CROSS_DEVICE_SYNC: start sync after successful auth
      if (result.ok) {
        initSync().catch(() => {});
      } else {
        stopPeriodicSync();
      }

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const onLoginPage = currentPath === "/pwa/login-local.html" || currentPath === "/pwa/login-local";
      const onRegisterPage = currentPath === "/pwa/register-local.html" || currentPath === "/pwa/register-local";
      const onForgotPage = currentPath === "/pwa/forgot-password" || currentPath === "/pwa/forgot-password/";
      const onResetPage = currentPath === "/pwa/reset-password" || currentPath === "/pwa/reset-password/";
      const allowWithoutAuth = onLoginPage || onRegisterPage || onForgotPage || onResetPage;
      if (
        !result.ok &&
        !allowWithoutAuth &&
        (currentPath.startsWith("/pwa") || currentPath.startsWith("/mc/vnext") || currentPath.startsWith("/mc/classic"))
      ) {
        const next = encodeURIComponent(currentPath || "/mc/");
        window.location.href = `/pwa/login-local.html?next=${next}`;
      }
    })();

    return () => {
      dead = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!authReady) return;
    if (isPublicAuthPage) return;

    try {
      if (localStorage.getItem("TENMON_AUTOLOGIN_DONE") === "1") return;
    } catch {}

    (async () => {
      try {
        const u = new URL(window.location.href);
        const kParam = (u.searchParams.get("k") || "").trim();
        const kStore = (localStorage.getItem("TENMON_FOUNDER_KEY") || "").trim();
        const key = kParam || kStore;
        if (!key) return;

        if (kParam && kParam !== kStore) {
          try {
            localStorage.setItem("TENMON_FOUNDER_KEY", kParam);
          } catch {}
        }

        await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ founderKey: key }),
        });

        try {
          localStorage.setItem("TENMON_AUTOLOGIN_DONE", "1");
        } catch {}

        try {
          if (kParam) {
            u.searchParams.delete("k");
            history.replaceState(null, "", u.toString());
          }
        } catch {}
      } catch {}
    })();
  }, [authReady, isPublicAuthPage]);

  if (isForgotPasswordPage) {
    return (
      <I18nProvider>
        <ForgotPasswordPage />
      </I18nProvider>
    );
  }
  if (isResetPasswordPage) {
    return (
      <I18nProvider>
        <ResetPasswordPage />
      </I18nProvider>
    );
  }
  if (isRegisterPage) {
    return (
      <I18nProvider>
        <RegisterLocal />
      </I18nProvider>
    );
  }
  if (isLoginPage) {
    return (
      <I18nProvider>
        <LoginLocal />
      </I18nProvider>
    );
  }
  if (isKoshiki) {
    return (
      <I18nProvider>
        <KoshikiConsolePage />
      </I18nProvider>
    );
  }
  if (isMcVnext) {
    return (
      <React.Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif", color: "#c9a14a" }}>Loading MC vNext...</div>}>
        <McVnextApp />
      </React.Suspense>
    );
  }
  if (isMc) {
    const McPage = mcSub === "handoff" ? McHandoff
      : mcSub === "live" ? McLive
      : mcSub === "git" ? McGit
      : mcSub === "soul" ? McSoul
      : McOverview;
    return (
      <React.Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif", color: "#c9a14a" }}>Loading Mission Control...</div>}>
        <McPage />
      </React.Suspense>
    );
  }

  if (!authReady) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>認証確認中...</div>;
  }

  return (
    <I18nProvider>
      <GptShell initialView={isAmatsuKanagiAbout ? "amatsu-kanagi-about" : isKotodamaAbout ? "kotodama-about" : isSukuyouAbout ? "sukuyou-about" : isSukuyou ? "sukuyou" : "chat"} />
    </I18nProvider>
  );
}
