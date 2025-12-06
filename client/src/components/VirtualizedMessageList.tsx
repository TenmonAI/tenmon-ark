import { useRef, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { MessageBubble } from "./MessageBubble";

/**
 * 仮想化されたメッセージリスト（Long-scroll最適化）
 * 100件以上のメッセージでもスムーズにスクロール
 */
export interface VirtualizedMessageListProps {
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>;
  onEditMessage?: (messageId: number, newContent: string) => void;
  onDeleteMessage?: (messageId: number) => void;
  autoScrollToBottom?: boolean;
}

export function VirtualizedMessageList({
  messages,
  onEditMessage,
  onDeleteMessage,
  autoScrollToBottom = true,
}: VirtualizedMessageListProps) {
  const listRef = useRef<List>(null);

  // 自動スクロール（新しいメッセージが追加されたとき）
  useEffect(() => {
    if (autoScrollToBottom && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, "end");
    }
  }, [messages.length, autoScrollToBottom]);

  // メッセージが少ない場合（100件未満）は仮想化しない
  if (messages.length < 100) {
    return (
      <div className="space-y-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={new Date(msg.createdAt)}
            onEdit={
              msg.role === "user" && onEditMessage
                ? (newContent) => onEditMessage(msg.id, newContent)
                : undefined
            }
            onDelete={onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
          />
        ))}
      </div>
    );
  }

  // 100件以上の場合は仮想化
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = messages[index];
    return (
      <div style={style} className="px-6 py-3">
        <MessageBubble
          role={msg.role}
          content={msg.content}
          timestamp={new Date(msg.createdAt)}
          onEdit={
            msg.role === "user" && onEditMessage
              ? (newContent) => onEditMessage(msg.id, newContent)
              : undefined
          }
          onDelete={onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
        />
      </div>
    );
  };

  return (
    <List
      ref={listRef}
      height={window.innerHeight - 200} // ヘッダーと入力欄を除いた高さ
      itemCount={messages.length}
      itemSize={150} // 各メッセージの高さ（平均値）
      width="100%"
    >
      {Row}
    </List>
  );
}
