/**
 * ============================================================
 *  USE KEYBOARD NAVIGATION — キーボード操作フック
 * ============================================================
 */

import { useEffect, useRef } from "react";

interface UseKeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
}

/**
 * キーボード操作を統一管理するフック
 */
export function useKeyboardNavigation({
  onEscape,
  onEnter,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const handlersRef = useRef({ onEscape, onEnter });

  useEffect(() => {
    handlersRef.current = { onEscape, onEnter };
  }, [onEscape, onEnter]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc キー
      if (e.key === "Escape" && handlersRef.current.onEscape) {
        e.preventDefault();
        handlersRef.current.onEscape();
      }

      // Enter キー（Ctrl/Cmd+Enter は除く）
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && handlersRef.current.onEnter) {
        // IME変換中は無視
        if ((e as any).isComposing) return;
        handlersRef.current.onEnter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);
}

