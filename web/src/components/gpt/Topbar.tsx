import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n";

type TopbarProps = {
  title?: string;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
};

export function Topbar({
  title = "TENMON-ARK 1.0",
  onOpenSidebar,
  isSidebarOpen,
}: TopbarProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/local/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        console.warn("logout request failed", res.status);
      }
    } catch (e) {
      console.warn("logout request error", e);
    }

    try {
      localStorage.removeItem("TENMON_AUTH_OK_V1");
      localStorage.removeItem("TENMON_AUTOLOGIN_DONE");
      localStorage.removeItem("TENMON_FOUNDER_KEY");
      localStorage.removeItem("TENMON_USER_KEY");
      localStorage.removeItem("tenmon_user_display_v1");
    } catch {}

    window.location.href = "/pwa/login-local.html?next=/pwa/";
  }

  const accountName =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("tenmon_user_display_v1")) ||
    "Account";

  return (
    <header className="gpt-topbar">
      <div className="gpt-topbar-left">
        {onOpenSidebar ? (
          <button
            type="button"
            className="gpt-topbar-hamburger"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <span aria-hidden="true">{isSidebarOpen ? "×" : "☰"}</span>
          </button>
        ) : null}

        <img
          src="brand/tenmon-ark-mark.svg"
          alt="TENMON-ARK"
          className="gpt-brand-mark"
        />
        <span className="gpt-topbar-title">{title}</span>
      </div>

      <div
        className="gpt-topbar-right"
        ref={wrapRef}
        style={{ position: "relative" }}
      >
        <button
          type="button"
          className="gpt-account-btn"
          aria-label="Account menu"
          title={accountName}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="gpt-account-avatar" aria-hidden="true">
            ⦿
          </span>
          <span className="gpt-account-name">{accountName}</span>
          <span className="gpt-account-caret" aria-hidden="true">
            ▾
          </span>
        </button>

        {menuOpen ? (
          <div className="gpt-account-menu">
            <button
              type="button"
              onClick={handleLogout}
              className="gpt-account-menu-item"
            >
              ログアウト
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
