import React, { useEffect, useRef } from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatLayout() {
  const { messages, sendMessage, loading, threadId } = useChat();
  const seedSent = useRef(false);

  // Auto-send SUKUYOU_SEED if present in sessionStorage.
  // The effect fires when threadId changes (after switchThreadCanonicalV1).
  // We need a valid threadId before sendMessage will work.
  useEffect(() => {
    if (seedSent.current || !threadId) return;
    try {
      const seed = sessionStorage.getItem("TENMON_SUKUYOU_SEED");
      if (seed) {
        seedSent.current = true;
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED");
        // Use requestAnimationFrame + setTimeout to ensure React state is settled
        requestAnimationFrame(() => {
          setTimeout(() => sendMessage(seed), 500);
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
