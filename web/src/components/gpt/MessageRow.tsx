import React from "react";

interface MessageRowProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageRow({ role, content }: MessageRowProps) {
  const isUser = role === "user";
  return (
    <div className={`gpt-message-row ${isUser ? "gpt-message-row-user" : "gpt-message-row-assistant"}`}>
      <div className={`gpt-message-bubble ${isUser ? "gpt-message-bubble-user" : "gpt-message-bubble-assistant"}`}>
        <div>{content}</div>
      </div>
    </div>
  );
}
