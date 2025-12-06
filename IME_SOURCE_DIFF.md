# TENMON-ARK IME Guard Source Diff vΩ-ULTIMATE

**Diff Date**: 2025-01-03 00:50 JST  
**Target Files**: 
- `client/src/hooks/useImeGuard.ts`
- `client/src/pages/ChatRoom.tsx`

---

## useImeGuard.ts - 修正前後の比較

### compositionEnd（猶予タイマー）

#### 修正前（30ms猶予）
```typescript
// compositionEnd: IME変換確定
const handleCompositionEnd = useCallback(() => {
  console.log('[IME Guard] compositionEnd');
  composingRef.current = false;
  
  // Phase A: 30ms猶予タイマー設定（GPT方式）
  imeGuardRef.current = true;
  imeGuardTimerRef.current = setTimeout(() => {
    console.log('[IME Guard] 30ms grace period ended');
    imeGuardRef.current = false;
    imeGuardTimerRef.current = null;
  }, 30); // ← 30ms
}, []);
```

#### 修正後（100ms猶予）
```typescript
// compositionEnd: IME変換確定
const handleCompositionEnd = useCallback(() => {
  console.log('[IME Guard] compositionEnd');
  composingRef.current = false;
  
  // Phase A: 100ms猶予タイマー設定（GPT方式、Google日本語入力/ATOK対応）
  imeGuardRef.current = true;
  imeGuardTimerRef.current = setTimeout(() => {
    console.log('[IME Guard] 100ms grace period ended');
    imeGuardRef.current = false;
    imeGuardTimerRef.current = null;
  }, 100); // ← 100ms
}, []);
```

**変更点**: 30ms → 100ms（Google日本語入力、ATOK対応）

---

### handleKeyDown（Enter送信判定）

#### 修正前（GPT仕様A: 通常Enter=送信）
```typescript
// keydown: Enter送信判定（Phase B: nativeEvent.isComposing参照）
const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  const isComposing = composingRef.current;
  const imeGuard = imeGuardRef.current;
  const nativeIsComposing = e.nativeEvent?.isComposing ?? false;

  console.log('[IME Guard] keydown', {
    key: e.key,
    shiftKey: e.shiftKey,
    isComposing,
    imeGuard,
    nativeIsComposing,
  });

  // Phase B: nativeEvent.isComposing完全参照
  if (nativeIsComposing && e.key === 'Enter') {
    console.log('[IME Guard] Enter blocked (nativeEvent.isComposing === true)');
    e.preventDefault();
    return;
  }

  // Phase A: composing中またはimeGuard猶予期間中のEnterをブロック
  if ((isComposing || imeGuard) && e.key === 'Enter') {
    console.log('[IME Guard] Enter blocked during composition or grace period');
    e.preventDefault();
    return;
  }

  // GPT-spec: 通常Enter → 送信 ← ここが問題
  if (e.key === 'Enter' && !e.shiftKey) {
    console.log('[IME Guard] Enter pressed (sending message)');
    e.preventDefault();
    onSend(); // ← 誤送信の原因
    return;
  }

  // Shift+Enter → 改行（デフォルト動作を許可）
  if (e.key === 'Enter' && e.shiftKey) {
    console.log('[IME Guard] Shift+Enter pressed (newline)');
    // デフォルト動作を許可（改行）
  }
}, [onSend]);
```

#### 修正後（GPT仕様B: 通常Enter=改行、Ctrl/Cmd+Enter=送信）
```typescript
// keydown: Enter送信判定（Phase B: nativeEvent.isComposing参照）
// GPT仕様B: 通常Enter→改行、Ctrl/Cmd+Enter→送信
const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  const isComposing = composingRef.current;
  const imeGuard = imeGuardRef.current;
  const nativeIsComposing = e.nativeEvent?.isComposing ?? false;

  console.log('[IME Guard] keydown', {
    key: e.key,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey, // ← 追加
    metaKey: e.metaKey, // ← 追加
    isComposing,
    imeGuard,
    nativeIsComposing,
  });

  // Phase B: nativeEvent.isComposing完全参照
  if (nativeIsComposing && e.key === 'Enter') {
    console.log('[IME Guard] Enter blocked (nativeEvent.isComposing === true)');
    e.preventDefault();
    return;
  }

  // Phase A: composing中またはimeGuard猶予期間中のEnterをブロック
  if ((isComposing || imeGuard) && e.key === 'Enter') {
    console.log('[IME Guard] Enter blocked during composition or grace period');
    e.preventDefault();
    return;
  }

  // GPT仕様B: Ctrl/Cmd+Enter → 送信 ← 送信トリガー変更
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    console.log('[IME Guard] Ctrl/Cmd+Enter pressed (sending message)');
    e.preventDefault();
    onSend();
    return;
  }

  // GPT仕様B: 通常Enter → 改行（送信しない） ← 誤送信防止
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    console.log('[IME Guard] Enter pressed (newline only, no send)');
    // デフォルト動作を許可（改行のみ） ← 送信しない
    return;
  }

  // Shift+Enter → 改行（デフォルト動作を許可）
  if (e.key === 'Enter' && e.shiftKey) {
    console.log('[IME Guard] Shift+Enter pressed (newline)');
    // デフォルト動作を許可（改行）
  }
}, [onSend]);
```

**変更点**:
1. **通常Enter動作**: 送信 → 改行のみ
2. **送信トリガー**: 通常Enter → Ctrl/Cmd+Enter
3. **ログ追加**: ctrlKey, metaKey を追加

---

## ChatRoom.tsx - textareaバインディング

### 現在のバインディング（変更なし）

```typescript
<Textarea
  value={inputMessage}
  onChange={(e) => setInputMessage(e.target.value)}
  onKeyDown={handleKeyDown}           // ← useImeGuardから取得
  onKeyPress={handleKeyPress}         // ← useImeGuardから取得
  onCompositionStart={handleCompositionStart} // ← useImeGuardから取得
  onCompositionUpdate={handleCompositionUpdate} // ← useImeGuardから取得
  onCompositionEnd={handleCompositionEnd}    // ← useImeGuardから取得
  placeholder={t("chat.input_placeholder") || "Type a message..."}
  className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
  rows={3}
  disabled={isStreaming}
/>
```

**イベントバインド順序**:
1. `onCompositionStart`
2. `onCompositionUpdate`
3. `onCompositionEnd`
4. `onKeyDown`
5. `onKeyPress`

---

## sendMessageバインディング

### handleSendMessage関数（変更なし）

```typescript
const handleSendMessage = () => {
  if (!inputMessage.trim()) return;

  setErrorMessage(null);
  sendStreamingMessage({
    roomId: currentRoomId || undefined,
    message: inputMessage.trim(),
    language: i18n.language,
  });
};
```

### 実行トリガー

#### 修正前（GPT仕様A）
- **通常Enter**: handleKeyDown内で `onSend()` → `handleSendMessage()`
- **Button click**: `onClick={handleSendMessage}`

#### 修正後（GPT仕様B）
- **Ctrl/Cmd+Enter**: handleKeyDown内で `onSend()` → `handleSendMessage()`
- **Button click**: `onClick={handleSendMessage}`
- **通常Enter**: 改行のみ（送信しない）

---

## 修正サマリー

### 変更ファイル
- `client/src/hooks/useImeGuard.ts`

### 変更内容
1. **猶予タイマー延長**: 30ms → 100ms
2. **通常Enter動作変更**: 送信 → 改行のみ
3. **送信トリガー変更**: 通常Enter → Ctrl/Cmd+Enter
4. **ログ強化**: ctrlKey, metaKey を追加

### 影響範囲
- ✅ `/chat` (ChatRoom.tsx) - useImeGuardを使用
- ⚠️ `/embed/qa-frame` (LpQaWidget.tsx) - 同様の修正が必要

---

**Diff End**
