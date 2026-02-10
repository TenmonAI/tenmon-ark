import React, { useEffect, useRef } from "react";
import { MessageRow } from "./MessageRow";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "../../types/chat";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  return (
    <div className="gpt-scroll gpt-message-list">
      <div className="gpt-message-inner">
        {messages.map((m, i) => (
          <MessageRow key={i} role={m.role as "user" | "assistant"} content={m.content} />
        ))}
        {loading && (
          <div className="gpt-message-row gpt-message-row-assistant">
            <div className="gpt-message-bubble gpt-message-bubble-assistant">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
