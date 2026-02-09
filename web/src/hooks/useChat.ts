import { useEffect, useState } from "react";
import { postChat } from "../api/chat";
import type { Message } from "../types/chat";

const THREAD_ID_KEY = "tenmon_thread_id_v1";

function getOrCreateThreadId(): string {
  const existing = window.localStorage.getItem(THREAD_ID_KEY);
  if (existing && existing.trim().length > 0) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(THREAD_ID_KEY, created);
  return created;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setSessionId(getOrCreateThreadId());
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
      const res = await postChat({ message: content, sessionId: sid });
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return { sessionId, messages, loading, sendMessage };
}
