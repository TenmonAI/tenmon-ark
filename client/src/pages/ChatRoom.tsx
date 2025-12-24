import { useState } from "react";

export default function ChatRoom() {
  const [text, setText] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const json = await res.json();
      console.log("API RESPONSE:", json);

      // 最低限これだけ表示する
      setResponse(
        json?.observation?.description ??
        json?.response ??
        JSON.stringify(json, null, 2)
      );
    } catch (e) {
      setResponse("❌ APIエラー");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h1>TENMON-ARK</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <button onClick={send} disabled={loading}>
        {loading ? "送信中…" : "Send"}
      </button>

      {response && (
        <pre
          style={{
            marginTop: 20,
            padding: 16,
            background: "#f5f5f5",
            whiteSpace: "pre-wrap",
          }}
        >
          {response}
        </pre>
      )}
    </div>
  );
}
