import { useEffect } from "react";
import type { Message } from "../types/chat";
import { ChatMessage } from "./ChatMessage";

export function ChatWindow({ messages }: { messages: Message[] }) {
  useEffect(() => {
    const el = document.getElementById("chat-bottom");
    el?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 12,
        border: "1px solid #374151",
        borderRadius: 12,
        background: "#0b1220"
      }}
    >
      {messages.map((m, i) => (
        <ChatMessage key={i} message={m} />
      ))}
      <div id="chat-bottom" />
    </div>
  );
}
