import { useEffect, useState } from "react";
import { ChatInput } from "../components/ChatInput";
import { ChatWindow } from "../components/ChatWindow";
import { useChat } from "../hooks/useChat";
import { SettingsPanel } from "../components/SettingsPanel";

export function ChatPage() {
  const { messages, sendMessage, loading, sessionId } = useChat();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // 初期ログ（UI停止禁止）
    console.log("TENMON-ARK ChatPage mounted", { sessionId });
  }, [sessionId]);

  const handleImported = () => {
    alert("復元しました。再読み込みします。");
    window.location.reload();
  };

  return (
    <>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#0a0f1a",
          color: "#e5e7eb",
          padding: 16,
          boxSizing: "border-box",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>TENMON-ARK Chat</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>sessionId: {sessionId || "(loading...)"}</div>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 20,
                padding: "4px 8px",
                opacity: 0.8,
              }}
              title="設定"
            >
              ⚙️
            </button>
          </div>
        </div>

        <ChatWindow messages={messages} />

        <ChatInput loading={loading} onSend={sendMessage} />

        <div style={{ fontSize: 12, opacity: 0.6 }}>
          persona: tenmon / backend: /api/chat (fetch)
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onImported={handleImported} />
    </>
  );
}
