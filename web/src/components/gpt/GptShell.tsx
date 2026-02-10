import React, { useState } from "react";
import { Sidebar, type GptView } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatRoute } from "../../pages/ChatRoute";
import { DashboardPage } from "../../pages/DashboardPage";
import { ProfilePage } from "../../pages/ProfilePage";
import { SettingsModal } from "./SettingsModal";

export function GptShell() {
  const [view, setView] = useState<GptView>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNewChat = () => {
    setView("chat");
    window.location.reload();
  };

  return (
    <div className="gpt-shell">
      <Sidebar
        view={view}
        onView={setView}
        onNewChat={handleNewChat}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="gpt-main">
        <Topbar title={view === "chat" ? "Chat" : view === "dashboard" ? "Dashboard" : "Profile"} />
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
