import React from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";

interface ChatLayoutProps {
  threadId?: string;
}

export function ChatLayout({ threadId: threadIdProp = "" }: ChatLayoutProps) {
  const { messages, sendMessage, loading } = useChat(threadIdProp || undefined);

  return (
    <div className="gpt-chat-layout">
      <MessageList messages={messages} loading={loading} />
      <Composer onSend={sendMessage} loading={loading} />
    </div>
  );
}
