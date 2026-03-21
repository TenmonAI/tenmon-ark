# CARD_BOOK_CONTINUATION_MEMORY_V1 設計

## 前提

- 本生成本体はまだ作らない。book mode の**継続記憶だけ**を入れる。
- 既存の **BOOK_PLACEHOLDER_V1** を前提にする。
- 通常会話は壊さない。
- 次段の **BOOK_GENERATOR_V1** に渡せる形にする。

---

## 1. 保存先案

### 1.1 推奨: 専用テーブル + 新規モジュール

- **テーブル**: `book_continuation_memory`（thread 単位で 1 行、upsert で更新）。
- **モジュール**: `api/src/core/bookContinuationMemory.ts`（新規）。
- **DB**: 既存 `kokuzo` と同じ DB ファイルを利用（`getDb("kokuzo")` で取得）。

理由:

- 既存の `thread_center_memory`（thread 単位の center）と役割が近く、参考にしやすい。
- book 用は「章・節・pending」の重い構造はまだ持たず、**軽量な 1 行**で済ませる。
- 後から BOOK_GENERATOR_V1 で章・節テーブルを足しても、この 1 行は「book モードかどうか・最後の意図・target 長さ」のメタ情報として残せる。

### 1.2 代替案（今回は採用しない）

- **thread 付属 JSON**: 既存の session / thread 系に `bookState` のような JSON を足す。  
  → 既存スキーマを触るため、今回は「book 専用テーブル 1 本」に寄せる。

---

## 2. 型案

### 2.1 永続行（DB スキーマ）

```ts
// book_continuation_memory テーブル（thread_id 単位で 1 行）
export type BookContinuationRow = {
  id: number;
  thread_id: string;
  book_mode_requested: number;   // 0/1 (boolean)
  target_length_hint: number | null;  // 3000 / 5000 / null
  chapter_title: string | null;
  center_topic: string | null;
  last_book_intent: string | null;    // 例: "chapter_start" | "section_continue" | "placeholder"
  updated_at: string;                 // ISO8601
};
```

- **thread_id**: 一意。同一 thread は 1 行だけ。`INSERT OR REPLACE` または `SELECT` → あれば `UPDATE`、なければ `INSERT`。

### 2.2 入力（upsert 用）

```ts
export type BookContinuationInput = {
  threadId: string;
  bookModeRequested?: boolean;
  targetLengthHint?: number | null;   // 3000 | 5000 | null
  chapterTitle?: string | null;
  centerTopic?: string | null;
  lastBookIntent?: string | null;     // "chapter_start" | "section_continue" | "placeholder" 等
};
```

### 2.3 取得結果（API 返却・BOOK_GENERATOR に渡す形）

```ts
export type BookContinuationState = {
  threadId: string;
  bookModeRequested: boolean;
  targetLengthHint: number | null;
  chapterTitle: string | null;
  centerTopic: string | null;
  lastBookIntent: string | null;
  updatedAt: string;  // ISO8601
};
```

- `getBookContinuation(threadId): Promise<BookContinuationState | null>` で返す形を想定。

---

## 3. 最小導入順

### Phase 0: 設計確定（本ドキュメント）

- 保存先・型・API を確定する。
- 既存 BOOK_PLACEHOLDER_V1 および thread center を壊さないことを確認。

### Phase 1: テーブルとモジュール追加

1. **マイグレーション**: `book_continuation_memory` テーブルを追加。  
   - カラム: `id` (PK), `thread_id` (UNIQUE NOT NULL), `book_mode_requested` (INT 0/1), `target_length_hint` (INT NULL), `chapter_title` (TEXT NULL), `center_topic` (TEXT NULL), `last_book_intent` (TEXT NULL), `updated_at` (TEXT NOT NULL)。
2. **core/bookContinuationMemory.ts**:  
   - `upsertBookContinuation(input: BookContinuationInput): void`  
   - `getBookContinuation(threadId: string): BookContinuationState | null`  
   - 同期でよい（既存 threadCenterMemory に合わせる場合）。非同期でも可。

### Phase 2: BOOK_PLACEHOLDER_V1 から書き込むだけ

- chat.ts の BOOK_PLACEHOLDER_V1 の return 直前で、`upsertBookContinuation({ threadId, bookModeRequested: true, targetLengthHint, lastBookIntent: "placeholder", ... })` を 1 回だけ呼ぶ。
- 本文生成はまだ行わない。**記憶の書き込みのみ**。

### Phase 3: 続きリクエストで読みだけ（任意）

- 「続きを書いて」「この続き」で BOOK_PLACEHOLDER_V1 に再度入ったとき、`getBookContinuation(threadId)` を呼び、`decisionFrame.ku` に `bookContinuation: state` を付けるなど、次段で BOOK_GENERATOR が使えるようにする。  
- 今回は「保存先・型・最小導入順」まででよい。

---

## 4. Acceptance

- **型**: `BookContinuationRow` / `BookContinuationInput` / `BookContinuationState` が定義され、`book_continuation_memory` と対応している。
- **保存**: `upsertBookContinuation` で threadId 単位に `bookModeRequested`, `targetLengthHint`, `chapterTitle`, `centerTopic`, `lastBookIntent`, `updatedAt` を保持できる。
- **取得**: `getBookContinuation(threadId)` で上記フィールドを返せる（無ければ null）。
- **BOOK_PLACEHOLDER_V1**: 既存の placeholder 返却はそのまま。Phase 2 で return 前に 1 回 upsert するだけ。通常会話・他 route は変更しない。
- **BOOK_GENERATOR_V1**: 未実装でも、`getBookContinuation(threadId)` の戻りを渡せる形になっている。

---

## 5. Rollback

- **Phase 2 のみ**: chat.ts から `upsertBookContinuation` 呼び出しを削除する。BOOK_PLACEHOLDER_V1 は従来どおり placeholder を返すだけ。
- **Phase 1 まで含む**:  
  - `core/bookContinuationMemory.ts` を削除。  
  - `book_continuation_memory` テーブルを DROP（または未使用のまま残す）。  
- 既存の thread center / session / BOOK_PLACEHOLDER_V1 の routeReason や response は、rollback 後も変更しない。
