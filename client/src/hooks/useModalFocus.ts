/**
 * ============================================================
 *  USE MODAL FOCUS — Modal フォーカス管理フック
 * ============================================================
 */

import { useEffect, useRef } from "react";

/**
 * Modal表示時のフォーカス管理
 * - 背景スクロール禁止
 * - 元のフォーカス位置を記憶
 * - Modal閉じたら元の位置へ戻す
 */
export function useModalFocus(isOpen: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 元のフォーカス位置を記憶
      previousFocusRef.current = document.activeElement as HTMLElement;

      // 背景スクロール禁止
      document.body.style.overflow = "hidden";

      // Modal内の最初のフォーカス可能要素にフォーカス
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 0);
    } else {
      // 背景スクロール復元
      document.body.style.overflow = "";

      // 元のフォーカス位置へ戻す
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return { modalRef };
}

