import React from "react";
import { useI18n } from "../../i18n/useI18n";

interface TopbarProps {
  isSidebarOpen?: boolean;
  title?: string;
  onOpenSidebar?: () => void;
}

export function Topbar({ title = "TENMON-ARK 1.0", onOpenSidebar, isSidebarOpen }: TopbarProps) {
  const { t } = useI18n();

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
      <div className="gpt-topbar-right">
        <button type="button" className="gpt-account-btn" aria-label="Account menu">
          <span className="gpt-account-avatar" aria-hidden="true">⦿</span>
          <span className="gpt-account-name">{(typeof window !== "undefined" && window.localStorage.getItem("tenmon_user_display_v1")) || "Account"}</span>
          <span className="gpt-account-caret" aria-hidden="true">▾</span>
        </button>
      </div>
    </header>
  );
}
