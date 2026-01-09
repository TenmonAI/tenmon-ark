import { useState, useEffect } from "react";

function makeTitle(text: string): string {
  let t = (text ?? "").trim();
  t = t.replace(/#(詳細|detail)\b/gi, "");
  t = t.replace(/\b(doc|pdfPage)\s*[:=]\s*\S+/gi, "");
  t = t.replace(/[「」『』【】\[\]（）()]/g, "");
  t = t.replace(/\s+/g, " ").trim();

  if (!t) return "新しい会話";
  if (/^(おはよう|こんにちは|こんばんは|ありがとう|おやすみ)/.test(t)) return "ごあいさつ";
  return t.length > 18 ? t.slice(0, 18) + "…" : t;
}

type Settings = {
  name: string;
  description: string;
};

export default function ChatCore() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // 設定を取得
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          name: data.name || "TENMON-ARK",
          description: data.description || "",
        });
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      // エラー時はデフォルト値を設定
      setSettings({
        name: "TENMON-ARK",
        description: "",
      });
    }
  }

  async function send() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages((m) => [...m, { role: "user", content: userMessage }]);

    // 送信後：threads[activeId].messages に user を push した直後に
    try {
      const raw = window.localStorage.getItem("tenmon_threads");
      const threads = raw ? JSON.parse(raw) : {};
      const activeId = "default";
      const thread = threads[activeId] ?? {
        id: activeId,
        title: "新しい会話",
        messages: [],
      };

      if (thread.title === "新しい会話") {
        thread.title = makeTitle(userMessage);
        threads[activeId] = thread;
        window.localStorage.setItem("tenmon_threads", JSON.stringify(threads));
      }
    } catch (e) {
      // localStorage が使えない環境では無視
      console.warn("failed to update tenmon_threads:", e);
    }

    try {
      const activeId = "default"; // 暫定（将来的にスレッド一覧から選択）
      const res = await fetch("/api/chat?mode=think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          threadId: activeId, // 追加
        }),
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
    <div className="flex flex-col h-full">
      {/* ヘッダー：カスタム天聞アーク情報 */}
      {settings && (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
            {settings.name}
          </div>
          {settings.description && (
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              {settings.description}
            </div>
          )}
        </div>
      )}

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-6 gap-4" style={{ display: "flex", flexDirection: "column" }}>
        <div className="space-y-4">
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
      </div>

      {/* 入力欄 */}
      <div className="flex gap-2 p-6" style={{ borderTop: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
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
