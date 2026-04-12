import React from "react";
import { ChatLayout } from "../components/gpt/ChatLayout";

/** Chat 画面: ChatPage ロジックは ChatLayout 内の useChat で保持。GPT シェルに差す。 */
export function ChatRoute({ initialMode }: { initialMode?: string }) {
  return <ChatLayout initialMode={initialMode} />;
}
