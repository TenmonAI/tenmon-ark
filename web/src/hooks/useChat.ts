import { useEffect, useState, useRef } from "react";
import { postChat } from "../api/chat";
import { listMessagesByThread, replaceThreadMessages, upsertThread } from "../lib/db";
import type { Message, ChatResponse } from "../types/chat";

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

export function useChat(threadId?: string) {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const initDone = useRef(false);

  const sessionId_ = threadId != null && threadId !== "" ? threadId : sessionId;

  useEffect(() => {
    if (threadId != null && threadId !== "") return;
    try {
      setSessionId(getOrCreateThreadId());
    } catch (e) {
      console.error(e);
      setSessionId("default");
    }
  }, [threadId]);

  useEffect(() => {
    if (!sessionId_) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMessagesByThread(sessionId_);
        if (cancelled) return;
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "useChat.ts:loadIDB", message: "messages loaded from IDB", data: { sessionId, rowsLength: rows?.length ?? 0 }, timestamp: Date.now(), hypothesisId: "C" }) }).catch(() => {});
        // #endregion
        if (rows.length > 0) {
          setMessages(rows.map((m) => ({ role: m.role === "tenmon" ? "assistant" : "user", content: m.text })));
        }
        initDone.current = true;
      } catch {
        initDone.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId_]);

  useEffect(() => {
    if (!sessionId_ || !initDone.current || messages.length === 0) return;
    const t = setTimeout(() => {
      (async () => {
    try {
      await upsertThread({ id: sessionId_, updatedAt: Date.now() });
      const base = Date.now();
      const persist: { id: string; threadId: string; role: "user" | "tenmon"; text: string; createdAt: number }[] = messages.map((m, i) => ({
        id: `${sessionId_}:${base}:${i}:${m.role}`,
        threadId: sessionId_,
            role: m.role === "assistant" ? "tenmon" : "user",
            text: m.content,
            createdAt: base + i,
          }));
          await replaceThreadMessages(sessionId_, persist);
        } catch {
          // ignore
        }
      })();
    }, 200);
    return () => clearTimeout(t);
  }, [sessionId_, messages]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      setLoading(true);
      const sid = sessionId_ || "default";
      // #region agent log
      const prevLen = messages.length;
      fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "useChat.ts:sendMessage:before", message: "sessionId and history length", data: { sessionId: sid, sessionIdLen: (sid || "").length, messagesLengthBeforeSend: prevLen + 1 }, timestamp: Date.now(), hypothesisId: "A" }) }).catch(() => {});
      // #endregion
      const res = await postChat({ message: content, sessionId: sid });
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: "useChat.ts:sendMessage:after", message: "UI display value", data: { displayContentType: typeof res?.response, displayContentLen: typeof res?.response === "string" ? res.response.length : null, displayContentUndefined: res?.response === undefined }, timestamp: Date.now(), hypothesisId: "B" }) }).catch(() => {});
      // #endregion
      setLastResponse(res);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return { sessionId: sessionId_, messages, loading, sendMessage, lastResponse };
}
