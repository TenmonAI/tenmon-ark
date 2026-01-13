import { useEffect, useState } from "react";
import { postChat } from "../api/chat";
import type { Message } from "../types/chat";

function getOrCreateSessionId(): string {
  const key = "tenmon-ark.sessionId";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim().length > 0) return existing;

  const created = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setSessionId(getOrCreateSessionId());
    } catch (e) {
      console.error(e);
      setSessionId("default");
    }
  }, []);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      setLoading(true);
      const sid = sessionId || "default";
      const res = await postChat({
        message: content,
        threadId: sid, // API側のthreadIdに統一
        meta: { persona: "tenmon" } // metaに移動
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (e) {
      console.error(e);
      // UI停止禁止: 何もしない
    } finally {
      setLoading(false);
    }
  }

  return {
    sessionId,
    messages,
    loading,
    sendMessage
  };
}
