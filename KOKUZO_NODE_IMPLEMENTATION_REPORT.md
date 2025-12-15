# TENMON-ARK 虚空蔵ノード実装 進捗・稼働レポート
**作成日**: 2025-01-XX  
**監査者**: プロダクション監査AI  
**目的**: 虚空蔵ノード実装の事実ベース評価

---

## ① 実装完了状況サマリー（結論先出し）

### 虚空蔵ノード

**判定**: **MVP 完了**

**根拠**:
- `client/src/lib/kokuzo/index.ts` 実装済み
- `client/src/lib/kokuzo/memory.ts` 実装済み（localStorage使用）
- `client/src/lib/kokuzo/compress.ts` 実装済み（不可逆圧縮）
- `ChatRoom.tsx` で `storeExperience()` 呼び出し実装済み
- ページロード時に `recallMemory()` 呼び出し実装済み

**ただし**:
- サーバー側で `memorySummary` の利用が未実装（受け取るだけで使用していない）

---

### 中央API連携

**判定**: **抽象データ送信のみ**

**根拠**:
- `useChatStreaming.ts` で `memorySummary` をAPIリクエストに含める実装済み
- `server/chat/chatStreamingEndpoint.ts` で `memorySummary` を受け取る実装済み
- **問題**: サーバー側で `memorySummary` を推論に使用していない（受け取るだけで未使用）

---

### UI統合

**判定**: **内部呼び出しのみ**

**根拠**:
- `ChatRoom.tsx` で `storeExperience()` 呼び出し実装済み
- `ChatRoom.tsx` で `getMemorySummaryForAPI()` 呼び出し実装済み
- ページロード時に `recallMemory()` 呼び出し実装済み（ログのみ）
- **問題**: 記憶をUIに表示する機能なし
- **問題**: 記憶を推論に活用する機能なし（サーバー側で未使用）

---

## ② ファイル別 実装状況

### `client/src/lib/kokuzo/index.ts`

**存在**: Yes

**実装内容**:
- `storeExperience(text: string)`: 体験を記憶に保存（不可逆圧縮後）
- `recallMemory()`: 記憶を想起（全件取得）
- `getMemorySummaryForAPI(limit: number)`: 記憶の要約を取得（中央API送信用）

**呼び出し元**:
- `client/src/pages/ChatRoom.tsx`:
  - `storeExperience()`: メッセージ送信時（`handleSendMessage`内）
  - `recallMemory()`: ページロード時（`useEffect`内、ログのみ）
  - `getMemorySummaryForAPI()`: メッセージ送信時（`handleSendMessage`内）

**問題点**:
- なし（MVPとして完成）

---

### `client/src/lib/kokuzo/memory.ts`

**保存方式**: localStorage（`TENMON_KOKUZO_MEMORY` キー）

**永続性確認**:
- `localStorage.setItem()` で保存
- `localStorage.getItem()` で読み込み
- ブラウザのlocalStorageに依存（プライベートモードでは制限あり）

**ブラウザ更新後の保持**:
- **Yes**: localStorageはブラウザ更新後も保持される
- **ただし**: プライベートモード、ブラウザデータ削除、別ブラウザでは保持されない

**問題点**:
- IndexedDB への移行が未実装（将来拡張用の設計はあるが、現時点ではlocalStorageのみ）
- ストレージ容量制限（localStorageは通常5-10MB）
- エラーハンドリングはあるが、容量超過時の処理が未実装

---

### `client/src/lib/kokuzo/compress.ts`

**圧縮ロジックの有無**: Yes

**実装内容**:
- `extractKeywords()`: キーワード抽出（最大5個、stopWords除去）
- `extractIntent()`: 意図抽出（感情・知識・タスクカテゴリ）
- `calculateWeight()`: 重要度計算（0.0 - 1.0）

**原文保持の危険性**: **No（安全）**

**根拠**:
- `compressMemory()` は `CompressedMemory` 型を返す（`keywords`, `intent`, `weight` のみ）
- 原文テキストは返さない
- `saveMemory()` は `CompressedMemory` のみを保存（原文なし）

**不可逆性の担保**: **Yes（担保されている）**

**根拠**:
- 原文テキストは保存されない
- キーワードのみ（最大5個）を抽出
- 意図はカテゴリ文字列のみ（`emotion:fear`, `knowledge:query` 等）
- 原文から復元不可能

**問題点**:
- キーワード抽出ロジックが簡易的（`split(/\s+|、|。|,|\./)` で分割）
- 日本語の形態素解析なし（「東京大学」が「東京」「大学」に分割される可能性）
- 意図抽出がキーワードマッチングのみ（機械学習なし）

---

### `client/src/lib/kokuzo/crypto.ts`

**存在**: Yes

**実装内容**:
- `encryptMemory()`: 将来実装用（現時点では `JSON.stringify` のみ）
- `decryptMemory()`: 将来実装用（現時点では `JSON.parse` のみ）

**問題点**:
- 暗号化が未実装（MVPでは暗号化なし）
- 将来拡張用のプレースホルダーのみ

---

### `client/src/lib/kokuzo/sync.ts`

**存在**: Yes

**実装内容**:
- `shouldSync()`: 将来実装用（常に `false` を返す）
- `performSync()`: 将来実装用（未実装）

**問題点**:
- 同期機能が未実装（MVPでは同期なし）
- 将来拡張用のプレースホルダーのみ

---

### UI（Chat / Home / Input）

**`storeExperience` 呼び出し有無**: **Yes**

**実装箇所**:
- `client/src/pages/ChatRoom.tsx` の `handleSendMessage()` 内（373-378行目）
- メッセージ送信時に必ず呼び出される

**`recallMemory` 利用有無**: **部分実装**

**実装箇所**:
- `client/src/pages/ChatRoom.tsx` の `useEffect` 内（309-320行目）
- ページロード時に呼び出されるが、**ログ出力のみ**（UI表示なし）

**問題点**:
- 記憶をUIに表示する機能なし
- 記憶を推論に活用する機能なし（サーバー側で未使用）
- 記憶の削除・編集機能なし

---

## ③ 実際に「動くか」チェック（重要）

### ブラウザをリロードしても記憶が残るか

**判定**: **Yes**

**根拠**:
- `localStorage.setItem()` で保存
- `localStorage.getItem()` で読み込み
- localStorageはブラウザ更新後も保持される

**ただし**:
- プライベートモードでは制限あり
- ブラウザデータ削除で消失
- 別ブラウザでは保持されない

---

### 同一端末で会話文脈が継続するか

**判定**: **未確認（実装はあるが動作確認なし）**

**根拠**:
- `storeExperience()` は実装済み
- `recallMemory()` は実装済み
- **問題**: サーバー側で `memorySummary` を推論に使用していない
- **問題**: 記憶を会話文脈に組み込む処理が未実装

**実際の動作**:
- 記憶は端末に保存される
- 記憶の要約はAPIに送信される
- **しかし**: サーバー側で推論に使用されていない（受け取るだけで未使用）

---

### サーバー再起動でユーザー記憶が消えないか

**判定**: **Yes（端末側の記憶は消えない）**

**根拠**:
- 記憶は端末のlocalStorageに保存
- サーバー側には保存されない
- サーバー再起動の影響を受けない

**ただし**:
- サーバー側で `memorySummary` を受け取っているが、保存していない（実装確認済み）
- サーバー側で推論に使用していない（未実装）

---

### サーバーにユーザー記憶が保存されていないか

**判定**: **Yes（保存されていない）**

**根拠**:
- `server/chat/chatStreamingEndpoint.ts` で `memorySummary` を受け取るのみ
- データベースへの保存処理なし（コード確認済み）
- `chatDb.addChatMessage()` は会話メッセージのみを保存（記憶ではない）

**確認したコード**:
```typescript
// server/chat/chatStreamingEndpoint.ts:56
const { roomId: roomIdStr, message, language = "ja", reconnectToken, projectId, memorySummary } = req.body;
// memorySummary を受け取るが、以降の処理で使用されていない
```

---

## ④ セキュリティ・構造判定

### 中央サーバーに保存されているユーザー情報

**判定**: **原文テキストは保存されていない**

**根拠**:
- `memorySummary` は `CompressedMemory[]` 型（`keywords`, `intent`, `weight` のみ）
- 原文テキストは含まれない
- サーバー側で `memorySummary` を受け取るが、保存していない（コード確認済み）

**ただし**:
- 会話メッセージ（`chatDb.addChatMessage()`）はサーバー側に保存されている
- これは既存の会話履歴機能（虚空蔵ノードとは別）

---

### 意図せず送信されている生データ

**判定**: **No（生データは送信されていない）**

**根拠**:
- `getMemorySummaryForAPI()` は `CompressedMemory[]` を返す（原文なし）
- `compressMemory()` は原文を圧縮し、キーワード・意図・重要度のみを返す
- APIリクエストに含まれるのは抽象データのみ

**確認したコード**:
```typescript
// client/src/lib/kokuzo/compress.ts:20-25
export function compressMemory(text: string): CompressedMemory {
  return {
    keywords: extractKeywords(text),  // 最大5個のキーワードのみ
    intent: extractIntent(text),      // カテゴリ文字列のみ
    weight: calculateWeight(text),    // 数値のみ
  };
}
```

---

### プライバシー侵害の可能性

**判定**: **低い（ただし完全ではない）**

**根拠**:
- 原文テキストは送信されない
- キーワードのみ（最大5個）が送信される
- 意図はカテゴリ文字列のみ（`emotion:fear` 等）

**リスク**:
- キーワードから原文を推測できる可能性（例: 「東京」「大学」「入学」→「東京大学に入学したい」）
- ただし、完全な原文復元は不可能

---

## ⑤ 未実装・不足項目（TODO）

### 実装不足

1. **サーバー側で `memorySummary` を推論に使用していない**
   - 場所: `server/chat/chatStreamingEndpoint.ts`, `server/chat/chatStreamingV3Engine.ts`
   - 現状: `memorySummary` を受け取るが、推論処理に渡していない
   - 影響: 記憶が推論に活用されない

2. **記憶をUIに表示する機能なし**
   - 場所: `client/src/pages/ChatRoom.tsx`
   - 現状: `recallMemory()` は呼び出されるが、ログ出力のみ
   - 影響: ユーザーが記憶を確認できない

3. **記憶の削除・編集機能なし**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 現状: `clearMemory()` はあるが、個別削除・編集機能なし
   - 影響: 誤った記憶を修正できない

---

### 仮実装のままの箇所

1. **暗号化機能（`crypto.ts`）**
   - 現状: `JSON.stringify` / `JSON.parse` のみ（暗号化なし）
   - 将来: WebCrypto API による暗号化を実装予定

2. **同期機能（`sync.ts`）**
   - 現状: 常に `false` を返す（同期なし）
   - 将来: 法則差分同期を実装予定

3. **IndexedDB への移行**
   - 現状: localStorage のみ
   - 将来: IndexedDB への移行を前提に設計（未実装）

---

### 稼働には問題ないが将来修正が必要な点

1. **キーワード抽出ロジックの改善**
   - 現状: 簡易的な `split()` による分割
   - 将来: 形態素解析（MeCab、kuromoji等）の導入

2. **意図抽出の改善**
   - 現状: キーワードマッチングのみ
   - 将来: 機械学習による意図分類

3. **ストレージ容量管理**
   - 現状: 容量超過時の処理が未実装
   - 将来: 古い記憶の自動削除、重要度に基づく優先保持

---

## ⑥ 「今すぐ稼働できるか」最終判定

**判定**: **⚠️ 技術デモ段階**

**理由**:

1. **記憶は端末に保存される** ✅
   - `localStorage` による保存実装済み
   - ブラウザ更新後も保持される

2. **抽象データのみが送信される** ✅
   - 原文テキストは送信されない
   - キーワード・意図・重要度のみ

3. **サーバー側に記憶が保存されない** ✅
   - `memorySummary` を受け取るが、保存していない

4. **しかし、推論に活用されていない** ❌
   - サーバー側で `memorySummary` を推論処理に渡していない
   - 記憶が推論に影響しない（現時点では「送信しているだけ」）

5. **UIに表示されない** ❌
   - 記憶をUIに表示する機能なし
   - ユーザーが記憶を確認できない

**結論**:
- 技術的には動作する（記憶は保存され、抽象データは送信される）
- ただし、実用的な価値がない（推論に活用されていない、UIに表示されない）
- **「動いているが、使われていない」状態**

---

## ⑦ 不足項目を自動修正するための次ステップ案

### P0（必須、すぐ実装）

1. **サーバー側で `memorySummary` を推論に使用する**
   - 場所: `server/chat/chatStreamingV3Engine.ts`, `server/chat/chatAI.ts`
   - 作業: `generateChatStreamingV3()` に `memorySummary` パラメータを追加し、推論プロンプトに組み込む
   - 想定工数: 2人日

2. **記憶をUIに表示する機能**
   - 場所: `client/src/pages/ChatRoom.tsx`
   - 作業: `recallMemory()` の結果をUIに表示（サイドバーまたはモーダル）
   - 想定工数: 1人日

---

### P1（重要、早急に対応）

3. **記憶の削除・編集機能**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 作業: `deleteMemory(id: number)`, `updateMemory(id: number, data: CompressedMemory)` を実装
   - 想定工数: 1人日

4. **ストレージ容量管理**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 作業: 容量超過時の古い記憶の自動削除、重要度に基づく優先保持
   - 想定工数: 1人日

---

### P2（改善、後回し可）

5. **IndexedDB への移行**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 作業: localStorage から IndexedDB への移行
   - 想定工数: 2人日

6. **暗号化機能の実装**
   - 場所: `client/src/lib/kokuzo/crypto.ts`
   - 作業: WebCrypto API による暗号化
   - 想定工数: 2人日

7. **キーワード抽出ロジックの改善**
   - 場所: `client/src/lib/kokuzo/compress.ts`
   - 作業: 形態素解析ライブラリの導入
   - 想定工数: 3人日

---

## 補足：コードベース確認結果

### 実装済みファイル

- ✅ `client/src/lib/kokuzo/index.ts` - 実装済み
- ✅ `client/src/lib/kokuzo/memory.ts` - 実装済み
- ✅ `client/src/lib/kokuzo/compress.ts` - 実装済み
- ✅ `client/src/lib/kokuzo/crypto.ts` - プレースホルダーのみ
- ✅ `client/src/lib/kokuzo/sync.ts` - プレースホルダーのみ

### 統合済みファイル

- ✅ `client/src/pages/ChatRoom.tsx` - `storeExperience()`, `getMemorySummaryForAPI()` 呼び出し実装済み
- ✅ `client/src/hooks/useChatStreaming.ts` - `memorySummary` パラメータ追加済み
- ✅ `server/chat/chatStreamingEndpoint.ts` - `memorySummary` 受け取り実装済み

### 未実装箇所

- ❌ `server/chat/chatStreamingV3Engine.ts` - `memorySummary` を推論に使用していない
- ❌ `server/chat/chatAI.ts` - `memorySummary` を推論に使用していない
- ❌ UI表示機能 - 記憶をUIに表示する機能なし

---

**レポート完了**

