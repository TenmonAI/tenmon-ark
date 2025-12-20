import { useEffect } from "react";
import { ChatInput } from "../components/ChatInput";
import { ChatWindow } from "../components/ChatWindow";
import { useChat } from "../hooks/useChat";

export function ChatPage() {
  const { messages, sendMessage, loading, sessionId } = useChat();

  useEffect(() => {
    // 初期ログ（UI停止禁止）
    console.log("TENMON-ARK ChatPage mounted", { sessionId });
  }, [sessionId]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0f1a",
        color: "#e5e7eb",
        padding: 16,
        boxSizing: "border-box",
        gap: 12
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>TENMON-ARK Chat</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>sessionId: {sessionId || "(loading...)"}</div>
      </div>

      <ChatWindow messages={messages} />

      <ChatInput loading={loading} onSend={sendMessage} />

      <div style={{ fontSize: 12, opacity: 0.6 }}>
        persona: tenmon / backend: /api/chat (fetch)
      </div>
    </div>
  );
}
