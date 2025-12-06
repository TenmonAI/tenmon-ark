import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImeGuard } from './useImeGuard';

/**
 * GPT-Level IME Guard vΩ∞ - 自動テスト (Phase E)
 * 
 * テスト内容:
 * 1. IME変換中のEnterが絶対に送信されない
 * 2. compositionend後30ms猶予期間中のEnterがブロックされる
 * 3. nativeEvent.isComposing === true のEnterがブロックされる
 * 4. 通常Enterで即送信
 * 5. Shift+Enterで改行
 * 6. keypress併用でIME Enterをブロック
 */

describe('useImeGuard - GPT-Level IME Guard vΩ∞', () => {
  let onSendMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSendMock = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ヘルパー関数: KeyboardEvent モック作成
  const createKeyboardEvent = (
    key: string,
    options: {
      shiftKey?: boolean;
      nativeIsComposing?: boolean;
    } = {}
  ): React.KeyboardEvent<HTMLTextAreaElement> => {
    const event = {
      key,
      shiftKey: options.shiftKey ?? false,
      nativeEvent: {
        isComposing: options.nativeIsComposing ?? false,
      },
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

    return event;
  };

  // ヘルパー関数: CompositionEvent モック作成
  const createCompositionEvent = (): React.CompositionEvent<HTMLTextAreaElement> => {
    return {} as React.CompositionEvent<HTMLTextAreaElement>;
  };

  it('[Test 1] IME変換中のEnterが絶対に送信されない', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // compositionStart
    act(() => {
      result.current.handleCompositionStart();
    });

    // IME変換中にEnter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 2] compositionend後30ms猶予期間中のEnterがブロックされる', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // compositionStart → compositionEnd
    act(() => {
      result.current.handleCompositionStart();
      result.current.handleCompositionEnd();
    });

    // 猶予期間中（30ms以内）にEnter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();

    // 30ms経過後にEnter押下
    act(() => {
      vi.advanceTimersByTime(30);
    });

    const enterEvent2 = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent2);
    });

    // 送信されることを確認
    expect(onSendMock).toHaveBeenCalledTimes(1);
    expect(enterEvent2.preventDefault).toHaveBeenCalled();
  });

  it('[Test 3] nativeEvent.isComposing === true のEnterがブロックされる', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // nativeEvent.isComposing === true のEnter押下
    const enterEvent = createKeyboardEvent('Enter', { nativeIsComposing: true });
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 4] 通常Enterで即送信', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // 通常Enter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されることを確認
    expect(onSendMock).toHaveBeenCalledTimes(1);
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 5] Shift+Enterで改行（送信されない）', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // Shift+Enter押下
    const enterEvent = createKeyboardEvent('Enter', { shiftKey: true });
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    // Shift+Enterはデフォルト動作を許可するため、preventDefault呼ばれない
    expect(enterEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('[Test 6] keypress併用でIME Enterをブロック', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // compositionStart
    act(() => {
      result.current.handleCompositionStart();
    });

    // keypress中にEnter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyPress(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 7] compositionUpdate中もIME Enterをブロック', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // compositionStart → compositionUpdate
    act(() => {
      result.current.handleCompositionStart();
      result.current.handleCompositionUpdate();
    });

    // IME変換中にEnter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 8] 複数回のcompositionStart/End後も正常動作', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // 1回目: compositionStart → compositionEnd → 猶予期間経過
    act(() => {
      result.current.handleCompositionStart();
      result.current.handleCompositionEnd();
      vi.advanceTimersByTime(30);
    });

    // 2回目: compositionStart → compositionEnd
    act(() => {
      result.current.handleCompositionStart();
      result.current.handleCompositionEnd();
    });

    // 猶予期間中にEnter押下
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されていないことを確認
    expect(onSendMock).not.toHaveBeenCalled();
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });

  it('[Test 9] cleanup関数でタイマーがクリアされる', () => {
    const { result } = renderHook(() => useImeGuard(onSendMock));

    // compositionEnd → cleanup (猶予タイマーをクリア)
    act(() => {
      result.current.handleCompositionEnd();
      result.current.cleanup();
    });

    // cleanup後はimeGuardが即座にfalseになるため、Enterで送信される
    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enterEvent);
    });

    // 送信されることを確認（cleanup後は猶予期間なし）
    expect(onSendMock).toHaveBeenCalledTimes(1);
    expect(enterEvent.preventDefault).toHaveBeenCalled();
  });
});
