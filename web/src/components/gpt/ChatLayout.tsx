import React from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

export function ChatLayout() {
  const { messages, sendMessage, loading, threadId } = useChat();

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
