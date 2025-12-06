import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";

/**
 * Streaming Message Component
 * リアルタイムで1文字ずつ表示（GPT同等）
 */

interface StreamingMessageProps {
  /** ストリーミング中のテキスト */
  content: string;
  /** ストリーミング完了フラグ */
  isComplete?: boolean;
  /** 表示速度（ミリ秒/文字） */
  speed?: number;
}

export function StreamingMessage({
  content,
  isComplete = false,
  speed = 20,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // ストリーミング完了時は即座に全文表示
  useEffect(() => {
    if (isComplete) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [isComplete, content]);

  // 1文字ずつ表示
  useEffect(() => {
    if (isComplete || currentIndex >= content.length) return;

    const timer = setTimeout(() => {
      setDisplayedContent(content.slice(0, currentIndex + 1));
      setCurrentIndex((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [content, currentIndex, isComplete, speed]);

  // contentが変更された場合（新しいチャンクが追加された場合）
  useEffect(() => {
    if (!isComplete && content.length > displayedContent.length) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [content, displayedContent.length, isComplete]);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <Streamdown>{displayedContent}</Streamdown>
      {!isComplete && (
        <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
      )}
    </div>
  );
}
