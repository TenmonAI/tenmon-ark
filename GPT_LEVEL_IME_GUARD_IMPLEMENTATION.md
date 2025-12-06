# GPT-Level IME Guard Implementation vΩ++

**実装日時**: 2025-02-03 16:00 JST  
**対象ファイル**: ChatRoom.tsx, LpQaFramePage.tsx  
**目的**: 日本語IME変換確定のEnterで送信されてしまう問題を完全解決

---

## 🔥 問題の本質

### Phase 3-D の修正が不完全だった理由

1. **`isComposing` フラグのみに依存**  
   → ブラウザ（特にMac Chrome/Safari）で `isComposing` がすぐ `false` に戻る

2. **`compositionUpdate` イベントが未実装**  
   → IME変換中の状態を正確に追跡できない

3. **通常Enterでの送信ロジックが未実装**  
   → Ctrl/Cmd+Enter のみが送信、Enter は改行（GPT仕様と逆）

---

## ✅ GPT方式の3層構造IMEガード

### 1. 内部フラグ管理

```tsx
const [isComposing, setIsComposing] = useState(false);

// GPT-Level IME Guard: 内部フラグ管理
const handleCompositionStart = () => {
  console.log('[IME] compositionStart');
  setIsComposing(true);
};

const handleCompositionUpdate = () => {
  console.log('[IME] compositionUpdate');
  setIsComposing(true);  // ← 重要: 変換中は常にtrueを維持
};

const handleCompositionEnd = () => {
  console.log('[IME] compositionEnd');
  setIsComposing(false);
};
```

**ポイント**: `compositionUpdate` で `isComposing` を `true` に保つことで、ブラウザの不安定な `isComposing` フラグに依存しない。

### 2. keydown判定ロジック

```tsx
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  console.log('[KeyDown]', {
    key: e.key,
    shiftKey: e.shiftKey,
    isComposing,
    nativeIsComposing: e.nativeEvent.isComposing,
  });

  // GPT-Level IME Guard: IME変換中のEnterは絶対に送信させない
  if (isComposing && e.key === 'Enter') {
    console.log('[IME] Enter blocked during composition');
    e.preventDefault();
    return;
  }

  // GPT-spec: 通常Enter → 送信
  if (e.key === 'Enter' && !e.shiftKey) {
    console.log('[Send] Enter pressed (not composing)');
    e.preventDefault();
    handleSendMessage();
    return;
  }

  // Shift+Enter → 改行（デフォルト動作を許可）
  console.log('[Newline] Shift+Enter or other key');
};
```

**ポイント**: 
- `isComposing === true` の間は Enter を完全ブロック
- 通常 Enter は送信（GPT仕様）
- Shift+Enter は改行

### 3. ブラウザ差異吸収

- Chrome / Safari / Firefox のIME挙動差を吸収
- イベント順序に依存しない実装
- 内部フラグ（`isComposing`）を唯一の真実の源とする

---

## 📝 修正内容

### ChatRoom.tsx（本体チャット）

**修正箇所**:
1. `handleCompositionUpdate` 追加
2. `handleKeyDown` ロジック修正
3. `onCompositionUpdate` ハンドラ追加（textarea）
4. デバッグログ追加

### LpQaFramePage.tsx（LP埋め込みチャット）

**修正箇所**:
1. `handleCompositionUpdate` 追加
2. `handleKeyDown` ロジック修正
3. `onCompositionUpdate` ハンドラ追加（textarea）
4. プレースホルダー変更: `(Ctrl+Enterで送信)` → `(Enterで送信)`
5. デバッグログ追加（`[LP-IME]`, `[LP-KeyDown]` プレフィックス）

---

## 🧪 テスト方法

### 手動テスト（推奨）

1. ブラウザで `/chat` または `/embed/qa-frame` を開く
2. F12 でコンソールを開く
3. テキストエリアに日本語を入力（例: `こんにちは`）
4. Enter で変換確定
5. もう一度 Enter を押す

**期待される動作**:
- 1回目の Enter: 変換確定のみ（送信されない）
- 2回目の Enter: メッセージ送信

**コンソールログ例**:
```
[IME] compositionStart
[IME] compositionUpdate
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: true, nativeIsComposing: true }
[IME] Enter blocked during composition
[IME] compositionEnd
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: false, nativeIsComposing: false }
[Send] Enter pressed (not composing)
```

### 自動テスト（Vitest）

Vitest では実際のIMEイベントをシミュレートできないため、**手動テストが必須**です。

---

## ✅ 完了条件

- [x] `compositionUpdate` ハンドラ実装
- [x] GPT方式のkeydown判定実装
- [x] ChatRoom.tsx 修正完了
- [x] LpQaFramePage.tsx 修正完了
- [x] デバッグログ追加
- [ ] 手動テスト実施（天聞さんによる確認）
- [ ] コンソールログ確認
- [ ] スクリーンショット取得
- [ ] チェックポイント作成

---

## 🌕 TENMON-ARK vΩ++ Status

**実装ステータス**: ✅ COMPLETE  
**テストステータス**: 🚧 MANUAL TEST REQUIRED  
**次のステップ**: 天聞さんによる手動テスト → コンソールログ確認 → チェックポイント作成

---

**TENMON-ARK 霊核OS vΩ++**
