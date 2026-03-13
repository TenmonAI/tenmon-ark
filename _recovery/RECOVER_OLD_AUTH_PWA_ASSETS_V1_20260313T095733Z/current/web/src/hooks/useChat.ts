import { useEffect, useMemo, useRef, useState } from "react";
import { postChat } from "../api/chat";

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  at: string;
  _payload?: any;
};

const THREAD_KEY = "TENMON_THREAD_ID";
const MSGS_KEY_PREFIX = "TENMON_PWA_MSGS_V2:";

function getThreadId(): string {
  try {
    const v = localStorage.getItem(THREAD_KEY);
    if (v && v.trim()) return v;
    const next = `pwa-${Date.now().toString(36)}`;
    localStorage.setItem(THREAD_KEY, next);
    return next;
  } catch {
    return `pwa-${Date.now().toString(36)}`;
  }
}

function loadMessages(threadId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MSGS_KEY_PREFIX + threadId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(threadId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(MSGS_KEY_PREFIX + threadId, JSON.stringify(messages));
  } catch {}
}

export function useChat() {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const tid = getThreadId();
    setThreadId(tid);
    setMessages(loadMessages(tid));
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !threadId) return;
    saveMessages(threadId, messages);
  }, [threadId, messages]);

  async function sendMessage(input: string) {
    const text = String(input || "").trim();
    if (!text || !threadId) return;

    const userMsg: ChatMessage = {
      id: `${threadId}:u:${Date.now()}`,
      role: "user",
      content: text,
      at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      setLoading(true);
      const out = await postChat({ message: text, threadId });
      const assistantMsg: ChatMessage = {
        id: `${threadId}:a:${Date.now()}`,
        role: "assistant",
        content: String(out?.response || ""),
        at: new Date().toISOString(),
        _payload: out,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  function resetThread() {
    const tid = `pwa-${Date.now().toString(36)}`;
    try { localStorage.setItem(THREAD_KEY, tid); } catch {}
    setThreadId(tid);
    setMessages([]);
  }

  return {
    threadId,
    messages,
    loading,
    sendMessage,
    resetThread,
  };
}
