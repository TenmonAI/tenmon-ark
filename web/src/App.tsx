import React from "react";
import { useEffect, useState } from "react";
import KoshikiConsolePage from "./pages/KoshikiConsole";
import LoginLocal from "./pages/LoginLocal";
import RegisterLocal from "./pages/RegisterLocal";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";

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
  const isPublicAuthPage = isLoginPage || isRegisterPage;
  const isKoshiki = pathname.startsWith("/pwa/koshiki");
  const isSukuyou = pathname === "/pwa/sukuyou" || pathname === "/pwa/sukuyou/";

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
        const email = result.user?.email;
        if (email) localStorage.setItem("tenmon_user_display_v1", String(email));
      } catch {}

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const onLoginPage = currentPath === "/pwa/login-local.html" || currentPath === "/pwa/login-local";
      const onRegisterPage = currentPath === "/pwa/register-local.html" || currentPath === "/pwa/register-local";
      const allowWithoutAuth = onLoginPage || onRegisterPage;
      if (!result.ok && !allowWithoutAuth && currentPath.startsWith("/pwa")) {
        window.location.href = "/pwa/login-local.html?next=/pwa/";
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

  if (!authReady) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>認証確認中...</div>;
  }

  return (
    <I18nProvider>
      <GptShell initialView={isSukuyou ? "sukuyou" : "chat"} />
    </I18nProvider>
  );
}
