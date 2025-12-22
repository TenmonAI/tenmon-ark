import { useEffect, useState, useRef } from "react";
import { t } from "./i18n";
import { KokuzoPage } from "./pages/KokuzoPage";
import { TrainPage } from "./pages/TrainPage";
import { TrainingPage } from "./pages/TrainingPage";
import KanagiPage from "./pages/KanagiPage";

type Health = {
  status: string;
  service: string;
};

type Persona = {
  personaId: string;
  ok: boolean;
  state: {
    mode?: string;
    phase?: string;
    inertia?: number;
  };
};

type MemoryStats = {
  session: number;
  conversation: number;
  kokuzo: number;
};

// PHASE B: 会話履歴の型定義
type Message = {
  role: "user" | "tenmon";
  content: string;
};

export function App() {
  // KOKŪZŌ v1.1: Route to /kokuzo page
  if (window.location.pathname === "/kokuzo") {
    return <KokuzoPage />;
  }

  // Training Chat: Route to /train page
  if (window.location.pathname === "/train") {
    return <TrainPage />;
  }

  // Training Chat (Learning Material): Route to /training page
  if (window.location.pathname === "/training") {
    return <TrainingPage />;
  }

  // Kanagi Spiral Visualizer: Route to /kanagi page
  if (window.location.pathname === "/kanagi") {
    return <KanagiPage />;
  }

  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [memory, setMemory] = useState<MemoryStats | null>(null);
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const composingRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch(() => setError("API unreachable"));
  }, []);

  useEffect(() => {
    fetch("/api/persona")
      .then((res) => {
        if (!res.ok) throw new Error("persona api error");
        return res.json();
      })
      .then((data) => setPersona(data))
      .catch(() => setPersona(null));
  }, []);

  useEffect(() => {
    fetch("/api/memory/stats")
      .then((res) => {
        if (!res.ok) throw new Error("memory api error");
        return res.json();
      })
      .then((data) => setMemory(data))
      .catch(() => setMemory(null));
  }, []);

  // PHASE B: 新しいメッセージが来たら最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || sending) return;
    
    const userMessage = message.trim();
    
    // PHASE B: 送信したユーザー入力をmessagesに追加
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setSending(true);
    
    // PHASE B: API呼び出し
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        input: userMessage,
        session_id: `session_${Date.now()}`,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("chat api error");
        return res.json();
      })
      .then((data) => {
        // PHASE B: 返ってきたoutputをmessagesに追加
        const responseText = data.response || "TENMON-ARK did not respond.";
        setMessages((prev) => [...prev, { role: "tenmon", content: responseText }]);
      })
      .catch(() => {
        // PHASE B: エラー時もmessagesに追加
        setMessages((prev) => [...prev, { role: "tenmon", content: "TENMON-ARK did not respond." }]);
      })
      .finally(() => setSending(false));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* UI-Ω-1: 画面中央の孤独なカード（余白を広く） */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* UI-Ω-1: タイトル（font-bold はタイトルのみ） */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("title")}</h1>

        {/* UI-Ω-1: 状態表示（静か・最小限） */}
        <div className="mb-4 space-y-2 text-xs text-gray-500">
          {health && (
            <p>
              {health.service} / {health.status}
            </p>
          )}
          {persona && persona.state?.mode && (
            <p>
              {persona.state.mode} / {persona.state.phase}
            </p>
          )}
        </div>

        {/* PHASE B: 会話履歴を縦に積む（スクロール可能） */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">
              会話を始めてください
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap leading-relaxed text-sm ${
                  msg.role === "user"
                    ? "text-gray-700"
                    : "text-gray-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {/* PHASE B: ロード中表示（最小限） */}
          {sending && (
            <div className="flex justify-start">
              <div className="text-sm text-gray-400">……</div>
            </div>
          )}
          {/* PHASE B: スクロール用のref */}
          <div ref={messagesEndRef} />
        </div>

        {/* UI-Ω-1: 入力欄の上下に余白 */}
        <div className="mt-auto">
          <textarea
            className="w-full border border-gray-300 rounded p-3 text-sm resize-none focus:outline-none focus:border-gray-400 transition-colors"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            onKeyDown={(e) => {
              const isComposing = composingRef.current || (e.nativeEvent as any).isComposing;
              if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message to TENMON-ARK..."
            rows={3}
          />
          
          {/* UI-Ω-1: ボタンは目立たない（hover演出控えめ、disabled視覚的） */}
          <button
            className="mt-3 px-6 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            onClick={sendMessage}
            disabled={sending || !message.trim()}
          >
            {sending ? "送信中..." : "送る"}
          </button>
        </div>
      </div>
    </div>
  );
}
