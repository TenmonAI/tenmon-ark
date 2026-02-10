import React, { useEffect, useState } from "react";
import { Sidebar, type GptView } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatRoute } from "../../pages/ChatRoute";
import { DashboardPage } from "../../pages/DashboardPage";
import { ProfilePage } from "../../pages/ProfilePage";
import { SettingsModal } from "./SettingsModal";
import { APP_TITLE } from "../../config/app";

export function GptShell() {
  const [view, setView] = useState<GptView>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOverlayNav, setIsOverlayNav] = useState(false); // <=1024 drawer mode

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = () => {
    setView("chat");
    setSidebarOpen(false);
    window.location.reload();
  };

  const handleChangeView = (next: GptView) => {
    setView(next);
    setSidebarOpen(false);
  };

  const handleOpenSettings = () => {
    setSidebarOpen(false);
    setSettingsOpen(true);
  };

  
  // GPT-like Responsive Nav (mobile/tablet)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => {
      const overlay = mq.matches;
      setIsOverlayNav(overlay);
      if (!overlay) setSidebarOpen(false);
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // lock body scroll when drawer open
  useEffect(() => {
    if (!isOverlayNav) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = sidebarOpen ? "hidden" : (prev || "");
    return () => { document.body.style.overflow = prev || ""; };
  }, [sidebarOpen, isOverlayNav]);

  // ESC closes drawer
  useEffect(() => {
    if (!isOverlayNav || !sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, isOverlayNav]);

const title =
    view === "chat"
      ? APP_TITLE
      : view === "dashboard"
        ? "Dashboard"
        : "Profile";

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={`gpt-shell ${isOverlayNav ? "gpt-shell--overlay" : ""} ${sidebarOpen ? "gpt-shell--open" : ""}`}>
      <div className="gpt-overlay" onClick={() => setSidebarOpen(false)} />
      <Sidebar
        view={view}
        onView={handleChangeView}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
      />
      <main className="gpt-main">
        <Topbar title={title} onOpenSidebar={() => setSidebarOpen(true)} />
        <div className="gpt-content">
          {view === "chat" && <ChatRoute />}
          {view === "dashboard" && <DashboardPage />}
          {view === "profile" && <ProfilePage />}
        </div>
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
