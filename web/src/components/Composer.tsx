// 入力欄（ChatGPT風・下固定）
import { useState, useRef, useEffect } from "react";

type ComposerProps = {
  onSend: (message: string) => void;
  loading?: boolean;
};

export function Composer({ onSend, loading = false }: ComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  function handleSend() {
    if (!message.trim() || loading) return;
    onSend(message.trim());
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isComposing = composingRef.current || (e.nativeEvent as any).isComposing;
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="bg-white px-6 py-4 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
      <div className="max-w-2xl mx-auto">
        <textarea
          ref={textareaRef}
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          placeholder="メッセージを入力…"
          disabled={loading}
        />
        {loading && (
          <div className="mt-2 text-xs text-gray-500">送信中...</div>
        )}
      </div>
    </div>
  );
}

