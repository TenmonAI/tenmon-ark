import React, { useEffect, useRef } from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatLayout() {
  const { messages, sendMessage, loading, threadId } = useChat();
  const seedSent = useRef(false);

  // P3: Auto-send SUKUYOU_SEED if present in sessionStorage.
  // The effect fires when threadId changes (after switchThreadCanonicalV1).
  // We need a valid threadId before sendMessage will work.
  useEffect(() => {
    if (seedSent.current || !threadId) return;
    try {
      const seed = sessionStorage.getItem("TENMON_SUKUYOU_SEED");
      if (seed) {
        seedSent.current = true;
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED");
        // P4: 深層チャット起動プロンプトも読み取る
        const deepPrompt = sessionStorage.getItem("TENMON_SUKUYOU_DEEP_PROMPT");
        sessionStorage.removeItem("TENMON_SUKUYOU_DEEP_PROMPT");
        // Use requestAnimationFrame + setTimeout to ensure React state is settled
        requestAnimationFrame(() => {
          setTimeout(() => {
            sendMessage(seed);
            // P4: seed送信後、応答を待ってから深層プロンプトを自動送信
            if (deepPrompt) {
              setTimeout(() => sendMessage(deepPrompt), 8000);
            }
          }, 500);
        });
      }
    } catch {}
  }, [threadId, sendMessage]);

  return (
    <div
      className="gpt-chat-layout"
      data-chat-layout-bound="1"
      data-thread-id={threadId || ""}
    >
      <MessageList messages={messages} loading={loading} />
      <Composer onSend={sendMessage} loading={loading} />
    </div>
  );
}
