import React from "react";

export type GptView = "chat" | "dashboard" | "profile";

interface SidebarProps {
  view: GptView;
  onView: (v: GptView) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ view, onView, onNewChat, onOpenSettings }: SidebarProps) {
  const linkClass = (v: GptView) =>
    `gpt-sidebar-item ${view === v ? "gpt-sidebar-item-active" : ""}`;

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <button type="button" className="gpt-btn gpt-btn-primary gpt-sidebar-new-chat" onClick={onNewChat}>
          + New chat
        </button>
        <button type="button" className="gpt-sidebar-search" aria-label="Search">
          <span>🔍</span>
          <span>Search</span>
        </button>
      </div>

      <nav className="gpt-scroll gpt-sidebar-history">
        <div className="gpt-sidebar-section-label">Today</div>
        <button type="button" className={linkClass("chat")} onClick={() => onView("chat")}>
          Chat
        </button>
        <div className="gpt-sidebar-section-label">Explore</div>
        <button type="button" className={linkClass("dashboard")} onClick={() => onView("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={linkClass("profile")} onClick={() => onView("profile")}>
          Profile
        </button>
      </nav>

      <div className="gpt-sidebar-bottom">
        <button type="button" className="gpt-sidebar-item" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
        <div className="gpt-sidebar-user">
          <div className="gpt-sidebar-avatar">T</div>
          <div className="gpt-sidebar-user-label">TENMON-ARK</div>
        </div>
      </div>
    </aside>
  );
}
