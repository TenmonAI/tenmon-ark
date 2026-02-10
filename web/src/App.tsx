import { useEffect, useMemo, useState } from "react";
import { SettingsPanel } from "./components/SettingsPanel";
import { ChatPage } from "./pages/ChatPage";
import { KokuzoPage } from "./pages/KokuzoPage";
import { listMessagesByThread, replaceThreadMessages, upsertThread } from "./lib/db";

// NOTE: ルーター導入はしない。最小のタブ切替のみ。
type Tab = "chat" | "dashboard" | "health";

export function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [showSettings, setShowSettings] = useState(false);

  // 既存の threadId / restore ロジック（壊さない）
  const [threadId, setThreadId] = useState<string>(() => {
    try {
      const k = localStorage.getItem("tenmon_thread_id_v1");
      return k && k.trim() ? k : `t_${Date.now()}`;
    } catch {
      return `t_${Date.now()}`;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tenmon_thread_id_v1", threadId);
    } catch {}
  }, [threadId]);

  const headerStyle = useMemo(
    () => ({
      display: "flex" as const,
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      position: "sticky" as const,
      top: 0,
      background: "rgba(10,10,10,0.75)",
      backdropFilter: "blur(10px)",
      zIndex: 10,
    }),
    []
  );

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: tab === t ? "rgba(255,255,255,0.08)" : "transparent",
        fontWeight: tab === t ? 700 : 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>TENMON-ARK</div>
          <div style={{ display: "flex", gap: 8 }}>
            {tabBtn("chat", "Chat")}
            {tabBtn("dashboard", "Dashboard")}
            {tabBtn("health", "Health")}
          </div>
        </div>

        <button onClick={() => setShowSettings((v) => !v)} aria-label="settings">
          ⚙
        </button>
      </header>

      <main style={{ padding: 14 }}>
        {tab === "chat" ? (
          <ChatPage />
        ) : tab === "dashboard" ? (
          <div style={{ marginTop: 12 }}>
            <KokuzoPage />
          </div>
        ) : (
          <HealthPanel threadId={threadId} setThreadId={setThreadId} />
        )}
      </main>

      {showSettings ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 20 }}>
          <SettingsPanel />
        </div>
      ) : null}
    </div>
  );
}

// 既存の “health表示”を壊さない：最低限の枠だけ残す（詳細はSettings/各ページ側へ）
function HealthPanel(props: { threadId: string; setThreadId: (v: string) => void }) {
  const { threadId } = props;
  return (
    <div style={{ opacity: 0.9 }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>UI build is alive</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>threadId: {threadId}</div>
      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
        /api/audit の表示や復元UIは、SettingsPanel 側（既存）で確認してください。
      </div>
    </div>
  );
}
