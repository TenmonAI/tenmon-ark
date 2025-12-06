# LPチャット破損診断レポート

**作成日**: 2025-12-03  
**プロジェクト**: OS TENMON-AI v2  
**診断対象**: LPチャット（Landing Page Q&A Widget）

---

## 🔥 結論：破損の根本原因

LPチャットの現在のエラーは **「useImeGuardフックの構造的不整合」** が原因です。

### エラーの詳細

```
Cannot destructure property 'handleCompositionStart' of 'useImeGuard(...)' as it is undefined
```

このエラーは、LpQaWidget.tsx の263-274行目で発生しています。

---

## 🟥【1】LPチャットの Textarea コンポーネントの実際のコード

### 問題箇所の特定

**ファイル**: `/home/ubuntu/os-tenmon-ai-v2/client/src/pages/embed/LpQaWidget.tsx`

**行番号**: 263-274行目

```typescript
// ✅ IME Guard適用（GPT仕様B: 通常Enter→改行、Ctrl/Cmd+Enter→送信）
const {
  handleCompositionStart,
  handleCompositionUpdate,
  handleCompositionEnd,
  handleKeyDown: imeHandleKeyDown,
  handleKeyPress,
} = useImeGuard(() => {
  // Ctrl/Cmd+Enterで送信
  if (message.trim()) {
    handleSubmit(new Event('submit') as any);
  }
});
```

### 問題点の分析

1. **useImeGuardの呼び出し方が間違っている**
   - 現在の実装: `useImeGuard(callback)`
   - 正しい実装: `useImeGuard(textareaRef, onSend, roomId?)`

2. **useImeGuardは値を返さない**
   - useImeGuardフックは `void` を返す（useEffect内でネイティブイベントリスナーを登録するだけ）
   - LpQaWidget.tsxは返り値からハンドラー関数を分割代入しようとしている
   - これが `undefined` エラーの直接的な原因

3. **Textareaへの適用方法が誤っている**
   - 342-349行目で、存在しないハンドラー関数をTextareaに渡している
   ```typescript
   <Textarea
     value={message}
     onChange={(e) => setMessage(e.target.value)}
     onKeyDown={imeHandleKeyDown}        // ← undefined
     onKeyPress={handleKeyPress}         // ← undefined
     onCompositionStart={handleCompositionStart}  // ← undefined
     onCompositionUpdate={handleCompositionUpdate} // ← undefined
     onCompositionEnd={handleCompositionEnd}      // ← undefined
     ...
   />
   ```

---

## 🟥【2】LPチャットの useEffect / useHook の発火順序ログ

### コンポーネントツリーと初期化順序

1. **LpQaWidget マウント** (74行目)
   - `console.log('[LP-QA DEBUG] LpQaWidget component mounted')`

2. **sessionId 初期化** (89-93行目)
   - `useState(() => getOrCreateSessionId())`
   - localStorageから既存のsessionIdを取得、または新規作成

3. **会話履歴の復元** (105-140行目)
   - `useEffect(() => { ... }, [])`
   - localStorageから会話履歴を読み込み

4. **useImeGuardの呼び出し** (263-274行目)
   - **ここでエラーが発生**
   - useImeGuardは値を返さないため、分割代入が失敗

### エラー発生タイミング

コンポーネントの初期レンダリング時、263行目の分割代入の時点で即座にエラーが発生します。これにより、以下の処理が実行されません：

- Textareaのレンダリング
- フォームの表示
- 会話履歴の表示

---

## 🟥【3】useImeGuard の依存配列が LP に影響している箇所

### useImeGuardの実装分析

**ファイル**: `/home/ubuntu/os-tenmon-ai-v2/client/src/hooks/useImeGuard.ts`

**関数シグネチャ**:
```typescript
export function useImeGuard(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  onSend: () => void,
  roomId?: number | null,
)
```

**返り値**: なし（void）

### LPチャットでの誤用

LpQaWidget.tsxは以下の問題を抱えています：

1. **textareaRefを渡していない**
   - useImeGuardは第1引数としてtextareaRefを要求
   - LpQaWidget.tsxはコールバック関数のみを渡している

2. **返り値を期待している**
   - useImeGuardは副作用のみを持つフック（useEffectを使用）
   - 返り値は存在しないため、分割代入は失敗する

3. **Reactのイベントハンドラーとネイティブイベントの混在**
   - useImeGuardはネイティブaddEventListenerを使用
   - LpQaWidget.tsxはReactのonKeyDown、onCompositionStartなどを使用
   - この2つのアプローチは互いに排他的

### 本体チャットとの構造的差異

**本体チャット（ChatRoom.tsx）の正しい実装**:
```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null);

useImeGuard(textareaRef, handleSend, currentRoomId);

// Textareaには何もバインドしない（ネイティブイベントリスナーが処理）
<textarea ref={textareaRef} ... />
```

**LPチャット（LpQaWidget.tsx）の誤った実装**:
```typescript
// textareaRefを作成していない
const { ... } = useImeGuard(() => { ... }); // 間違った呼び出し方

// 存在しないハンドラーをバインド
<Textarea
  onKeyDown={imeHandleKeyDown}  // undefined
  onCompositionStart={...}       // undefined
  ...
/>
```

---

## 🟥【4】LPチャットのバンドル構成 / ビルド時の tree-shaking の影響

### ディレクトリ構造

```
client/src/
├── pages/
│   ├── embed/
│   │   └── LpQaWidget.tsx        ← LPチャット（破損）
│   ├── LpQaFramePage.tsx         ← LPフレームページ
│   └── ChatRoom.tsx              ← 本体チャット（正常）
├── hooks/
│   └── useImeGuard.ts            ← IMEガードフック
└── components/
    └── LpQaWidgetV3_1.tsx        ← 旧バージョン
```

### 依存関係の分析

**LpQaWidget.tsx の import 文**:
```typescript
import { useImeGuard } from "@/hooks/useImeGuard";
```

**問題点**:
1. LPチャットと本体チャットが同じuseImeGuardフックを共有
2. useImeGuardは本体チャット用に設計されている（textareaRefベース）
3. LPチャットは異なる実装パターンを必要とする（軽量・シンプル）

### バンドル混入の可能性

現在の構造では、以下の問題が発生しています：

- **本体チャット用のロジックがLPに混入**
  - Twin-Core、Fire-Water Layers、霊核OSなどの高度な機能
  - これらはLPチャットには不要

- **LPチャットの独立性の欠如**
  - LPチャットは軽量Q&A専用であるべき
  - 本体チャットとは完全に別のOSとして扱うべき

---

## 📌 Manusへの質問（必須回答事項）

### 1. なぜ LP に compositionStart を必要とする props が流れ込んだのか？

**回答**: LpQaWidget.tsxの実装者が、本体チャットのパターンをコピーしたが、useImeGuardの仕様を正しく理解していなかったため。

### 2. どの時点で Textarea の props が undefined になったのか？

**回答**: コンポーネントの初期レンダリング時、263行目の分割代入の時点。useImeGuardは値を返さないため、すべてのハンドラーがundefinedになる。

### 3. ChatRoom の IME仕様変更が LP に影響した理由は？

**回答**: LPチャットが本体チャットと同じuseImeGuardフックを共有しているため。本体チャット用の変更がLPチャットにも影響を与える構造になっている。

### 4. 試験環境では正常だったのに、本番で壊れた理由は？

**推測される原因**:
- useImeGuardの実装が最近変更された（ネイティブイベントリスナー方式に移行）
- LpQaWidget.tsxは古い実装パターンを使用している
- キャッシュやビルド差分により、本番環境でのみエラーが顕在化

---

## 🔧 修復設計図 vΩ-FINAL (LPチャット専用)

### 最重要指針

1. **LPチャットは IME を使わない**
   - compositionstart / compositionend を完全禁止
   - LPには useImeGuard を絶対に import させない

2. **LPチャットの Textarea は "入力 → 送信" のみ**
   - GPTの LP widget の挙動と同じ
   - Shift+Enter のみ改行
   - Enter → 送信

3. **LP persona は Soft Persona のみ**
   - Twin-Core・Fire-Water・構文タグ 禁止
   - リンク・関連コンテンツ 禁止
   - 正確なサービス状況回答を DB から動的生成

4. **LPチャットは 本体チャットのコンポーネントを絶対使用しない**
   - コードを完全に別フォルダ化する
   - `client/src/pages/embed/` と `client/src/pages/chat/` を完全分離

---

## 🔧 Manus が直すべき "LPチャットの構造チェックリスト"

### ① LP用 Textarea を本体から完全独立したコンポーネントにする

**新規ファイル**: `client/src/components/lp/LpTextarea.tsx`

**内部実装**:
```typescript
import { useState } from "react";

interface LpTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LpTextarea({ value, onChange, onSend, disabled, placeholder }: LpTextareaProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className="chatgpt-textarea"
      rows={3}
    />
  );
}
```

**重要**: IMEロジックは絶対入れない。

### ② LpQaWidget.tsx を本体から完全隔離する

**削除すべき import**:
```typescript
import { useImeGuard } from "@/hooks/useImeGuard"; // ← 削除
```

**削除すべきコード** (263-274行目):
```typescript
const {
  handleCompositionStart,
  handleCompositionUpdate,
  handleCompositionEnd,
  handleKeyDown: imeHandleKeyDown,
  handleKeyPress,
} = useImeGuard(() => { ... }); // ← 完全削除
```

**Textareaの修正** (342-354行目):
```typescript
// 修正前
<Textarea
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={imeHandleKeyDown}
  onKeyPress={handleKeyPress}
  onCompositionStart={handleCompositionStart}
  onCompositionUpdate={handleCompositionUpdate}
  onCompositionEnd={handleCompositionEnd}
  ...
/>

// 修正後
<LpTextarea
  value={message}
  onChange={setMessage}
  onSend={() => {
    if (message.trim()) {
      handleSubmit(new Event('submit') as any);
    }
  }}
  disabled={chatMutation.isPending}
  placeholder="例: TENMON-ARKとは何ですか？"
/>
```

### ③ LP persona を "DB連動版 Soft Persona" に変更する

**実装場所**: サーバー側のLPルーター

```typescript
const LP_SOFT_PERSONA_SYSTEM_PROMPT = buildFromSiteInfoMemory();

function buildFromSiteInfoMemory() {
  const siteInfo = await getSiteInfo();
  return `
あなたは天聞アーク（TENMON-ARK）のサポートAIです。

現在のサービス状況:
- リリース状態: ${siteInfo.release_status}
- Founders先行開始日: ${siteInfo.founder_release_date}
- 正式リリース日: ${siteInfo.official_release_date}
- 無料プラン利用可能: ${siteInfo.free_plan_available ? 'はい' : 'いいえ'}

回答ルール:
1. 簡潔に、温かく、正確に答える
2. セールス文・構文タグ・リンクは禁止
3. サービス状況は必ずsiteInfoの値を参照する
4. 「すでに使えます」「無料プラン利用できます」などの誤回答を絶対にしない
`;
}
```

### ④ LP chat の API ルートは専用にする

**新規ルート**: `/api/lp-qa/chat`

本体の Chat API を共有させない。

---

## 🎯 修復の優先順位

### Phase 1: 緊急修復（即時対応）
1. LpTextarea.tsx の作成
2. LpQaWidget.tsx からuseImeGuardの削除
3. Textareaの置き換え

### Phase 2: 構造改善（短期対応）
1. LP専用APIルートの作成
2. DB連動Soft Personaの実装
3. siteInfoテーブルとの統合

### Phase 3: 完全分離（中期対応）
1. `client/src/pages/embed/` の完全独立化
2. LPチャット専用のコンポーネントライブラリ作成
3. 本体チャットとの依存関係の完全排除

---

## 📊 影響範囲の評価

### 破損の影響度: **致命的（Critical）**

- LPチャットは完全に動作不能
- ビジネスの入口が壊れている状態
- 商品化に直接影響

### 修復の難易度: **中程度（Medium）**

- 根本原因は明確
- 修復手順は確立済み
- 既存の本体チャットには影響なし

### 修復の所要時間: **2-4時間**

- Phase 1: 1-2時間
- Phase 2: 1-2時間
- Phase 3: 別途計画

---

## 🚨 再発防止策

### 1. コンポーネントの責任分離

- LPチャット専用のコンポーネントディレクトリを作成
- 本体チャットとの共有を最小限にする

### 2. 型安全性の強化

- useImeGuardの型定義を明確にする
- 返り値がvoidであることをドキュメント化

### 3. テストの追加

- LPチャットの統合テストを作成
- useImeGuardの単体テストを強化

### 4. ドキュメント整備

- LPチャットと本体チャットの違いを明文化
- 各コンポーネントの使用方法を文書化

---

## 📝 まとめ

LPチャットの破損は、**useImeGuardフックの誤用**が直接的な原因です。本体チャット用に設計されたフックをLPチャットに適用しようとしたことで、構造的な不整合が発生しました。

修復には、LPチャット専用の軽量Textareaコンポーネントを作成し、本体チャットとの依存関係を完全に排除する必要があります。

この修復により、LPチャットは以下の特性を持つべきです：

- **軽量**: IMEガードなどの高度な機能を持たない
- **シンプル**: Enter→送信、Shift+Enter→改行のみ
- **独立**: 本体チャットとコードを共有しない
- **正確**: DB連動でサービス状況を正確に回答

---

**診断完了日**: 2025-12-03  
**次のアクション**: Phase 1（緊急修復）の実施
