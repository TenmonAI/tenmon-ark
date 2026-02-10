import React from "react";
import { useI18n } from "../../i18n/useI18n";

export type GptView = "chat" | "dashboard" | "profile";

interface SidebarProps {
  view: GptView;
  onView: (v: GptView) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ view, onView, onNewChat, onOpenSettings }: SidebarProps) {
  const { t } = useI18n();
  const linkClass = (v: GptView) =>
    `gpt-sidebar-item ${view === v ? "gpt-sidebar-item-active" : ""}`;

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <button type="button" className="gpt-btn gpt-btn-primary gpt-sidebar-new-chat" onClick={onNewChat}>
          + {t("sidebar.newChat")}
        </button>
        <button type="button" className="gpt-sidebar-search" aria-label="Search">
          <span>🔍</span>
          <span>{t("sidebar.search")}</span>
        </button>
      </div>

      <nav className="gpt-scroll gpt-sidebar-history">
        <div className="gpt-sidebar-section-label">{t("sidebar.today")}</div>
        <button type="button" className={linkClass("chat")} onClick={() => onView("chat")}>
          {t("sidebar.chat")}
        </button>
        <div className="gpt-sidebar-section-label">{t("sidebar.explore")}</div>
        <button type="button" className={linkClass("dashboard")} onClick={() => onView("dashboard")}>
          {t("sidebar.dashboard")}
        </button>
        <button type="button" className={linkClass("profile")} onClick={() => onView("profile")}>
          {t("sidebar.profile")}
        </button>
      </nav>

      <div className="gpt-sidebar-bottom">
        <button type="button" className="gpt-sidebar-item" onClick={onOpenSettings}>
          ⚙️ {t("sidebar.settings")}
        </button>
        <div className="gpt-sidebar-user">
          <div className="gpt-sidebar-avatar">
            <img
              src="brand/tenmon-ark-mark.svg"
              alt="TENMON-ARK"
              className="gpt-brand-mark"
            />
          </div>
          <div className="gpt-sidebar-user-lines">
            <div className="gpt-sidebar-user-line-main">{t("sidebar.brandLine1")}</div>
            <div className="gpt-sidebar-user-line-sub">{t("sidebar.brandLine2")}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
