/**
 * 🔱 ArkWidget Core
 * Widget版 Chat Engine（埋め込み用）
 * 
 * 機能:
 * - サイト専用チャットエンジン
 * - iframe内で動作
 * - siteMode=true で外部知識をシャットアウト
 */

import { useState, useEffect, useRef } from "react";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface WidgetConfig {
  siteId: string;
  frameUrl?: string;
  apiUrl?: string;
}

/**
 * Widget Chat Engine
 */
export function useWidgetChat(config: WidgetConfig) {
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = config.apiUrl || "/api/widget/chat";

  /**
   * メッセージを送信
   */
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: WidgetMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          siteId: config.siteId,
          siteMode: true, // 外部知識シャットアウト
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: WidgetMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.text || data.message || "回答を生成できませんでした",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      console.error("[Widget] Error sending message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}

/**
 * Widget UI Component（簡易版）
 */
export function WidgetChatUI({ config }: { config: WidgetConfig }) {
  const { messages, isLoading, error, sendMessage } = useWidgetChat(config);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="widget-chat-container" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* メッセージ一覧 */}
      <div className="widget-messages" style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {messages.length === 0 ? (
          <div className="widget-empty" style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
            <p>このサイトについて質問してください</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`widget-message widget-message-${msg.role}`}
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                backgroundColor: msg.role === "user" ? "#e3f2fd" : "#f5f5f5",
              }}
            >
              <div className="widget-message-role" style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
                {msg.role === "user" ? "あなた" : "TENMON-ARK"}
              </div>
              <div className="widget-message-text">{msg.text}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="widget-loading" style={{ textAlign: "center", color: "#666", padding: "1rem" }}>
            考え中...
          </div>
        )}
        {error && (
          <div className="widget-error" style={{ padding: "0.75rem", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "0.5rem" }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="widget-input-form" style={{ padding: "1rem", borderTop: "1px solid #e0e0e0" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="質問を入力..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
}

