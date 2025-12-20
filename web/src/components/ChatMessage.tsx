import type { Message } from "../types/chat";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        margin: "6px 0"
      }}
    >
      <div
        style={{
          maxWidth: 760,
          padding: "10px 12px",
          borderRadius: 10,
          background: isUser ? "#1f2937" : "#111827",
          color: "#e5e7eb",
          border: "1px solid #374151",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{isUser ? "user" : "assistant"}</div>
        <div>{message.content}</div>
      </div>
    </div>
  );
}
