import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { stopPeriodicSync } from "../../lib/crossDeviceSync";

type TopbarProps = {
  title?: string;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
  showBackToChat?: boolean;
  onBackToChat?: () => void;
};

export function Topbar({
  title = "天聞アーク",
  onOpenSidebar,
  isSidebarOpen,
  showBackToChat,
  onBackToChat,
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
      // Stop periodic sync before clearing state
      stopPeriodicSync();
    } catch {}

    try {
      localStorage.removeItem("TENMON_AUTH_OK_V1");
      localStorage.removeItem("TENMON_AUTOLOGIN_DONE");
      localStorage.removeItem("TENMON_FOUNDER_KEY");
      localStorage.removeItem("TENMON_USER_KEY");
      localStorage.removeItem("tenmon_user_display_v1");
      // Clear sync state so re-login triggers fresh bootstrap
      localStorage.removeItem("TENMON_SYNC_PENDING_CHANGES");
      localStorage.removeItem("TENMON_SYNC_LAST_PULL_AT");
    } catch {}

    window.location.href = "/pwa/login-local";
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

        {showBackToChat && onBackToChat ? (
          <button
            type="button"
            onClick={onBackToChat}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--muted, rgba(17,24,39,0.65))",
              cursor: "pointer",
              fontSize: 13,
              padding: "4px 8px",
              borderRadius: 6,
              transition: "background 0.15s, color 0.15s",
              marginRight: 8,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--hover, rgba(0,0,0,0.04))";
              (e.currentTarget as HTMLElement).style.color = "var(--text, #111827)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.color = "var(--muted, rgba(17,24,39,0.65))";
            }}
            title="最後のチャットに戻る"
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>チャットに戻る</span>
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
