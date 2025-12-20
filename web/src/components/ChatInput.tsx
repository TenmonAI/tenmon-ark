import { useEffect, useState } from "react";

export function ChatInput(props: {
  onSend: (text: string) => void;
  loading: boolean;
}) {
  const { onSend, loading } = props;
  const [text, setText] = useState("");

  useEffect(() => {
    // no-op: keep only useState/useEffect
  }, []);

  function submit() {
    const v = text;
    setText("");
    onSend(v);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="メッセージを入力..."
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #374151",
          background: "#0b1220",
          color: "#e5e7eb"
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={loading}
      />
      <button
        onClick={submit}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #374151",
          background: loading ? "#111827" : "#1f2937",
          color: "#e5e7eb",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "送信中" : "送信"}
      </button>
    </div>
  );
}
