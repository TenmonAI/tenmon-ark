import { useState } from "react";
import ChatCore from "./features/chat-core/ChatCore";
import SettingsPage from "./features/settings/SettingsPage";

export default function App() {
  const [activeId, setActiveId] = useState<"chat" | "settings">("chat");

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      {/* 左サイドバー */}
      <aside style={{ width: "256px", backgroundColor: "#f7f7f8", padding: "12px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "16px", padding: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
          TENMON-ARK
        </div>
        
        <div style={{ flex: 1 }} />
        
        {/* 設定メニュー */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
          <button
            onClick={() => setActiveId("settings")}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: "14px",
              color: activeId === "settings" ? "#111827" : "#6b7280",
              backgroundColor: activeId === "settings" ? "#ffffff" : "transparent",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ⚙ カスタム天聞アーク
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main style={{ flex: 1, backgroundColor: "#ffffff" }}>
        {activeId === "chat" ? <ChatCore /> : <SettingsPage onBack={() => setActiveId("chat")} />}
      </main>
    </div>
  );
}
