# トークルームタイトル自動生成が反映されない原因調査レポート

## 調査日時
2026-01-09

## 1. 現状確認

### 1-1. `src/App.tsx`
- ✅ `deriveTitle()` 関数が定義されている（4-21行目）
- ✅ `export { deriveTitle }` でエクスポートされている

### 1-2. `src/pages/Chat.tsx`
- ✅ `deriveTitle` をインポートしている（2行目）
- ✅ `threads` を `useState` で管理（12-18行目）
- ✅ `send()` 関数内でタイトル更新ロジックがある（28-39行目）
- ✅ `localStorage.setItem("tenmon_threads", ...)` で保存している（38行目）

### 1-3. `src/components/Sidebar.tsx`
- ❌ **問題発見**: threads を表示していない
- ❌ ハードコードされた「天聞アーク 研究構築」「天津金木 思考整理」のみ表示

## 2. 原因分析

### 2-1. タイトル更新ロジックの問題

**問題点1: タイトル更新のタイミング**
```typescript
// 28-39行目: タイトル更新
if (threads[activeId].title === "新しい会話") {
  const newTitle = deriveTitle(userMessage);
  const updatedThreads = { ...threads, [activeId]: { ...threads[activeId], title: newTitle } };
  setThreads(updatedThreads);
  localStorage.setItem("tenmon_threads", JSON.stringify(updatedThreads));
}

// 42-48行目: メッセージ更新（threads を上書き）
const updatedMessages = [...threads[activeId].messages, { role: "user", content: userMessage }];
setThreads({
  ...threads,  // ← ここで古い threads を参照している可能性
  [activeId]: {
    ...threads[activeId],
    messages: updatedMessages,
  },
});
```

**問題点2: React の状態更新の非同期性**
- `setThreads(updatedThreads)` の後、すぐに `setThreads` を再度呼び出している
- React の状態更新は非同期のため、2回目の `setThreads` が古い `threads` を参照している可能性がある
- 結果として、タイトル更新が上書きされる

**問題点3: Sidebar が threads を表示していない**
- `Sidebar.tsx` が threads を props で受け取っていない
- ハードコードされたタイトルのみ表示
- タイトルが更新されても UI に反映されない

### 2-2. localStorage の読み込み不足

- 初期化時に `localStorage` から threads を読み込んでいない
- ページリロード時に threads が失われる

## 3. 修正案

### 3-1. 最小パッチ（必須）

1. **タイトル更新とメッセージ更新を1つの `setThreads` に統合**
   - タイトル更新とメッセージ更新を同時に行う
   - `useState` の関数型更新を使用して、最新の状態を参照

2. **localStorage への保存を確実に**
   - タイトル更新時だけでなく、メッセージ更新時も保存
   - `useEffect` で threads の変更を監視して保存

3. **初期化時に localStorage から読み込み**
   - `useState` の初期値として `localStorage` から読み込む

### 3-2. 既存スレッド救済（推奨）

- `useEffect` で初回ロード時に「新しい会話」のままのスレッドをチェック
- messages がある場合は、最初のユーザーメッセージからタイトルを生成

### 3-3. Sidebar の修正（別途必要）

- `Sidebar.tsx` に threads を props で渡す
- threads の一覧を表示する

## 4. 修正実装

修正ファイル: `src/pages/Chat.tsx` のみ（最小パッチ）

