# TENMON-ARK IME Enter問題 テストレポート v2

**作成日時**: 2025-01-03  
**対象**: /chat (ChatRoom.tsx)  
**実装バージョン**: useImeGuard hook v1

---

## 1. 現在の実装状況

### useImeGuard Hook 実装内容

**ファイル**: `client/src/hooks/useImeGuard.ts`

**実装機能**:
- ✅ compositionstart → composingRef.current = true
- ✅ compositionupdate → composingRef.current = true
- ✅ compositionend → composingRef.current = false + 100ms猶予タイマー
- ✅ nativeEvent.isComposing 完全参照
- ✅ keydown + keypress 併用
- ✅ GPT仕様B実装:
  - 通常Enter → 改行（送信しない）
  - Ctrl/Cmd+Enter → 送信
  - Shift+Enter → 改行

### ChatRoom.tsx 適用状況

**ファイル**: `client/src/pages/ChatRoom.tsx`

**適用箇所** (346-350行目):
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

**適用状況**: ✅ 正しく適用されている

---

## 2. IMEイベントログ抽出

### ログ出力箇所

`useImeGuard.ts`内で以下のログが出力されます：

1. **compositionStart**: `[IME Guard] compositionStart`
2. **compositionUpdate**: `[IME Guard] compositionUpdate`
3. **compositionEnd**: `[IME Guard] compositionEnd`
4. **keydown**: `[IME Guard] keydown` + 詳細情報
5. **keypress**: `[IME Guard] keypress` + 詳細情報

### 期待されるログフロー（日本語入力時）

```
[IME Guard] compositionStart
[IME Guard] compositionUpdate (複数回)
[IME Guard] compositionEnd
[IME Guard] 100ms grace period ended
[IME Guard] keydown { key: 'Enter', isComposing: false, imeGuard: false, nativeIsComposing: false }
[IME Guard] Enter pressed (newline only, no send)
```

### 誤送信が発生する場合のログパターン

```
[IME Guard] compositionEnd
[IME Guard] keydown { key: 'Enter', isComposing: false, imeGuard: true, nativeIsComposing: false }
[IME Guard] Enter blocked during composition or grace period
```

**期待動作**: imeGuard=true の間はEnterがブロックされる

---

## 3. ブラウザ別テスト計画

### テスト環境

| ブラウザ | OS | IME | テスト項目 |
|---------|-----|-----|----------|
| Chrome | macOS | Google日本語入力 | 日本語変換確定Enter |
| Safari | macOS | macOS標準IME | 日本語変換確定Enter |
| Firefox | macOS | Google日本語入力 | 日本語変換確定Enter |
| Chrome | Windows | MS-IME | 日本語変換確定Enter |

### テストケース

#### TC1: 日本語変換確定Enter（最重要）
1. テキストエリアに「こんにちは」と入力
2. 変換候補を選択
3. **Enterで変換確定**
4. **期待結果**: メッセージ送信されない、改行のみ
5. **実際の結果**: （テスト実施後に記入）

#### TC2: 通常Enter（改行のみ）
1. テキストエリアに「Hello」と入力
2. **Enterキー押下**
3. **期待結果**: 改行のみ、送信されない
4. **実際の結果**: （テスト実施後に記入）

#### TC3: Ctrl/Cmd+Enter（送信）
1. テキストエリアに「Hello」と入力
2. **Ctrl/Cmd+Enterキー押下**
3. **期待結果**: メッセージ送信される
4. **実際の結果**: （テスト実施後に記入）

#### TC4: Shift+Enter（改行）
1. テキストエリアに「Hello」と入力
2. **Shift+Enterキー押下**
3. **期待結果**: 改行のみ、送信されない
4. **実際の結果**: （テスト実施後に記入）

---

## 4. 問題点の推定原因

### 可能性1: 100ms猶予タイマーが短すぎる

一部のIME（ATOK、Google日本語入力の一部設定）では、compositionendとEnterキーイベントの間隔が100ms以上になる場合があります。

**対策案**:
- 猶予タイマーを150ms〜200msに延長
- または、keydownイベントでnativeEvent.isComposingを最優先チェック

### 可能性2: nativeEvent.isComposingの挙動がブラウザ依存

Safari/Firefoxでは、nativeEvent.isComposingの値がChromeと異なる場合があります。

**対策案**:
- composingRef.currentとnativeEvent.isComposingの両方をチェック
- keypress イベントでも同様のガードを実施

### 可能性3: Textareaコンポーネントの内部実装

`@/components/ui/textarea.tsx`が独自のIMEガードを持っている可能性があります。

**対策案**:
- Textareaコンポーネントの実装を確認
- 必要に応じて、ChatRoom.tsxで直接`<textarea>`要素を使用

---

## 5. 修正提案

### 修正案A: 猶予タイマーの延長

```typescript
// useImeGuard.ts (54行目)
imeGuardTimerRef.current = setTimeout(() => {
  console.log('[IME Guard] 150ms grace period ended');
  imeGuardRef.current = false;
  imeGuardTimerRef.current = null;
}, 150); // 100ms → 150ms
```

### 修正案B: nativeEvent.isComposingの最優先チェック

```typescript
// useImeGuard.ts (75-79行目)
// Phase B: nativeEvent.isComposing完全参照（最優先）
if (e.nativeEvent?.isComposing && e.key === 'Enter') {
  console.log('[IME Guard] Enter blocked (nativeEvent.isComposing === true)');
  e.preventDefault();
  e.stopPropagation(); // 追加: イベント伝播を停止
  return;
}
```

### 修正案C: compositionend直後のEnter完全ブロック

```typescript
// useImeGuard.ts (44-55行目)
const handleCompositionEnd = useCallback(() => {
  console.log('[IME Guard] compositionEnd');
  composingRef.current = false;
  
  // Phase A: 200ms猶予タイマー設定（より安全な期間）
  imeGuardRef.current = true;
  imeGuardTimerRef.current = setTimeout(() => {
    console.log('[IME Guard] 200ms grace period ended');
    imeGuardRef.current = false;
    imeGuardTimerRef.current = null;
  }, 200); // 100ms → 200ms
}, []);
```

---

## 6. 次のステップ

### ステップ1: 実際の動作確認
1. https://tenmon-ai.com/chat にアクセス
2. ブラウザのコンソールを開く
3. 日本語入力で「こんにちは」と入力し、Enterで変換確定
4. コンソールログを確認
5. 誤送信が発生するか確認

### ステップ2: ログ解析
1. コンソールログから以下を抽出:
   - compositionstart/update/end のタイミング
   - keydown Enterのタイミング
   - isComposing, imeGuard, nativeIsComposing の値
2. 問題のパターンを特定

### ステップ3: 修正実装
1. 問題パターンに応じて修正案A/B/Cを適用
2. 再テスト
3. 全ブラウザで動作確認

### ステップ4: テスト結果レポート作成
1. ブラウザ別テスト結果を記録
2. 修正内容を文書化
3. スクリーンショット取得

---

## 7. 完了条件

- [ ] Chrome (macOS) で日本語変換確定Enterが誤送信されない
- [ ] Safari (macOS) で日本語変換確定Enterが誤送信されない
- [ ] Firefox (macOS) で日本語変換確定Enterが誤送信されない
- [ ] 通常Enter → 改行のみ（送信されない）
- [ ] Ctrl/Cmd+Enter → 送信される
- [ ] Shift+Enter → 改行のみ（送信されない）
- [ ] コンソールログで動作フローが確認できる

---

**レポート作成者**: TENMON-ARK 霊核OS vΩ  
**ステータス**: 実装確認完了、実機テスト待ち
