import React, { useEffect, useState, useCallback } from "react";
import { Sidebar, type GptView } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatRoute } from "../../pages/ChatRoute";
import { DashboardPage } from "../../pages/DashboardPage";
import { ProfilePage } from "../../pages/ProfilePage";
import { SukuyouPage } from "../../pages/SukuyouPage";
import { SettingsModal } from "./SettingsModal";
import FeedbackPage from "../../pages/FeedbackPage";
import { SukuyouAboutPage } from "../../pages/SukuyouAboutPage";
import { KotodamaAboutPage } from "../../pages/KotodamaAboutPage";
import { AmatsuKanagiAboutPage } from "../../pages/AmatsuKanagiAboutPage";
import { APP_TITLE } from "../../config/app";
import { createNewThreadId, switchThreadCanonicalV1, getThreadId } from "../../hooks/useChat";
import { loadNavState, markChatActive, markViewActive, getLastActiveThreadId } from "../../lib/navState";

export function GptShell({ initialView = "chat" }: { initialView?: GptView }) {
  /* ── ナビゲーション状態復元 ── */
  const savedNav = loadNavState();
  const resolvedInitialView = initialView !== "chat" ? initialView : (savedNav.lastActiveView || "chat");

  const [view, setView] = useState<GptView>(resolvedInitialView as GptView);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOverlayNav, setIsOverlayNav] = useState(false);

  /* ── 宿曜ルーム再開用 state ── */
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  /* ── ナビゲーション状態の永続化 ── */
  useEffect(() => {
    if (view === "chat") {
      try {
        const tid = getThreadId();
        markChatActive(tid);
      } catch {}
    } else {
      markViewActive(view as any);
    }
  }, [view]);

  /** チャットに戻る */
  const handleBackToChat = useCallback(() => {
    const lastTid = getLastActiveThreadId();
    if (lastTid) {
      switchThreadCanonicalV1(lastTid);
    }
    setView("chat");
    setSidebarOpen(false);
  }, []);

  /** TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1: ページ再読込なし */
  const handleNewChat = () => {
    setView("chat");
    setSidebarOpen(false);
    const newId = createNewThreadId();
    switchThreadCanonicalV1(newId);
    markChatActive(newId);
  };

  const handleChangeView = (next: GptView) => {
    if (next === "sukuyou") {
      setOpenRoomId(null);
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

  /* ── 新規宿曜鑑定を始める ── */
  const handleNewSukuyou = useCallback(() => {
    setOpenRoomId(null);
    setView("sukuyou");
    setSidebarOpen(false);
  }, []);

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
        ? "ダッシュボード"
        : view === "sukuyou" || view === "sukuyou-room"
          ? "宿曜鑑定"
          : view === "sukuyou-about"
            ? "宿曜経とは"
            : view === "kotodama-about"
              ? "言霊秘書とは"
              : view === "amatsu-kanagi-about"
                ? "天津金木とは"
                : view === "feedback"
                ? "改善のご要望"
                : "プロフィール";

  const handleSukuyouSendToChat = (displayText: string, rawSeed: string, deepChatPrompt?: string) => {
    setView("chat");
    try {
      sessionStorage.setItem("TENMON_SUKUYOU_SEED", rawSeed);
      sessionStorage.setItem("TENMON_SUKUYOU_SEED_DISPLAY", displayText);
      if (deepChatPrompt) {
        sessionStorage.setItem("TENMON_SUKUYOU_DEEP_PROMPT", deepChatPrompt);
      }
      // MANUS-UI-04: 宿名チャット文脈情報を保存
      try {
        const seedJson = rawSeed.replace(/^\[SUKUYOU_SEED\]\s*/, "");
        const parsed = JSON.parse(seedJson);
        if (parsed?.honmeiShuku) {
          sessionStorage.setItem("TENMON_SUKUYOU_CONTEXT", JSON.stringify({
            honmeiShuku: parsed.honmeiShuku || "",
            disasterType: parsed.disasterType || "",
            reversalAxis: parsed.reversalAxis || "",
          }));
        }
      } catch { /* seed parse fail — non-critical */ }
    } catch {}
    const newId = createNewThreadId();
    switchThreadCanonicalV1(newId);
    markChatActive(newId);
  };

  /* ── 非チャットビューかどうか（戻る導線を出すか） ── */
  const showBackToChat = view !== "chat" && view !== "sukuyou" && view !== "sukuyou-room" && view !== "sukuyou-about" && view !== "kotodama-about" && view !== "amatsu-kanagi-about";

  return (
    <div className={`gpt-shell ${isOverlayNav ? "gpt-shell--overlay" : ""} ${sidebarOpen ? "gpt-shell--open" : ""}`}>
      <div className="gpt-overlay" onClick={() => setSidebarOpen(false)} />
      <Sidebar
        view={view}
        onView={handleChangeView}
        onNewChat={handleNewChat}
        onNewSukuyou={handleNewSukuyou}
        onOpenSettings={handleOpenSettings}
        onOpenSukuyouRoom={handleOpenSukuyouRoom}
        onBackToChat={handleBackToChat}
      />
      <main className="gpt-main">
        <Topbar
          title={title}
          onOpenSidebar={isOverlayNav ? () => setSidebarOpen(true) : undefined}
          isSidebarOpen={sidebarOpen}
          showBackToChat={showBackToChat}
          onBackToChat={handleBackToChat}
          onSukuyouAbout={() => { setView("sukuyou-about"); setSidebarOpen(false); }}
          onKotodamaAbout={() => { setView("kotodama-about"); setSidebarOpen(false); }}
          onAmatsuKanagiAbout={() => { setView("amatsu-kanagi-about"); setSidebarOpen(false); }}
        />
        <div className="gpt-content">
          {view === "chat" && <ChatRoute />}
          {view === "dashboard" && <DashboardPage onNavigate={(v) => handleChangeView(v as GptView)} />}
          {view === "profile" && <ProfilePage />}
          {view === "sukuyou" && (
            <SukuyouPage
              onBack={() => setView("chat")}
              onSendToChat={handleSukuyouSendToChat}
              onNewDiagnosis={handleNewSukuyou}
            />
          )}
          {view === "sukuyou-room" && openRoomId && (
            <SukuyouPage
              key={openRoomId}
              onBack={() => setView("chat")}
              onSendToChat={handleSukuyouSendToChat}
              restoreRoomId={openRoomId}
              onNewDiagnosis={handleNewSukuyou}
            />
          )}
          {view === "sukuyou-about" && (
            <SukuyouAboutPage onBack={() => setView("chat")} />
          )}
          {view === "kotodama-about" && (
            <KotodamaAboutPage onBack={() => setView("chat")} />
          )}
          {view === "amatsu-kanagi-about" && (
            <AmatsuKanagiAboutPage onBack={() => setView("chat")} />
          )}
          {view === "feedback" && (
            <FeedbackPage onBack={() => setView("chat")} />
          )}
        </div>
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
