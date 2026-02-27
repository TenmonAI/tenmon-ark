import React from "react";
import { ChatLayout } from "../components/gpt/ChatLayout";

/** Chat 画面: ChatPage ロジックは ChatLayout 内の useChat で保持。thread 固定。 */
interface ChatRouteProps {
  threadId?: string;
}

export function ChatRoute({ threadId = "" }: ChatRouteProps) {
  return <ChatLayout threadId={threadId} />;
}
