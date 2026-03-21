# CARD_BOOK_MODE_ARCHITECTURE_V1 設計

## 目的

- 天聞アークで 3000〜5000 字級の一貫した長文を書ける設計
- 断続的に続きを書ける
- 本のように章・節を継続できる
- 通常会話とは別の long-form / book mode を追加する前提
- 既存の answerLength / answerMode / answerFrame / thread continuity を活かす

---

## 1. long-form 専用 mode の型案

### 1.1 モード識別

```ts
// 既存の mode は "NATURAL" | "HYBRID" 等。long-form は intent または専用 mode で分離する案。

type BookModeIntent = "book" | "long_form";  // intent で分ける場合
// または
type ChatMode = "NATURAL" | "HYBRID" | "BOOK";  // mode を拡張する場合
```

**推奨**: まずは **intent: "book"** で分離し、通常の `mode: "NATURAL"` を維持。routeReason で `BOOK_*` 系を追加。

### 1.2 要求パラメータ（body 拡張案）

```ts
interface BookModeProfile {
  mode: "book" | "long_form";           // または intent のみで "book"
  targetLength: "chapter" | "section" | "full";  // 3000 / 1500 / 5000 目安
  continuity?: "new" | "continue";     // 新規 vs 続き
  chapterKey?: string;                 // 継続時は前章キー
  sectionKey?: string;                 // 継続時は前節キー
}
```

- `answerLength` を拡張するなら `"long"` の上位として `"chapter"`(約 3000 字) / `"full"`(約 5000 字) を追加する案も可。
- 既存 `answerLength` / `answerMode` / `answerFrame` はそのまま利用し、book 時は `answerLength: "long"` 相当＋`targetLength` で桁を指定。

### 1.3 routeReason 案

- `BOOK_CHAPTER_START_V1` … 章を新規開始
- `BOOK_CHAPTER_CONTINUE_V1` … 章の続き
- `BOOK_SECTION_APPEND_V1` … 節を追加
- `BOOK_LONG_FORM_TOP_V1` … long-form 汎用

---

## 2. 章・節・未完項目を持つ継続記憶案

### 2.1 ストア単位

- **スコープ**: `threadId` に紐づく 1 本の「本」を想定。同一 thread 内で章・節を蓄積。
- **既存**: `threadCenterMemory`（center_key, center_type）を流用可能。別ストアにしてもよい。

### 2.2 構造案（BookContinuation）

```ts
interface BookContinuation {
  threadId: string;
  updatedAt: string;  // ISO8601

  // 章
  chapters: Array<{
    chapterKey: string;      // 例: "ch_1", "ch_2"
    title?: string;          //  optional
    summary?: string;        //  章の要約（継続生成のコンテキスト用）
    sectionKeys: string[];   //  節 ID の並び
    wordCount?: number;
    createdAt: string;
  }>;

  // 節（章に属する）
  sections: Array<{
    sectionKey: string;     // 例: "ch_1_s2"
    chapterKey: string;
    title?: string;
    contentSummary?: string;  // 先頭 200 字など
    wordCount?: number;
    createdAt: string;
  }>;

  // 未完・次に書くべき項目（スタブ）
  pending: Array<{
    kind: "chapter" | "section";
    key: string;
    hint?: string;          // ユーザーや前文からの「次に書くこと」ヒント
    createdAt: string;
  }>;
}
```

- **永続**: 新規 `core/bookContinuationMemory.ts`（または既存 thread 付属 JSON）で get/upsert。
- **参照**: 続きを書くときに `getBookContinuation(threadId)` で取得し、直前の章・節・pending を LLM のコンテキストに渡す。

### 2.3 章・節キー生成

- 章: `ch_${number}` または `ch_${timestamp}`。
- 節: `ch_${chapterNumber}_s_${sectionNumber}`。
- 新規章開始時は `chapters` に 1 件 push、`sections` はその章の節を push。続きは `pending` を 1 件消費して section を追加、など。

---

## 3. 5000 字級を安定化する生成手順

### 3.1 方針

- **一括 5000 字**は LLM の出力長・トークン制限で揺れるため、**分割生成＋継続**で安定化する。
- 目標: 1 回の応答で **1500〜2500 字** を安定して出し、複数ターンで 3000〜5000 字を構成。

### 3.2 手順案

1. **入力判定**  
   body に `intent: "book"` または `mode: "book"` かつ `targetLength` を検出。既存 general の前段で book 専用分岐。

2. **コンテキスト準備**  
   - `getBookContinuation(threadId)` で直前の章・節・pending を取得。  
   - 直前節の `contentSummary` と直前章の `summary` を要約として system / user に含める。

3. **生成**  
   - **章新規**: 「章タイトル（任意）＋最初の節 1500〜2500 字」を 1 回で生成。  
   - **章続き**: 「前節の要約＋続きの節 1500〜2500 字」を 1 回で生成。  
   - system に「指定文字数（例: 2000 字）で返す。章・節の文体を崩さない。」を明示。

4. **出力後処理**  
   - 生成テキストの文字数を計測。  
   - `BookContinuation` を更新: 新規なら `chapters` / `sections` に push、続きなら該当 section を append または新 section 追加。  
   - `pending` を更新（「次の節」「次の章」など）。

5. **返却**  
   - `response` に今回生成した本文のみ返す。  
   - `decisionFrame.ku` に `routeReason: BOOK_*`, `answerLength`, `answerMode`, `answerFrame`, `chapterKey`, `sectionKey`, `wordCount` などを付与。

### 3.3 長さ安定化のポイント

- 明示文字数: system に「2000 字で返す」などと指定（既存の明示文字数ロジックを流用可能）。  
- 1 ターンあたり 1500〜2500 字に抑え、5000 字は 2〜3 ターンで達成。  
- 続きは必ず「前節の要約＋続き」をコンテキストに含め、一貫性を保つ。

---

## 4. chat.ts からどこを分離すべきか

### 4.1 分離候補

| 役割 | 分離先案 | 理由 |
|------|----------|------|
| book 判定 | chat.ts 内の 1 ブロック（body 解釈の直後） | 最小 diff で route 分岐だけ入れる |
| 章・節・継続記憶の get/upsert | `core/bookContinuationMemory.ts`（新規） | thread とは別の長期構造 |
| book 用 system 文・文字数指定 | `chat_parts/bookModePrompt.ts` または gates_impl 内の 1 関数 | 本文生成ロジックの分離 |
| 5000 字級の「生成オーケストレーション」 | `core/bookModeGenerator.ts` または `routes/bookModeHandler.ts` | 複数ターン・要約・継続の制御 |
| 返却形式（response + ku） | 既存 `__tenmonGeneralGateResultMaybe` を流用し、ku だけ book 用で拡張 | 共通 gate は触らず ku で区別 |

### 4.2 推奨分離イメージ

- **chat.ts**:  
  - body から `intent === "book"` または `mode === "book"` を検出。  
  - 検出時は **book 専用ハンドラ**（別関数または別モジュール）に `threadId`, `message`, `body` を渡して処理し、その戻りで `res.json(...)`。  
  - 既存 support / define / scripture / truth gate / kanagi / general の流れは変更しない。

- **新規モジュール**  
  - `core/bookContinuationMemory.ts`: BookContinuation の get/upsert。  
  - `routes/bookModeHandler.ts`（または `chat_parts/bookModeHandler.ts`）: コンテキスト組み立て・生成呼び出し・継続記憶更新・返却用 payload 組み立て。

- **prompt 文**  
  - 既存 GEN_SYSTEM とは別の「長文・章節・文体」用の system 文を定数または `bookModePrompt.ts` に持つ。

---

## 5. 最小導入順

1. **Phase 0（設計のみ）**  
   - 本ドキュメントで型・記憶・手順を確定。  
   - 既存 answerLength / answerMode / answerFrame / thread を壊さないことを確認。

2. **Phase 1: 記憶と型**  
   - `BookContinuation` 型と `core/bookContinuationMemory.ts` を追加。  
   - get/upsert の API だけ実装。chat.ts はまだ呼ばない。

3. **Phase 2: chat.ts の分岐だけ**  
   - body に `intent: "book"` を解釈するブロックを追加。  
   - 該当時は固定の「book mode は準備中です」のような短文を返し、`routeReason: "BOOK_PLACEHOLDER_V1"` を付ける。  
   - 既存 route は一切触らない。

4. **Phase 3: 1 ターン生成**  
   - book 分岐で `bookModeHandler` を呼ぶ。  
   - 継続記憶は読むだけ（または未実装のまま）。  
   - 「章 1 本・2000 字で返す」を 1 回の LLM 呼び出しで実装し、`response` と ku を返す。

5. **Phase 4: 継続**  
   - 生成後に `bookContinuationMemory` を更新。  
   - 続きリクエストで前節要約を渡し、2 ターン目以降で 3000〜5000 字を構成できるようにする。

6. **Phase 5: 章・節・pending**  
   - 章・節キーと pending を更新するロジックを入れ、本のような章・節継続を完成させる。

---

## 6. Acceptance

- **型**: BookContinuation / BookModeProfile（または同等）が定義され、book 用 routeReason が決まっている。  
- **記憶**: threadId に紐づく章・節・未完項目を永続でき、続き生成時に参照できる。  
- **生成**: 3000〜5000 字を、複数ターンで一貫した長文として生成できる（1 ターンあたり 1500〜2500 字を目安）。  
- **分離**: 通常会話（NATURAL_GENERAL_LLM_TOP 等）は変更されず、book は専用分岐と専用ハンドラで処理される。  
- **既存**: answerLength / answerMode / answerFrame / thread continuity（threadCenter 等）は従来どおり利用可能。

---

## 7. Rollback

- **Phase 2 まで**: book 判定ブロックと `BOOK_PLACEHOLDER_V1` を削除すれば、通常会話のみに戻る。  
- **Phase 3 以降**: book 分岐で `bookModeHandler` を呼んでいる箇所を削除し、代わりに placeholder 返却に戻す。  
- **記憶**: `bookContinuationMemory` は未使用のまま残すか、モジュールごと削除。既存の threadCenter / session memory は触らないため、rollback 時も影響なし。
