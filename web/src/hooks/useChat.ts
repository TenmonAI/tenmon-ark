import { useEffect, useState } from "react";
import { postChat } from "../api/chat";
import type { Message } from "../types/chat";
import { upsertThread, addMessage, listThreads, listMessages, type Thread, type Message as DBMessage } from "../lib/db";

function getOrCreateSessionId(): string {
  const key = "tenmon-ark.sessionId";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim().length > 0) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, created);
  return created;
}

function generateMessageId(threadId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 9);
  return `${threadId}:${ts}:${rand}`;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // DB初期化と復元
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // sessionId取得
        const sid = getOrCreateSessionId();
        setSessionId(sid);
        if (!mounted) return;

        // スレッド復元（最新のスレッドを使用）
        const threads = await listThreads();
        if (threads.length > 0 && mounted) {
          const latestThread = threads[0];
          // メッセージ復元
          const dbMessages = await listMessages(latestThread.id);
          if (mounted) {
            const restoredMessages: Message[] = dbMessages.map((m) => ({
              role: m.role,
              content: m.content,
            }));
            setMessages(restoredMessages);
          }
        }

        setDbReady(true);
      } catch (e) {
        console.error("[useChat] DB init failed:", e);
        // DB失敗時も動作継続
        const sid = getOrCreateSessionId();
        setSessionId(sid);
        setDbReady(true);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content) return;

    const sid = sessionId || "default";
    const now = Date.now();

    // UI更新（送信）
    setMessages((prev) => [...prev, { role: "user", content }]);

    // DB保存（ユーザーメッセージ）
    if (dbReady) {
      try {
        const userMsgId = generateMessageId(sid);
        await addMessage({
          id: userMsgId,
          threadId: sid,
          role: "user",
          content,
          createdAt: now,
        });

        // スレッドが無ければ作成/更新
        const threads = await listThreads();
        const threadExists = threads.some((t) => t.id === sid);
        if (!threadExists) {
          await upsertThread({
            id: sid,
            title: content.slice(0, 50),
            createdAt: now,
            updatedAt: now,
          });
        } else {
          await upsertThread({
            id: sid,
            title: content.slice(0, 50),
            createdAt: threads.find((t) => t.id === sid)?.createdAt || now,
            updatedAt: now,
          });
        }
      } catch (e) {
        console.error("[useChat] DB save failed (user):", e);
      }
    }

    try {
      setLoading(true);
      const res = await postChat({
        message: content,
        sessionId: sid,
        persona: "tenmon",
      });

      // UI更新（受信）
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);

      // DB保存（アシスタントメッセージ）
      if (dbReady) {
        try {
          const assistantMsgId = generateMessageId(sid);
          await addMessage({
            id: assistantMsgId,
            threadId: sid,
            role: "assistant",
            content: res.response,
            createdAt: Date.now(),
          });

          // スレッド更新
          const threads = await listThreads();
          const existingThread = threads.find((t) => t.id === sid);
          await upsertThread({
            id: sid,
            title: content.slice(0, 50),
            createdAt: existingThread?.createdAt || now,
            updatedAt: Date.now(),
          });
        } catch (e) {
          console.error("[useChat] DB save failed (assistant):", e);
        }
      }
    } catch (e) {
      console.error("[useChat] sendMessage failed:", e);
      // UI停止禁止: 何もしない
    } finally {
      setLoading(false);
    }
  }

  return {
    sessionId,
    messages,
    loading,
    sendMessage,
  };
}
