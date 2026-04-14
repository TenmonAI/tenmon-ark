import React, { useEffect, useState } from "react";
import { Sidebar, type GptView } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatRoute } from "../../pages/ChatRoute";
import { DashboardPage } from "../../pages/DashboardPage";
import { ProfilePage } from "../../pages/ProfilePage";
import { SukuyouPage } from "../../pages/SukuyouPage";
import { SettingsModal } from "./SettingsModal";
import { APP_TITLE } from "../../config/app";
import { createNewThreadId, switchThreadCanonicalV1 } from "../../hooks/useChat";

export function GptShell({ initialView = "chat" }: { initialView?: GptView }) {
  const [view, setView] = useState<GptView>(initialView);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOverlayNav, setIsOverlayNav] = useState(false); // <=1024 drawer mode


  /** TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1: ページ再読込なし・useChat.resetThread と同系統 */
  const handleNewChat = () => {
    setView("chat");
    setSidebarOpen(false);
    switchThreadCanonicalV1(createNewThreadId());
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
        : view === "sukuyou"
          ? "宿曜鑑定"
          : "Profile";

  const handleSukuyouSendToChat = (seed: string) => {
    // Switch to chat view and inject the seed
    setView("chat");
    try {
      sessionStorage.setItem("TENMON_SUKUYOU_SEED", seed);
    } catch {}
    switchThreadCanonicalV1(createNewThreadId());
  };
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
        <Topbar title={title} onOpenSidebar={isOverlayNav ? () => setSidebarOpen(true) : undefined} isSidebarOpen={sidebarOpen} />
        <div className="gpt-content">
          {view === "chat" && <ChatRoute />}
          {view === "dashboard" && <DashboardPage />}
          {view === "profile" && <ProfilePage />}
          {view === "sukuyou" && <SukuyouPage onBack={() => setView("chat")} onSendToChat={handleSukuyouSendToChat} />}
        </div>
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
