import { useEffect, useState } from "react";
import { ChatInput } from "../components/ChatInput";
import { ChatWindow } from "../components/ChatWindow";
import { useChat } from "../hooks/useChat";
import { SettingsPanel } from "../components/SettingsPanel";

import { DebugPanel } from "../components/chat/DebugPanel";

// UI1_CHATPAGE_DEBUGTOGGLE_V1
// PWA_CHAT_RELEASE_BRIDGE_V1: hidden debug block ON = ?debug=1 or localStorage TENMON_PWA_DEBUG=1
function isDebugBridgeOn(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("debug") === "1" ||
    localStorage.getItem("TENMON_PWA_DEBUG") === "1"
  );
}

export function ChatPage() {
  const [__debugOpen, __setDebugOpen] = useState(false);
  const debugBridgeOn = isDebugBridgeOn();

  const { messages, sendMessage, loading, sessionId, resetThread } = useChat();
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
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0" }}>
        <button type="button" onClick={() => __setDebugOpen(v => !v)} style={{ opacity: 0.85 }}>
          {__debugOpen ? "根拠: ON" : "根拠: OFF"}
        </button>
      </div>
      {__debugOpen ? (
        <DebugPanel
          payload={
            (Array.isArray((messages as any)) ? (messages as any) : []).slice().reverse().find((m: any) => m?.role === "assistant")?._payload
          }
        />
      ) : null}
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
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Thread: {sessionId || "(loading...)"}
            </div>
            <button
              onClick={resetThread}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid rgba(148, 163, 184, 0.7)",
                background: "rgba(15, 23, 42, 0.8)",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              新しい会話を開始
            </button>
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

        <ChatWindow messages={messages} debugBridgeOn={debugBridgeOn} />

        <ChatInput loading={loading} onSend={sendMessage} />

        <div style={{ fontSize: 12, opacity: 0.6 }}>
          persona: tenmon / backend: /api/chat (same-origin)
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onImported={handleImported} />
    </>
  );
}
