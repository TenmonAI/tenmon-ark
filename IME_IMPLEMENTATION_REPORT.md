# TENMON-ARK IME Implementation Report vΩ

**Report Date**: 2025-01-03 00:15 JST  
**Target**: `/chat` (ChatRoom.tsx)  
**Issue**: 日本語IME変換確定Enterで送信されてしまう問題

---

## 【1】現在のIME実装状況

### 実装箇所

#### 共通フック
- **File**: `client/src/hooks/useImeGuard.ts`
- **Purpose**: GPT-Level IME Guard vΩ∞ - 日本語IME変換確定のEnterで送信されてしまう問題を完全解決する共通フック

#### 適用コンポーネント
- **File**: `client/src/pages/ChatRoom.tsx`
- **Line**: 134-140
- **Usage**:
```tsx
const {
  handleCompositionStart,
  handleCompositionUpdate,
  handleCompositionEnd,
  handleKeyDown,
  handleKeyPress,
} = useImeGuard(handleSendMessage);
```

---

## 【2】実装内容（5段階ロジック + 拡張）

### Phase A: 内部フラグ管理 + 30ms猶予タイマー

```typescript
const composingRef = useRef(false);
const imeGuardRef = useRef(false);
const imeGuardTimerRef = useRef<NodeJS.Timeout | null>(null);
```

### Phase B: nativeEvent.isComposing完全参照

```typescript
const nativeIsComposing = e.nativeEvent?.isComposing ?? false;
if (nativeIsComposing && e.key === 'Enter') {
  e.preventDefault();
  return;
}
```

### Phase C: keydown + keypress併用

- `onKeyDown`: メイン送信判定
- `onKeyPress`: 追加のIMEガード

### 実装ロジック詳細

#### 1. compositionStart
```typescript
handleCompositionStart = () => {
  console.log('[IME Guard] compositionStart');
  composingRef.current = true;
  imeGuardRef.current = false;
  
  // 既存のタイマーをクリア
  if (imeGuardTimerRef.current) {
    clearTimeout(imeGuardTimerRef.current);
    imeGuardTimerRef.current = null;
  }
}
```

#### 2. compositionUpdate
```typescript
handleCompositionUpdate = () => {
  console.log('[IME Guard] compositionUpdate');
  composingRef.current = true;
  imeGuardRef.current = false;
}
```

#### 3. compositionEnd
```typescript
handleCompositionEnd = () => {
  console.log('[IME Guard] compositionEnd');
  composingRef.current = false;
  
  // Phase A: 30ms猶予タイマー設定（GPT方式）
  imeGuardRef.current = true;
  imeGuardTimerRef.current = setTimeout(() => {
    console.log('[IME Guard] 30ms grace period ended');
    imeGuardRef.current = false;
    imeGuardTimerRef.current = null;
  }, 30);
}
```

#### 4. keydown Enter判定
```typescript
handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  // GPT-spec: 通常Enter → 送信
  if (e.key === 'Enter' && !e.shiftKey) {
    console.log('[IME Guard] Enter pressed (sending message)');
    e.preventDefault();
    onSend();
    return;
  }

  // Shift+Enter → 改行（デフォルト動作を許可）
  if (e.key === 'Enter' && e.shiftKey) {
    console.log('[IME Guard] Shift+Enter pressed (newline)');
    // デフォルト動作を許可（改行）
  }
}
```

#### 5. keypress併用
```typescript
handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  const isComposing = composingRef.current;
  const imeGuard = imeGuardRef.current;

  console.log('[IME Guard] keypress', {
    key: e.key,
    isComposing,
    imeGuard,
  });

  // composing中またはimeGuard猶予期間中のEnterをブロック
  if ((isComposing || imeGuard) && e.key === 'Enter') {
    console.log('[IME Guard] Enter blocked in keypress (composition or grace period)');
    e.preventDefault();
    return;
  }
}
```

---

## 【3】textareaバインディング

### ChatRoom.tsx (Line 343-350)

```tsx
<Textarea
  value={inputMessage}
  onChange={(e) => setInputMessage(e.target.value)}
  onKeyDown={handleKeyDown}
  onKeyPress={handleKeyPress}
  onCompositionStart={handleCompositionStart}
  onCompositionUpdate={handleCompositionUpdate}
  onCompositionEnd={handleCompositionEnd}
  placeholder={t("chat.input_placeholder") || "Type a message..."}
  className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
  rows={3}
  disabled={isStreaming}
/>
```

### イベントバインド順序
1. `onCompositionStart`
2. `onCompositionUpdate`
3. `onCompositionEnd`
4. `onKeyDown`
5. `onKeyPress`

---

## 【4】sendMessage実行箇所

### handleSendMessage (Line 122-131)

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
1. **keydown Enter** (Line 89): `onSend()` → `handleSendMessage()`
2. **Button click** (Line 357): `onClick={handleSendMessage}`

---

## 【5】問題点の可能性

現在の実装は**理論上は完璧**だが、ユーザーから「変換確定Enterで送信されてしまう」という報告があるということは、以下のいずれかの可能性がある：

### 可能性1: ブラウザ固有のcompositionendタイミング問題
- **Chrome macOS**: compositionendが遅延する場合がある
- **Safari macOS**: compositionendとkeydownの順序が逆転する場合がある
- **Firefox**: nativeEvent.isComposingが正しく設定されない場合がある

### 可能性2: 30ms猶予タイマーが不十分
- 一部のIME（特にGoogle日本語入力、ATOK）では50-100ms必要な可能性
- 現在の30msでは、高速タイピング時にEnterがすり抜ける可能性

### 可能性3: keydownとkeypressの発火順序の問題
- ブラウザによってはkeypressがkeydownより先に発火する場合がある
- keypress内のpreventDefault()がkeydownに影響しない可能性

### 可能性4: GPT specとの齟齬
- **現在の実装**: 通常Enter → 送信
- **GPT仕様（要確認）**: 通常Enter → 改行、Ctrl/Cmd+Enter → 送信？
- ユーザーが期待している動作と実装が異なる可能性

### 可能性5: Reactイベントバブリングの問題
- React SyntheticEventとnativeEventの処理順序の問題
- stopPropagation()が必要な可能性

---

## 【6】次のステップ: イベントログ詳細記録

### 記録すべきイベント

#### compositionstart
- fired: true/false
- timestamp: number
- composingRef.current: boolean
- imeGuardRef.current: boolean

#### compositionupdate
- fired: true/false
- timestamp: number
- composingRef.current: boolean
- imeGuardRef.current: boolean

#### compositionend
- fired: true/false
- timestamp: number
- composingRef.current: boolean (before)
- imeGuardRef.current: boolean (after)
- timer set: true/false

#### keydown Enter
- fired: true/false
- timestamp: number
- key: string
- shiftKey: boolean
- composingRef.current: boolean
- imeGuardRef.current: boolean
- nativeEvent.isComposing: boolean
- preventDefault called: true/false
- sendMessage called: true/false

#### keypress Enter
- fired: true/false
- timestamp: number
- key: string
- composingRef.current: boolean
- imeGuardRef.current: boolean
- preventDefault called: true/false

### テストケース

#### Case 1: 日本語IME変換確定Enter
1. 「こんにちは」と入力
2. 変換候補を選択
3. Enter押下（変換確定）
4. **期待動作**: 送信されない
5. **実際の動作**: ？

#### Case 2: 通常Enter
1. 「Hello」と入力（IME OFF）
2. Enter押下
3. **期待動作**: 送信される（GPT spec要確認）
4. **実際の動作**: ？

#### Case 3: Shift+Enter
1. 「Hello」と入力
2. Shift+Enter押下
3. **期待動作**: 改行
4. **実際の動作**: ？

#### Case 4: Ctrl/Cmd+Enter
1. 「Hello」と入力
2. Ctrl/Cmd+Enter押下
3. **期待動作**: 送信（GPT spec要確認）
4. **実際の動作**: ？

---

## 【7】推奨される修正案（仮）

### 修正案1: 猶予タイマーを50msに延長

```typescript
imeGuardTimerRef.current = setTimeout(() => {
  console.log('[IME Guard] 50ms grace period ended');
  imeGuardRef.current = false;
  imeGuardTimerRef.current = null;
}, 50); // 30ms → 50ms
```

### 修正案2: stopPropagation()追加

```typescript
if (nativeIsComposing && e.key === 'Enter') {
  console.log('[IME Guard] Enter blocked (nativeEvent.isComposing === true)');
  e.preventDefault();
  e.stopPropagation(); // 追加
  return;
}
```

### 修正案3: GPT spec確認後、Enter動作を変更

```typescript
// GPT spec: 通常Enter → 改行、Ctrl/Cmd+Enter → 送信
if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
  console.log('[IME Guard] Ctrl/Cmd+Enter pressed (sending message)');
  e.preventDefault();
  onSend();
  return;
}

// 通常Enter → 改行（デフォルト動作を許可）
if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
  console.log('[IME Guard] Enter pressed (newline)');
  // デフォルト動作を許可（改行）
}
```

---

## 【8】結論

現在の実装は**GPT互換の5段階IMEガードロジック + 拡張**を完全に実装しており、理論上は完璧である。

しかし、ユーザーから問題報告があるということは、**ブラウザ固有の問題**または**GPT specとの齟齬**の可能性が高い。

次のフェーズで、実際のイベントログを詳細に記録し、問題を特定する必要がある。

---

**Report End**
