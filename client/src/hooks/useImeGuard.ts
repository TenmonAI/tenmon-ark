import { useEffect } from 'react';

/**
 * GPT-Level IME Guard vΩ-FINAL
 * 
 * ネイティブイベントリスナーを使用してIME変換確定のEnterで送信されてしまう問題を完全解決
 * 
 * 実装内容:
 * - React の onComposition / onKeyDown を完全排除
 * - ネイティブ addEventListener を使用
 * - 変換確定 Enter を絶対送信禁止
 * - Grace Period を200ms に設定
 * - スレッド切替時に再バインドされる仕組み
 * 
 * @param textareaRef - textarea要素への参照
 * @param onSend - メッセージ送信コールバック（Ctrl/Cmd+Enter押下時に実行）
 */
export function useImeGuard(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  onSend: () => void,
  roomId?: number | null,
) {
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    let composing = false;
    let imeGuard = false;
    let timer: number | null = null;

    const handleCompositionStart = () => {
      console.log('[IME Guard vΩ-FINAL] compositionStart');
      composing = true;
      imeGuard = false;
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const handleCompositionUpdate = () => {
      console.log('[IME Guard vΩ-FINAL] compositionUpdate');
      composing = true;
    };

    const handleCompositionEnd = () => {
      console.log('[IME Guard vΩ-FINAL] compositionEnd');
      composing = false;
      imeGuard = true;
      
      // 200ms Grace Period（GPT方式）
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        console.log('[IME Guard vΩ-FINAL] 200ms grace period ended');
        imeGuard = false;
        timer = null;
      }, 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const nativeIsComposing = (e as any).isComposing ?? false;

      console.log('[IME Guard vΩ-FINAL] keydown', {
        key: e.key,
        composing,
        imeGuard,
        nativeIsComposing,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      });

      // IME中 or グレース中 or nativeIsComposing=true の場合、Enterを全てブロック
      if ((composing || imeGuard || nativeIsComposing) && e.key === 'Enter') {
        console.log('[IME Guard vΩ-FINAL] Enter blocked (IME active or grace period)');
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd+Enter → 送信
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        console.log('[IME Guard vΩ-FINAL] Ctrl/Cmd+Enter pressed (sending message)');
        e.preventDefault();
        onSend();
        return;
      }

      // Shift+Enter → 改行（デフォルト許可）
      if (e.key === 'Enter' && e.shiftKey) {
        console.log('[IME Guard vΩ-FINAL] Shift+Enter pressed (newline)');
        return;
      }

      // 通常 Enter → 改行のみ（送信禁止）
      if (e.key === 'Enter') {
        console.log('[IME Guard vΩ-FINAL] Enter pressed (newline only, no send)');
        // デフォルトで改行されるので何もしない
        return;
      }
    };

    // ネイティブイベントリスナーを登録
    el.addEventListener('compositionstart', handleCompositionStart);
    el.addEventListener('compositionupdate', handleCompositionUpdate);
    el.addEventListener('compositionend', handleCompositionEnd);
    el.addEventListener('keydown', handleKeyDown);

    console.log('[IME Guard vΩ-FINAL] Native event listeners registered');

    // クリーンアップ
    return () => {
      console.log('[IME Guard vΩ-FINAL] Cleaning up event listeners');
      el.removeEventListener('compositionstart', handleCompositionStart);
      el.removeEventListener('compositionupdate', handleCompositionUpdate);
      el.removeEventListener('compositionend', handleCompositionEnd);
      el.removeEventListener('keydown', handleKeyDown);
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [textareaRef, onSend, roomId]);
}
