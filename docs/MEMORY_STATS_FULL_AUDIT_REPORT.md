# TENMON-ARK 現状完全把握レポート：/api/memory/stats

## 1. /api/memory/stats の実装箇所とルーティング

### 実装ファイル
- **ファイル**: `api/src/routes/meta.ts`
- **行番号**: 23-130行目
- **エンドポイント**: `GET /api/memory/stats`

### ルーティング登録
- **ファイル**: `api/src/index.ts`
- **行番号**: 75行目
- **登録方法**: `app.use("/api", metaRouter);`
- **完全なURL**: `http://localhost:3000/api/memory/stats`

### 現在の実装状態
✅ **既に修正済み**: 固定値0から実DB参照に変更済み
- `kokuzo_pages` の COUNT(*) を取得
- `conversation_log` の COUNT(*) を取得
- `session_memory` の COUNT(*) を取得
- `training_*` テーブルの COUNT(*) を取得

## 2. kokuzo.sqlite を開いている正しいDB入口

### DB接続ユーティリティ
- **ファイル**: `api/src/db/index.ts`
- **関数**: `getDb(kind: DbKind): DatabaseSync` (172-248行目)
- **使用例**: `getDb("kokuzo")` で `/opt/tenmon-ark-data/kokuzo.sqlite` に接続

### DBパス決定ロジック
- **関数**: `getTenmonDataDir()` (48-54行目)
  - デフォルト: `/opt/tenmon-ark-data`
  - 環境変数 `TENMON_DATA_DIR` で上書き可能
- **関数**: `getDbPath(kind: DbKind)` (65-113行目)
  - `kokuzo.sqlite` のパス: `${TENMON_DATA_DIR}/kokuzo.sqlite`
  - 実際のパス: `/opt/tenmon-ark-data/kokuzo.sqlite`

### SQL実行ユーティリティ
- **関数**: `dbPrepare(kind: DbKind, sql: string)` (266-279行目)
  - `getDb(kind)` でDB接続を取得
  - `prepare(sql)` でステートメントを作成
  - 自動リトライ機能付き（SQLITE_BUSY/SQLITE_LOCKED エラー時）

### 起動時のログ
```
[DB] dataDir=/opt/tenmon-ark-data
[DB] kokuzo path=/opt/tenmon-ark-data/kokuzo.sqlite
```

## 3. conversation_log / session_memory / training_* が 0 の理由

### conversation_log が 0 の理由

**INSERT関数**: `conversationAppend()` (api/src/memory/conversationStore.ts:30-38行目)
- `INSERT INTO conversation_log (session_id, turn_index, role, content, created_at) VALUES (?, ?, ?, ?, ?)`

**呼び出し箇所**:
- ✅ `api/src/memory/index.ts:35行目`: `memoryPersistMessage()` 内で呼ばれている
- ✅ `api/src/tenmon/respond.ts:37行目, 127行目, 213行目`: `memoryPersistMessage()` を呼んでいる
- ❌ **`api/src/routes/chat.ts`**: `memoryPersistMessage()` を呼んでいない

**結論**: `chat.ts` の `/api/chat` エンドポイントでは `memoryPersistMessage()` が呼ばれていないため、`conversation_log` にINSERTされていない。

### session_memory が 0 の理由

**INSERT関数**: `sessionMemoryAdd()` (api/src/memory/sessionMemory.ts:20-24行目)
- `INSERT INTO session_memory (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)`

**呼び出し箇所**:
- ✅ `api/src/memory/index.ts:34行目`: `memoryPersistMessage()` 内で呼ばれている
- ✅ `api/src/tenmon/respond.ts`: `memoryPersistMessage()` を呼んでいる
- ❌ **`api/src/routes/chat.ts`**: `memoryPersistMessage()` を呼んでいない

**結論**: `chat.ts` の `/api/chat` エンドポイントでは `memoryPersistMessage()` が呼ばれていないため、`session_memory` にINSERTされていない。

### training_* が 0 の理由

**INSERT関数**: `api/src/training/storage.ts` に実装されている
- `createSession()`: `training_sessions` にINSERT
- `addMessages()`: `training_messages` にINSERT
- `saveRules()`: `training_rules` にINSERT
- `createFreeze()`: `training_freezes` にINSERT

**呼び出し箇所**:
- ✅ `api/src/routes/training.ts`: `/api/training/*` エンドポイントで使用
- ❌ **`api/src/routes/chat.ts`**: 使用されていない

**結論**: `training_*` テーブルは `/api/training/*` エンドポイントでのみ使用され、通常の `/api/chat` では使用されていない。そのため、通常の会話では0件のまま。

## 4. 最小diffの修正案

### 修正案A: /memory/stats を DB実数にする（✅ 既に実装済み）

**変更ファイル**: `api/src/routes/meta.ts`
**変更内容**: 固定値0から実DBのCOUNT(*)に変更
**状態**: ✅ 実装完了

### 修正案B: /api/chat の最後で conversation_log に必ず INSERT する

**変更ファイル**: `api/src/routes/chat.ts`
**変更箇所**: レスポンス返却直前（881行目の `applyPersonaGovernor` の後）

**実装内容**:
```typescript
// レスポンス形式（厳守）
applyPersonaGovernor(detailPlan as any, { message: sanitized.text, trace: {} as any } as any);

// conversation_log と session_memory にINSERT
import { memoryPersistMessage } from "../memory/index.js";

// user message をINSERT（既に保存されている可能性があるが、確実にする）
memoryPersistMessage(threadId, "user", sanitized.text);

// assistant message をINSERT
memoryPersistMessage(threadId, "assistant", finalText);

return res.json({
  response: finalText,
  trace,
  provisional: true,
  detailPlan,
  candidates,
  evidence,
  timestamp: new Date().toISOString(),
  decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
});
```

**注意点**:
- `memoryPersistMessage()` は既に `session_memory` と `conversation_log` の両方にINSERTする
- 重複INSERTを防ぐため、既存のINSERTチェックが必要かもしれない（ただし、`memoryPersistMessage()` は重複を許容する設計の可能性）

## 5. 監査レポート

### 入口DBモジュールのパス
- **ファイル**: `api/src/db/index.ts`
- **主要関数**:
  - `getTenmonDataDir()`: 48-54行目
  - `getDbPath(kind: DbKind)`: 65-113行目
  - `getDb(kind: DbKind)`: 172-248行目
  - `dbPrepare(kind: DbKind, sql: string)`: 266-279行目

### どのルートで何が返っているか

| エンドポイント | ファイル | 行番号 | 返却内容 | 状態 |
|---|---|---|---|---|
| `GET /api/memory/stats` | `api/src/routes/meta.ts` | 23-130 | `{session, conversation, kokuzo, training}` | ✅ 実DB参照（修正済み） |
| `POST /api/chat` | `api/src/routes/chat.ts` | 271-911 | チャット応答 | ❌ conversation_log/session_memory にINSERTしていない |

### どこが未実装で0のままか（要因）

1. **conversation_log が 0**:
   - **要因**: `api/src/routes/chat.ts` で `memoryPersistMessage()` を呼んでいない
   - **影響**: `/api/chat` で会話しても `conversation_log` に記録されない
   - **修正**: `chat.ts` のレスポンス返却直前で `memoryPersistMessage()` を呼ぶ

2. **session_memory が 0**:
   - **要因**: `api/src/routes/chat.ts` で `memoryPersistMessage()` を呼んでいない
   - **影響**: `/api/chat` で会話しても `session_memory` に記録されない
   - **修正**: `chat.ts` のレスポンス返却直前で `memoryPersistMessage()` を呼ぶ

3. **training_* が 0**:
   - **要因**: `/api/chat` では `training_*` テーブルを使用していない（設計上、`/api/training/*` でのみ使用）
   - **影響**: 通常の会話では0件のまま（これは正常）
   - **修正**: 不要（設計通り）

### 直すべきファイルと行番号（正確に）

#### 修正案B: /api/chat で conversation_log/session_memory にINSERT

**ファイル**: `api/src/routes/chat.ts`

**変更箇所1**: インポート追加（12行目付近）
```typescript
import { memoryPersistMessage } from "../memory/index.js";
```

**変更箇所2**: レスポンス返却直前（881行目の後）
```typescript
// レスポンス形式（厳守）
applyPersonaGovernor(detailPlan as any, { message: sanitized.text, trace: {} as any } as any);

// conversation_log と session_memory にINSERT
memoryPersistMessage(threadId, "user", sanitized.text);
memoryPersistMessage(threadId, "assistant", finalText);

return res.json({
  response: finalText,
  ...
});
```

**注意**: `#status`, `#menu`, `#talk`, `#search`, `#pin` などのコマンド処理でも同様にINSERTが必要かもしれないが、まずはメインのHYBRID処理から実装する。

## 6. 次の実装ステップ

### 優先度1: conversation_log/session_memory へのINSERT実装
- **ファイル**: `api/src/routes/chat.ts`
- **行番号**: 881行目の後
- **実装**: `memoryPersistMessage()` を呼ぶ
- **影響**: `/api/chat` で会話すると `conversation_log` と `session_memory` に記録される

### 優先度2: 他のレスポンス経路でもINSERT
- `buildGroundedResponse()` の返却時
- `#talk` コマンドの返却時
- エラーフォールバック時

### 優先度3: 重複INSERTの防止
- `memoryPersistMessage()` が既に呼ばれている場合はスキップ
- または、`memoryPersistMessage()` 側で重複チェックを実装
