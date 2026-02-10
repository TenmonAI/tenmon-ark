import { useEffect, useState, useRef } from "react";
import { postChat } from "../api/chat";
import { listMessagesByThread, replaceThreadMessages, upsertThread } from "../lib/db";
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
  const initDone = useRef(false);

  useEffect(() => {
    try {
      setSessionId(getOrCreateThreadId());
    } catch (e) {
      console.error(e);
      setSessionId("default");
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMessagesByThread(sessionId);
        if (cancelled) return;
        if (rows.length > 0) {
          setMessages(rows.map((m) => ({ role: m.role === "tenmon" ? "assistant" : "user", content: m.text })));
        }
        initDone.current = true;
      } catch {
        initDone.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !initDone.current || messages.length === 0) return;
    const t = setTimeout(() => {
      (async () => {
        try {
          await upsertThread({ id: sessionId, updatedAt: Date.now() });
          const base = Date.now();
          const persist: { id: string; threadId: string; role: "user" | "tenmon"; text: string; createdAt: number }[] = messages.map((m, i) => ({
            id: `${sessionId}:${base}:${i}:${m.role}`,
            threadId: sessionId,
            role: m.role === "assistant" ? "tenmon" : "user",
            text: m.content,
            createdAt: base + i,
          }));
          await replaceThreadMessages(sessionId, persist);
        } catch {
          // ignore
        }
      })();
    }, 200);
    return () => clearTimeout(t);
  }, [sessionId, messages]);

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
