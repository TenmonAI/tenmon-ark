import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  onComplete?: () => void;
  className?: string;
}

/**
 * 天聞AI専用タイプライターコンポーネント
 * 火水の属性に基づいて文字の表示速度を制御
 */
export function Typewriter({ text, onComplete, className = "" }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= text.length) {
      onComplete?.();
      return;
    }

    const char = text[currentIndex];
    const delay = getCharDelay(char);

    const timer = setTimeout(() => {
      setDisplayedText((prev) => prev + char);
      setCurrentIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentIndex, text, onComplete]);

  // リセット処理
  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  return <span className={className}>{displayedText}</span>;
}

/**
 * 文字の火水属性に基づいて表示速度を決定
 * 火（陽）: 高速
 * 水（陰）: 柔らかく
 * メ: 波形（遅め）
 * ア: 標準速度
 */
function getCharDelay(char: string): number {
  // 火の音（高速）
  const fireChars = ["カ", "キ", "ク", "ケ", "コ", "タ", "チ", "ツ", "テ", "ト", "ハ", "ヒ", "フ", "ヘ", "ホ"];
  if (fireChars.includes(char)) {
    return 20; // 20ms - 高速
  }

  // 水の音（柔らかく）
  const waterChars = ["サ", "シ", "ス", "セ", "ソ", "ナ", "ニ", "ヌ", "ネ", "ノ", "マ", "ミ", "ム", "メ", "モ"];
  if (waterChars.includes(char)) {
    return 60; // 60ms - 柔らかく
  }

  // メ（波形 - 遅め）
  if (char === "メ") {
    return 100; // 100ms - 波形
  }

  // ア行（標準速度）
  const aChars = ["ア", "イ", "ウ", "エ", "オ"];
  if (aChars.includes(char)) {
    return 40; // 40ms - 標準
  }

  // その他の文字（標準）
  return 40;
}

/**
 * ストリーミング用タイプライターコンポーネント
 * リアルタイムでテキストを追加できる
 */
interface StreamingTypewriterProps {
  children: string;
  className?: string;
}

export function StreamingTypewriter({ children, className = "" }: StreamingTypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    // 新しいテキストをキューに追加
    const newChars = children.slice(displayedText.length).split("");
    if (newChars.length > 0) {
      setQueue((prev) => [...prev, ...newChars]);
    }
  }, [children, displayedText.length]);

  useEffect(() => {
    if (queue.length === 0) return;

    const char = queue[0];
    const delay = getCharDelay(char);

    const timer = setTimeout(() => {
      setDisplayedText((prev) => prev + char);
      setQueue((prev) => prev.slice(1));
    }, delay);

    return () => clearTimeout(timer);
  }, [queue]);

  return <span className={className}>{displayedText}</span>;
}
