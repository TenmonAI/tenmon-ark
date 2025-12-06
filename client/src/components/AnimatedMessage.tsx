import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { getTypingSpeedMs } from "@/types/userSettings";

interface AnimatedMessageProps {
  content: string;
  isNew?: boolean;
  speed?: number;
}

/**
 * Animated Message Component
 * Displays message with typing animation (GPT-style)
 */
export function AnimatedMessage({ content, isNew = false, speed }: AnimatedMessageProps) {
  // ユーザー設定からタイピング速度を取得（speedが指定されていない場合）
  const typingSpeed = speed !== undefined ? speed : getTypingSpeedMs();
  const [displayedText, setDisplayedText] = useState(isNew ? "" : content);
  const [isAnimating, setIsAnimating] = useState(isNew);

  useEffect(() => {
    if (!isNew) {
      setDisplayedText(content);
      setIsAnimating(false);
      return;
    }

    let i = 0;
    setDisplayedText("");
    setIsAnimating(true);

    const interval = setInterval(() => {
      if (i < content.length) {
        setDisplayedText(content.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [content, isNew, typingSpeed]);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <Streamdown>{displayedText}</Streamdown>
      {isAnimating ? <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse" /> : null}
    </div>
  );
}
