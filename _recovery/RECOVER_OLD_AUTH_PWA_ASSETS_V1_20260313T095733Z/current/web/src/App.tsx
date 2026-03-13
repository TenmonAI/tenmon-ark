import React from "react";

const TENMON_AUTH_OK_V1 = "TENMON_AUTH_OK_V1";

async function tenmonCheckMe(): Promise<boolean> {
  try {
    const r = await fetch("/api/me", { credentials: "include" });
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j && (j.ok === true || j.authenticated === true || j.user));
  } catch {
    return false;
  }
}

import KoshikiConsolePage from "./pages/KoshikiConsole";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";

import { useEffect } from "react";

export default function App() {

  const [authReady, setAuthReady] = useState(false);
  const [authOk, setAuthOk] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const ok = await tenmonCheckMe();
      if (dead) return;
      setAuthOk(ok);
      setAuthReady(true);
      try { localStorage.setItem(TENMON_AUTH_OK_V1, ok ? "1" : "0"); } catch {}
      if (!ok && typeof window !== "undefined" && window.location.pathname.startsWith("/pwa")) {
        window.location.href = "/pwa/login-local.html?next=/pwa/";
      }
    })();
    return () => { dead = true; };
  }, []);

  if (!authReady) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>認証確認中...</div>;
  }


  // APP_AUTOLOGIN_V1: auto-login once using ?k= or localStorage TENMON_FOUNDER_KEY
  useEffect(() => {
    try {
      if (localStorage.getItem('TENMON_AUTOLOGIN_DONE') === '1') return;
    } catch {}

    (async () => {
      try {
        const u = new URL(window.location.href);
        const kParam = (u.searchParams.get("k") || "").trim();
        const kStore = (localStorage.getItem("TENMON_FOUNDER_KEY") || "").trim();
        const key = kParam || kStore;
        if (!key) return;

        if (kParam && kParam !== kStore) {
          try { localStorage.setItem("TENMON_FOUNDER_KEY", kParam); } catch {}
        }

        await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ founderKey: key }),
        });
        try { localStorage.setItem('TENMON_AUTOLOGIN_DONE','1'); } catch {}

        // drop k= to avoid replay
        try {
          if (kParam) {
            u.searchParams.delete("k");
            history.replaceState(null, "", u.toString());
          }
        } catch {}
      } catch {}
    })();
  }, []);

  return (
    <I18nProvider>
      
{/* KOSHIKI_ROUTE_WIRING_V1: /pwa/koshiki renders KoshikiConsolePage */}
      {
        (typeof window !== "undefined" && window.location.pathname.startsWith("/pwa/koshiki"))
          ? <KoshikiConsolePage />
          : <GptShell />
      }
    
    </I18nProvider>
  );
}
