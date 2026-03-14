import { useEffect, useRef, useState } from "react";
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

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
};

const THREADS_META_KEY = "TENMON_PWA_THREADS_META_V1";

function loadThreadMetaMap(): Record<string, ThreadMeta> {
  try {
    const raw = localStorage.getItem(THREADS_META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ThreadMeta>) : {};
  } catch {
    return {};
  }
}

function saveThreadMetaMap(map: Record<string, ThreadMeta>) {
  try {
    localStorage.setItem(THREADS_META_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function inferTitle(msgs: ChatMessage[]): string | undefined {
  const firstUser = msgs.find((m) => m.role === "user");
  const firstAssistant = msgs.find((m) => m.role === "assistant");
  const base = (firstUser || firstAssistant)?.content?.trim();
  if (!base) return undefined;
  const oneLine = base.split(/\r?\n/)[0] || base;
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine;
}

function touchThreadMeta(threadId: string, msgs: ChatMessage[]) {
  try {
    const map = loadThreadMetaMap();
    const prev = map[threadId] || { id: threadId };
    const title = prev.title || inferTitle(msgs);
    map[threadId] = {
      id: threadId,
      title,
      updatedAt: Date.now(),
    };
    saveThreadMetaMap(map);
  } catch {
    // ignore
  }
}

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
     // ensure thread meta exists
    try {
      const map = loadThreadMetaMap();
      if (!map[tid]) {
        map[tid] = { id: tid, updatedAt: Date.now() };
        saveThreadMetaMap(map);
      }
    } catch {
      // ignore
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !threadId) return;
    saveMessages(threadId, messages);
    touchThreadMeta(threadId, messages);
    try {
      window.dispatchEvent(new Event("tenmon:threads-updated"));
    } catch {
      // ignore (e.g. SSR)
    }
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
      const out = await postChat({ message: text, sessionId: threadId });
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
    try {
      localStorage.setItem(THREAD_KEY, tid);
      window.dispatchEvent(new Event("tenmon:threads-updated"));
    } catch {
      // ignore
    }
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
