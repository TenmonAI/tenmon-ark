import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { TYPEWRITER_SPEED, ALPHA_TRANSITION_DURATION } from "@/lib/mobileOS/alphaFlow";

/**
 * Streaming Message Component
 * リアルタイムで1文字ずつ表示（GPT同等）
 * alphaFlowと統合したスムーズなストリーミング
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
  speed = TYPEWRITER_SPEED,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // フェードインアニメーション
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // ストリーミング完了時は即座に全文表示
  useEffect(() => {
    if (isComplete) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [isComplete, content]);

  // スムーズなtoken streaming（途中改行・途中切断を防止）
  useEffect(() => {
    if (isComplete || currentIndex >= content.length) return;

    // 新しいチャンクが追加された場合は即座に更新（途中切断を防止）
    if (content.length > displayedContent.length) {
      // 最後の単語が途中で切れていないかチェック
      const lastChar = content[currentIndex];
      const isWordBoundary = lastChar === ' ' || lastChar === '\n' || lastChar === '.' || lastChar === '。';
      
      if (isWordBoundary || currentIndex === 0) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex((prev) => prev + 1);
      } else {
        // 単語の途中の場合は次の単語境界まで待つ
        const nextBoundary = content.indexOf(' ', currentIndex);
        if (nextBoundary !== -1 && nextBoundary < content.length) {
          setDisplayedContent(content.slice(0, nextBoundary + 1));
          setCurrentIndex(nextBoundary + 1);
        } else {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          setCurrentIndex((prev) => prev + 1);
        }
      }
    } else {
      // 通常の1文字ずつ表示
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [content, currentIndex, displayedContent.length, isComplete, speed]);

  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${ALPHA_TRANSITION_DURATION}ms ease-in-out`,
      }}
    >
      <Streamdown>{displayedContent}</Streamdown>
      {!isComplete && (
        <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
      )}
    </div>
  );
}
