import { useState } from "react";

export default function ChatRoom() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setOutput(data.response ?? "（応答がありません）");
    } catch (e) {
      setOutput("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h1>TENMON-ARK</h1>

      <textarea
        rows={4}
        style={{ width: "100%", fontSize: 16 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="ここに入力"
      />

      <br />

      <button onClick={send} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Thinking..." : "Send"}
      </button>

      <hr />

      <div style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
        {output}
      </div>
    </div>
  );
}
