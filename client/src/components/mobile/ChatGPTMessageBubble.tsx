import { Streamdown } from "streamdown";

/**
 * ChatGPT Mobile UI - メッセージバブル
 * - アシスト: 薄いグレー背景、丸角18px
 * - ユーザー: 青背景、白文字、丸角18px
 * - 行間: 1.6以上
 * - 余白: GPT同等のmargin/padding
 */

interface ChatGPTMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  userName?: string;
  isStreaming?: boolean;
}

export function ChatGPTMessageBubble({
  role,
  content,
  userName,
  isStreaming = false,
}: ChatGPTMessageBubbleProps) {
  const isUser = role === "user";
  const avatarText = isUser ? (userName?.[0] || "U") : "A";

  return (
    <div className={`chatgpt-message-bubble ${role}`}>
      <div className="chatgpt-message-avatar">{avatarText}</div>
      <div className="chatgpt-message-content">
        {isStreaming ? (
          <div className="chatgpt-streaming-content">
            <Streamdown>{content}</Streamdown>
            <span className="chatgpt-streaming-cursor">▊</span>
          </div>
        ) : (
          <Streamdown>{content}</Streamdown>
        )}
      </div>
    </div>
  );
}
