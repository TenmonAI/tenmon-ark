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

  /* ── 宿曜ルーム再開用 state ── */
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  /** TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1: ページ再読込なし・useChat.resetThread と同系統 */
  const handleNewChat = () => {
    setView("chat");
    setSidebarOpen(false);
    switchThreadCanonicalV1(createNewThreadId());
  };

  const handleChangeView = (next: GptView) => {
    if (next === "sukuyou") {
      setOpenRoomId(null); // 新規鑑定モード
    }
    setView(next);
    setSidebarOpen(false);
  };

  const handleOpenSettings = () => {
    setSidebarOpen(false);
    setSettingsOpen(true);
  };

  /* ── 保存済み鑑定ルーム再開 ── */
  const handleOpenSukuyouRoom = (roomId: string) => {
    setOpenRoomId(roomId);
    setView("sukuyou-room");
    setSidebarOpen(false);
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
        : view === "sukuyou" || view === "sukuyou-room"
          ? "宿曜鑑定"
          : "Profile";

  const handleSukuyouSendToChat = (displayText: string, rawSeed: string, deepChatPrompt?: string) => {
    // P2+A6: Switch to chat view and inject the structured seed
    // A6: 表示用テキストとAPI送信用raw seedを分離保存
    setView("chat");
    try {
      sessionStorage.setItem("TENMON_SUKUYOU_SEED", rawSeed);           // API送信用
      sessionStorage.setItem("TENMON_SUKUYOU_SEED_DISPLAY", displayText); // ユーザーバブル表示用
      // P4: 深層チャット起動プロンプトも保存
      if (deepChatPrompt) {
        sessionStorage.setItem("TENMON_SUKUYOU_DEEP_PROMPT", deepChatPrompt);
      }
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
        onOpenSukuyouRoom={handleOpenSukuyouRoom}
      />
      <main className="gpt-main">
        <Topbar title={title} onOpenSidebar={isOverlayNav ? () => setSidebarOpen(true) : undefined} isSidebarOpen={sidebarOpen} />
        <div className="gpt-content">
          {view === "chat" && <ChatRoute />}
          {view === "dashboard" && <DashboardPage />}
          {view === "profile" && <ProfilePage />}
          {view === "sukuyou" && (
            <SukuyouPage
              onBack={() => setView("chat")}
              onSendToChat={handleSukuyouSendToChat}
            />
          )}
          {view === "sukuyou-room" && openRoomId && (
            <SukuyouPage
              key={openRoomId}
              onBack={() => setView("chat")}
              onSendToChat={handleSukuyouSendToChat}
              restoreRoomId={openRoomId}
            />
          )}
        </div>
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
