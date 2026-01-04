import { useState } from "react";

export default function ChatCore() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  async function send() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages((m) => [...m, { role: "user", content: userMessage }]);

    try {
      const res = await fetch("/api/chat?mode=think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = (await res.json()) as any;

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || data.response || String(data) },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `エラー: ${err.message || "送信に失敗しました"}` },
      ]);
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              m.role === "user"
                ? "bg-white"
                : "bg-white"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-3 rounded-lg"
          placeholder="メッセージを入力…"
          rows={3}
        />
        <button onClick={send}>送信</button>
      </div>
    </div>
  );
}
