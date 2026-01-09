import { useState } from "react";
import { deriveTitle } from "../App";

type Thread = {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

export default function Chat() {
  const [activeId] = useState("default");
  const [threads, setThreads] = useState<Record<string, Thread>>({
    default: {
      id: "default",
      title: "新しい会話",
      messages: [],
    },
  });
  const [input, setInput] = useState("");

  async function send(mode: "think" | "judge") {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    // メッセージ送信処理（ユーザー投稿の直後）
    if (threads[activeId].title === "新しい会話") {
      const newTitle = deriveTitle(userMessage);
      const updatedThreads = {
        ...threads,
        [activeId]: {
          ...threads[activeId],
          title: newTitle,
        },
      };
      setThreads(updatedThreads);
      localStorage.setItem("tenmon_threads", JSON.stringify(updatedThreads));
    }

    const updatedMessages = [...threads[activeId].messages, { role: "user" as const, content: userMessage }];
    setThreads({
      ...threads,
      [activeId]: {
        ...threads[activeId],
        messages: updatedMessages,
      },
    });

    const res = await fetch(`/api/chat?mode=${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await res.json();

    setThreads({
      ...threads,
      [activeId]: {
        ...threads[activeId],
        messages: [
          ...updatedMessages,
          { role: "assistant" as const, content: data.reply || data.response || "" },
        ],
      },
    });
  }

  const currentMessages = threads[activeId]?.messages || [];

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {currentMessages.map((m, i) => (
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
        />
        <button onClick={() => send("think")}>THINK</button>
        <button onClick={() => send("judge")}>JUDGE</button>
      </div>
    </div>
  );
}
