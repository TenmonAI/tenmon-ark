import { useState, useEffect } from "react";
import { deriveTitle } from "../lib/title";

type Thread = {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

// localStorage から threads を読み込む
function loadThreadsFromStorage(): Record<string, Thread> {
  try {
    const stored = localStorage.getItem("tenmon_threads");
    if (stored) {
      const parsed = JSON.parse(stored);
      // バリデーション: Thread 型に合致するか確認
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load threads from localStorage:", e);
  }
  // デフォルト値
  return {
    default: {
      id: "default",
      title: "新しい会話",
      messages: [],
    },
  };
}

// 既存スレッド救済: 「新しい会話」のままのスレッドで messages がある場合、タイトルを自動補完
function rescueThreadTitles(threads: Record<string, Thread>): Record<string, Thread> {
  const updated = { ...threads };
  let changed = false;

  for (const [id, thread] of Object.entries(updated)) {
    if (thread.title === "新しい会話" && thread.messages.length > 0) {
      // 最初のユーザーメッセージからタイトルを生成
      const firstUserMessage = thread.messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        updated[id] = {
          ...thread,
          title: deriveTitle(firstUserMessage.content),
        };
        changed = true;
      }
    }
  }

  return changed ? updated : threads;
}

export default function Chat() {
  const [activeId] = useState("default");
  const [threads, setThreads] = useState<Record<string, Thread>>(() => {
    const loaded = loadThreadsFromStorage();
    return rescueThreadTitles(loaded);
  });
  const [input, setInput] = useState("");

  // threads の変更を localStorage に保存
  useEffect(() => {
    try {
      localStorage.setItem("tenmon_threads", JSON.stringify(threads));
    } catch (e) {
      console.warn("Failed to save threads to localStorage:", e);
    }
  }, [threads]);

  async function send(mode: "think" | "judge") {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    // タイトル更新とメッセージ更新を1つの setThreads に統合（関数型更新で最新状態を参照）
    setThreads((prevThreads) => {
      const currentThread = prevThreads[activeId] || {
        id: activeId,
        title: "新しい会話",
        messages: [],
      };

      // タイトル更新（「新しい会話」の場合のみ、かつ最初のユーザーメッセージの時）
      const shouldUpdateTitle =
        currentThread.title === "新しい会話" && currentThread.messages.length === 0;
      const newTitle = shouldUpdateTitle ? deriveTitle(userMessage) : currentThread.title;

      // ユーザーメッセージを追加
      const updatedMessages = [
        ...currentThread.messages,
        { role: "user" as const, content: userMessage },
      ];

      return {
        ...prevThreads,
        [activeId]: {
          ...currentThread,
          title: newTitle,
          messages: updatedMessages,
        },
      };
    });

    const res = await fetch(`/api/chat?mode=${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await res.json();

    // アシスタントメッセージを追加（関数型更新で最新状態を参照）
    setThreads((prevThreads) => {
      const currentThread = prevThreads[activeId];
      if (!currentThread) return prevThreads;

      return {
        ...prevThreads,
        [activeId]: {
          ...currentThread,
          messages: [
            ...currentThread.messages,
            { role: "assistant" as const, content: data.reply || data.response || "" },
          ],
        },
      };
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
