import React, { useEffect, useRef } from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";

export function ChatLayout() {
  const { messages, sendMessage, loading, threadId } = useChat();
  const seedSent = useRef(false);

  // P3+A6: Auto-send SUKUYOU_SEED if present in sessionStorage.
  // A6: 表示用テキストとAPI送信用raw seedを分離。
  // ユーザーバブルには自然文サマリーのみ表示し、APIにはraw seedを送信。
  useEffect(() => {
    if (seedSent.current || !threadId) return;
    try {
      const rawSeed = sessionStorage.getItem("TENMON_SUKUYOU_SEED");
      if (rawSeed) {
        seedSent.current = true;
        const displayText = sessionStorage.getItem("TENMON_SUKUYOU_SEED_DISPLAY") || rawSeed;
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED");
        sessionStorage.removeItem("TENMON_SUKUYOU_SEED_DISPLAY");
        // P4: 深層チャット起動プロンプトも読み取る
        const deepPrompt = sessionStorage.getItem("TENMON_SUKUYOU_DEEP_PROMPT");
        sessionStorage.removeItem("TENMON_SUKUYOU_DEEP_PROMPT");
        // Use requestAnimationFrame + setTimeout to ensure React state is settled
        requestAnimationFrame(() => {
          setTimeout(() => {
            // A6: sendMessageに表示用テキストとAPI用ペイロードを分離して渡す
            sendMessage(rawSeed, displayText);
            // P4: seed送信後、応答を待ってから深層プロンプトを自動送信
            if (deepPrompt) {
              setTimeout(() => sendMessage(deepPrompt), 8000);
            }
          }, 500);
        });
      }
    } catch {}
  }, [threadId, sendMessage]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div
      className="gpt-chat-layout"
      data-chat-layout-bound="1"
      data-thread-id={threadId || ""}
    >
      {isEmpty ? (
        <EmptyState onSuggestion={(text) => sendMessage(text)} />
      ) : (
        <MessageList messages={messages} loading={loading} />
      )}
      <Composer onSend={sendMessage} loading={loading} />
    </div>
  );
}
