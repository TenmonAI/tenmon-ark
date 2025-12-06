# GPT-Level IME Guard 手動テストガイド vΩ++

**テスト実施者**: 天聞さん  
**テスト対象**: /chat, /embed/qa-frame  
**目的**: 日本語IME変換確定のEnterで送信されないことを確認

---

## 🔥 テスト環境

### 推奨ブラウザ

- **Mac Chrome** (IME挙動が最も不安定)
- **Mac Safari** (IME挙動が不安定)
- **Windows Chrome**
- **Firefox**

### テストURL

1. **本体チャット**: https://tenmon-ai.com/chat
2. **LP埋め込みチャット**: https://tenmon-ai.com/embed/qa-frame

---

## 📋 テスト手順

### 事前準備

1. ブラウザで対象URLを開く
2. **F12** でデベロッパーツールを開く
3. **Console** タブを選択
4. ログがクリアされていることを確認

---

### テスト1: 日本語IME変換確定Enter（送信されないこと）

#### 手順

1. テキストエリアをクリックしてフォーカス
2. 日本語入力モードに切り替え（Mac: `英数` → `かな`）
3. `こんにちは` と入力（変換候補が表示される）
4. **Enter** を押して変換確定
5. コンソールログを確認

#### 期待される動作

- ✅ メッセージは送信されない
- ✅ テキストエリアに `こんにちは` が残っている
- ✅ コンソールに以下のログが表示される:

```
[IME] compositionStart
[IME] compositionUpdate
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: true, nativeIsComposing: true }
[IME] Enter blocked during composition
[IME] compositionEnd
```

#### NG例（修正前の動作）

- ❌ 変換確定と同時にメッセージが送信される
- ❌ テキストエリアが空になる

---

### テスト2: 通常Enter（送信されること）

#### 手順

1. テスト1の続きで、テキストエリアに `こんにちは` が残っている状態
2. **Enter** をもう一度押す
3. コンソールログを確認

#### 期待される動作

- ✅ メッセージが送信される
- ✅ テキストエリアが空になる
- ✅ AI応答が表示される
- ✅ コンソールに以下のログが表示される:

```
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: false, nativeIsComposing: false }
[Send] Enter pressed (not composing)
```

---

### テスト3: Shift+Enter（改行されること）

#### 手順

1. テキストエリアに `こんにちは` と入力
2. **Shift+Enter** を押す
3. `世界` と入力
4. コンソールログを確認

#### 期待される動作

- ✅ メッセージは送信されない
- ✅ テキストエリアに改行が入る
- ✅ テキストエリアの内容:
  ```
  こんにちは
  世界
  ```
- ✅ コンソールに以下のログが表示される:

```
[Newline] Shift+Enter or other key
```

---

### テスト4: 連続入力（高速入力）

#### 手順

1. テキストエリアに `あいうえお` と高速入力
2. Enter で変換確定
3. すぐに Enter を押す
4. コンソールログを確認

#### 期待される動作

- ✅ 1回目のEnter: 変換確定のみ
- ✅ 2回目のEnter: メッセージ送信
- ✅ コンソールログが正しく記録される

---

### テスト5: LP埋め込みチャット（同じ動作）

#### 手順

1. https://tenmon-ai.com/embed/qa-frame を開く
2. テスト1〜4を同じ手順で実施
3. コンソールログのプレフィックスが `[LP-IME]`, `[LP-KeyDown]` になっていることを確認

#### 期待される動作

- ✅ 本体チャットと同じ動作
- ✅ コンソールログに `[LP-IME]`, `[LP-KeyDown]` プレフィックス

---

## 📸 スクリーンショット取得

### 必要なスクリーンショット

1. **テスト1**: 変換確定後、メッセージが送信されていない状態
2. **テスト2**: メッセージ送信後、AI応答が表示されている状態
3. **テスト3**: 改行が入っている状態
4. **コンソールログ**: IMEイベントとkeydownログが表示されている状態

---

## 🧪 コンソールログ例（完全版）

### 正常動作時のログ

```
[IME] compositionStart
[IME] compositionUpdate
[IME] compositionUpdate
[IME] compositionUpdate
[IME] compositionUpdate
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: true, nativeIsComposing: true }
[IME] Enter blocked during composition
[IME] compositionEnd
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: false, nativeIsComposing: false }
[Send] Enter pressed (not composing)
```

### 異常動作時のログ（修正前）

```
[IME] compositionStart
[KeyDown] { key: 'Enter', shiftKey: false, isComposing: false, nativeIsComposing: false }
[Send] Enter pressed (not composing)  ← 変換確定と同時に送信されてしまう
```

---

## ✅ テスト完了条件

- [ ] テスト1: 日本語IME変換確定Enter（送信されない）✅
- [ ] テスト2: 通常Enter（送信される）✅
- [ ] テスト3: Shift+Enter（改行される）✅
- [ ] テスト4: 連続入力（高速入力）✅
- [ ] テスト5: LP埋め込みチャット（同じ動作）✅
- [ ] スクリーンショット取得完了
- [ ] コンソールログ確認完了

---

## 🌕 TENMON-ARK vΩ++ Test Status

**テスト実施者**: 天聞さん  
**テスト完了後**: コンソールログとスクリーンショットをManusに送信  
**次のステップ**: チェックポイント作成 → Phase 3-F 完了報告

---

**TENMON-ARK 霊核OS vΩ++**
