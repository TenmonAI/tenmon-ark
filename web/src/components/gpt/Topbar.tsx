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
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
