import { useEffect, useRef, useState, useCallback } from "react";

/**
 * モバイル版スクロールオートフォーカス機能
 * ChatGPTモバイルと同等の挙動を実現
 * 
 * 仕様：
 * - 新しいメッセージがレンダリングされた瞬間に最下部へ自動スクロール
 * - スクロールは "smooth"（アニメーション有り）
 * - ユーザーが手動でスクロールしている最中は強制ジャンプしない
 * - 入力欄が開いたとき（キーボード表示時）も最新メッセージが見える位置へ補正
 */
export function useAutoScroll<T>(
  dependency: T,
  options: {
    enabled?: boolean;
    threshold?: number; // ユーザーが手動スクロールしていると判定する閾値（ピクセル）
  } = {}
) {
  const { enabled = true, threshold = 100 } = options;
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ユーザーが手動でスクロールしているかを検知
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 最下部から一定距離以上離れている場合は手動スクロール中と判定
    if (distanceFromBottom > threshold) {
      setIsUserScrolling(true);
    } else {
      setIsUserScrolling(false);
    }

    // スクロール停止を検知するためのタイムアウト
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      // スクロールが停止したら、最下部に近い場合は自動スクロールを再開
      if (distanceFromBottom <= threshold) {
        setIsUserScrolling(false);
      }
    }, 150);
  }, [threshold]);

  // 最下部へスクロール
  const scrollToBottom = useCallback(() => {
    if (!enabled || isUserScrolling) return;

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [enabled, isUserScrolling]);

  // メッセージが更新されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [dependency, scrollToBottom]);

  // キーボード表示時のスクロール補正（モバイル対応）
  useEffect(() => {
    const handleResize = () => {
      // キーボードが表示されたときにスクロール補正
      if (!isUserScrolling) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isUserScrolling, scrollToBottom]);

  return {
    bottomRef,
    containerRef,
    isUserScrolling,
    handleScroll,
    scrollToBottom,
  };
}
