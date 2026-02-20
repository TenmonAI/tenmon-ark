import React from "react";
import KoshikiConsolePage from "./pages/KoshikiConsole";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";

import { useEffect } from "react";

export default function App() {
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
      <GptShell />
    </I18nProvider>
  );
}
