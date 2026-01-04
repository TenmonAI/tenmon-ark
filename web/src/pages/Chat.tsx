// チャットページ（ChatGPT風）
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../components/ChatMessage";
import { Composer } from "../components/Composer";
import { postChat } from "../api/chat";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const sessionId = `session_${Date.now()}`;

  // 自動スクロール（ユーザーが上に戻っている時は固定しない）
  useEffect(() => {
    if (!isUserScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserScrolled]);

  // スクロール位置監視
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserScrolled(!isNearBottom);
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleSend(message: string) {
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    setIsUserScrolled(false);

    try {
      const response = await postChat({
        message,
        sessionId,
        persona: "tenmon",
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.response || "応答がありませんでした。" },
      ]);
    } catch (e: any) {
      setError(e?.message || "エラーが発生しました");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="text-sm font-medium text-gray-900">TENMON-ARK</div>
      </div>

      {/* メッセージエリア */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-8 bg-gray-100"
      >
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-2">SYSTEM</div>
              <div className="text-sm leading-relaxed text-gray-900">
                TENMON-ARK 起動。メッセージを入力してください。
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex justify-start mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-400">入力中...</div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力欄 */}
      <Composer onSend={handleSend} loading={loading} />
    </div>
  );
}

