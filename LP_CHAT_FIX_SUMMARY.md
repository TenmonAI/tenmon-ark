# LP埋め込みチャット改善サマリー

**日時**: 2025-02-02 03:25 JST  
**対応者**: Manus AI  
**優先度**: 🔥 URGENT (UX Critical for LP)

---

## 📋 問題点

### Problem 1: 内部タグ・専門用語の露出
- `<balanced_layer>` `<minaka_layer>` などのカスタムタグが生テキストとして表示
- 「火水調和」「ミナカ」など、内部構文用の言葉がLPの一般ユーザーには難しすぎる
- 専門用語が多すぎて、初見のユーザーが混乱する

### Problem 2: 自動スクロールの欠如
- 新しいメッセージが追加されても、画面が上のまま
- ユーザーが自分で下までスクロールしないと返信が見えない
- ChatGPT本家のような自動追従動作がない

---

## ✅ 実装内容

### 1. LP公開用モード追加

**ファイル**: `server/prompts/lpQaPromptV3.1.ts`

#### 変更内容
- `LpQaPersonalityConfig` に `lpPublicMode?: boolean` パラメータを追加
- `applyTwinCoreStructure()` と `applyFireWaterLayers()` に `lpPublicMode` パラメータを追加
- `generateLpPublicPrompt()` 関数を新規作成

#### LP公開用プロンプトの特徴
```
- 内部タグ禁止: <balanced_layer>, <minaka_layer>, etc.
- レイヤー名禁止: ミナカ層、水層、火層、etc.
- 専門用語は必ず日本語で説明
- 丁寧な敬体（です・ます調）
- 3〜8行程度の簡潔な回答
- 結論→理由→補足の構造
- 怖さ・怪しさを感じない文章
```

#### 口調ガイドライン
- 落ち着いた、優しい専門家として話す
- 難しい宗教用語・スピリチュアル用語・専門用語は基本的に使わない
- 使う場合は必ずすぐ後に普通の日本語で説明
- 回答は、最初の1〜2文で「結論」を述べ、その後に理由や背景をやさしく補足
- 読んでいて"怖さ・怪しさ"を感じない、安心感のある文章

---

### 2. レスポンスサニタイズフィルター実装

**ファイル**: `server/routers/lpQaRouterV4.ts`

#### 実装内容
```typescript
/**
 * レスポンスサニタイズ関数
 * 内部タグ・専門用語を除去する
 */
function sanitizeResponse(text: string): string {
  // 1) <xxx_layer> タグ除去
  text = text.replace(/<\/?[\w-]*_layer>/g, "");
  
  // 2) その他の <> で囲まれた未知タグも基本的に削除
  text = text.replace(/<\/?[^>]+>/g, "");
  
  return text.trim();
}
```

#### 適用箇所
- `lpQaRouterV4.chat` mutation の最後（レスポンス返却前）
- `lpPublicMode` が `true` の場合のみ適用

#### ユニットテスト
- **テストファイル**: `server/routers/lpQaRouterV4.test.ts`
- **テストケース数**: 15個
- **テスト結果**: ✅ 全テスト成功

**テストケース一覧**:
1. `<balanced_layer>` タグ除去
2. `<minaka_layer>` タグ除去
3. `<fire_layer>` タグ除去
4. `<water_layer>` タグ除去
5. `<fire>`, `<water>`, `<minaka>` タグ除去
6. 複数のレイヤータグを含むテキスト
7. タグのないテキスト
8. 空文字列
9. タグのみのテキスト
10. 複雑な実世界の例
11. 閉じタグのみ
12. 開きタグのみ
13. Markdownフォーマットの保持
14. ネストされたタグ
15. 複数段落のタグ

---

### 3. 自動スクロール実装

**ファイル**: `client/src/pages/LpQaFramePage.tsx`

#### 実装内容
```typescript
// useRef を追加
const messagesEndRef = useRef<HTMLDivElement>(null);

// Auto-scroll to bottom when messages change
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}, [chatHistory, streamingMessage]);

// JSX内にアンカーを追加
<div ref={messagesEndRef} />
```

#### 動作
- `chatHistory` または `streamingMessage` が変更されるたびに自動スクロール
- `scrollIntoView({ behavior: "smooth", block: "end" })` でスムーズにスクロール
- ChatGPT本家と同じ動作

#### 既存実装の確認
- **LpQaWidgetV3_1.tsx**: 既に自動スクロール実装済み（46-48行目）
- 同様のロジックを使用

---

### 4. フロントエンド API呼び出し修正

**ファイル**: `client/src/pages/LpQaFramePage.tsx`

#### 変更内容
```typescript
chatMutation.mutate({
  question: inputValue.trim(),
  sessionId,
  language: navigator.language || "ja",
  apiKey,
  conversationHistory: chatHistory.map(msg => `${msg.role}: ${msg.content}`),
  enableMemorySync: false,
  lpPublicMode: true, // LP公開用モード(内部タグ非表示)
});
```

#### 重要
- `lpPublicMode: true` をデフォルトで送信
- これにより、LP埋め込みチャットでは常にやさしい日本語モードが適用される

---

## 🧪 テスト結果

### ユニットテスト
- **ファイル**: `server/routers/lpQaRouterV4.test.ts`
- **テストケース数**: 15個
- **結果**: ✅ 全テスト成功
- **実行時間**: 307ms

```
 ✓ server/routers/lpQaRouterV4.test.ts (15)
   ✓ sanitizeResponse (15)
     ✓ should remove <balanced_layer> tags
     ✓ should remove <minaka_layer> tags
     ✓ should remove <fire_layer> tags
     ✓ should remove <water_layer> tags
     ✓ should remove <fire>, <water>, <minaka> tags
     ✓ should remove multiple layer tags in one text
     ✓ should handle text with no tags
     ✓ should handle empty string
     ✓ should handle text with only tags
     ✓ should handle complex real-world example
     ✓ should handle text with closing tag only
     ✓ should handle text with opening tag only
     ✓ should preserve markdown formatting
     ✓ should handle nested tags correctly
     ✓ should handle multiple paragraphs with tags
```

### 統合テスト（手動）
- **URL**: https://tenmon-ai.com/embed/qa-frame
- **テスト項目**:
  - [ ] 新しいメッセージ送信時に内部タグが表示されないことを確認
  - [ ] やさしい日本語で応答されることを確認
  - [ ] 自動スクロールが動作することを確認
  - [ ] デスクトップ（Chrome, Firefox, Safari）で動作確認
  - [ ] モバイル（iPhone Safari, Android Chrome）で動作確認

---

## 📝 変更ファイル一覧

1. **server/prompts/lpQaPromptV3.1.ts**
   - LP公開用モード追加
   - `generateLpPublicPrompt()` 関数追加
   - `applyTwinCoreStructure()` と `applyFireWaterLayers()` に `lpPublicMode` パラメータ追加

2. **server/routers/lpQaRouterV4.ts**
   - `sanitizeResponse()` 関数追加
   - `lpPublicMode` パラメータ追加
   - サニタイズフィルター適用ロジック追加

3. **client/src/pages/LpQaFramePage.tsx**
   - `messagesEndRef` 追加
   - 自動スクロール `useEffect` 追加
   - `lpPublicMode: true` パラメータ追加

4. **server/routers/lpQaRouterV4.test.ts** (新規作成)
   - 15個のユニットテストケース

5. **todo.md**
   - Phase 3-F タスク進捗更新

6. **LP_CHAT_FIX_SUMMARY.md** (このファイル)
   - 実装サマリー作成

---

## 🎯 期待される効果

### ユーザー体験の改善
1. **内部タグ非表示**
   - 一般ユーザーには理解しにくい内部タグが表示されなくなる
   - 専門用語が減り、わかりやすい日本語で応答される

2. **自動スクロール**
   - 新しいメッセージが来たら自動的に下にスクロール
   - ChatGPT本家と同じ快適なUX

3. **やさしい日本語モード**
   - 丁寧な敬体（です・ます調）
   - 3〜8行程度の簡潔な回答
   - 結論→理由→補足の構造
   - 怖さ・怪しさを感じない文章

### 技術的な改善
1. **保守性向上**
   - ユニットテストにより、サニタイズ関数の動作を保証
   - 将来的な変更時にも安全に修正可能

2. **拡張性向上**
   - `lpPublicMode` パラメータにより、モード切り替えが容易
   - 他のチャット機能にも同様のロジックを適用可能

---

## 🚀 次のステップ

### 即時対応
1. [ ] ブラウザで https://tenmon-ai.com/embed/qa-frame を開く
2. [ ] 新しいメッセージを送信して、内部タグが表示されないことを確認
3. [ ] 自動スクロールが動作することを確認
4. [ ] モバイルでも動作確認

### 今後の改善案
1. [ ] iOS用の `-webkit-overflow-scrolling: touch` CSS追加
2. [ ] LP公開用モードの応答品質を継続的に改善
3. [ ] ユーザーフィードバックに基づいた調整
4. [ ] 他のチャット機能にも同様のサニタイズロジックを適用

---

## 📚 参考資料

### 元の要望（TENMON-ARK vΩ）
```
① 余計なタグ・専門用語をユーザーに見せない

問題
- <balanced_layer> <minaka_layer> などのカスタムタグが生テキストとして表示されている
- 「火水調和」「ミナカ」など、内部構文用の言葉が LPに来た一般ユーザーには難しすぎて浮く

やりたいこと
- 外向けLPチャット用の「やさしい日本語モード」 を天聞アークに持たせる
- 内部ではレイヤー構造や天津金木で考えていても、
  表に出す文は 普通の敬体・自然言語だけ にする

② 返信が来たときに自動スクロールするようにする

問題
- 新しいメッセージが追加されても、画面が上のまま で、
  ユーザーが 自分で下までスクロールしないと返信が見えない

やりたいこと
- 新しいメッセージが出た瞬間に、
  チャットウィンドウの一番下まで自動スクロール する
- 挙動イメージは「ChatGPT本家」と同じ
```

---

**実装完了**: 2025-02-02 03:25 JST  
**次のアクション**: ブラウザでの動作確認 → Checkpoint保存 → TENMON-ARK vΩ へ報告
