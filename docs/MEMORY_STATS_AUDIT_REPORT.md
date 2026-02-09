# /api/memory/stats 監査レポート

## 現状確認

### 対象ファイル

#### 1. `api/src/routes/meta.ts` - `/memory/stats` ハンドラ

**現在の実装（22-28行目）**:
```typescript
metaRouter.get("/memory/stats", (_req: Request, res: Response) => {
  res.json({
    session: 0,
    conversation: 0,
    kokuzo: 0
  });
});
```

**問題点**:
- 固定値 `{session: 0, conversation: 0, kokuzo: 0}` を返している
- 実DBを参照していない
- 実際の `kokuzo_pages` は 7849件存在するが、0が返される

#### 2. `api/src/db/index.ts` - DB接続ユーティリティ

**TENMON_DATA_DIR の適用箇所**:
- 48-54行目: `getTenmonDataDir()` 関数
  - デフォルト: `/opt/tenmon-ark-data`
  - 環境変数 `TENMON_DATA_DIR` で上書き可能
- 65-113行目: `getDbPath()` 関数
  - `kokuzo.sqlite` のパス: `${TENMON_DATA_DIR}/kokuzo.sqlite`
  - 実際のパス: `/opt/tenmon-ark-data/kokuzo.sqlite`

**DB接続方法**:
- 172-248行目: `getDb(kind: DbKind)` 関数
  - `getDb("kokuzo")` で `DatabaseSync` インスタンスを取得
  - シングルトンパターンでキャッシュされる

#### 3. `api/src/ops/health.ts` - 実DB参照の例

**56-59行目**: 実際にDBからCOUNT(*)を取得している例
```typescript
const db = getDb("kokuzo");
sessionRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM session_memory").get() as any)?.cnt ?? 0);
conversationRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM conversation_log").get() as any)?.cnt ?? 0);
kokuzoRows = Number((db.prepare("SELECT COUNT(1) AS cnt FROM kokuzo_core").get() as any)?.cnt ?? 0);
```

**注意点**:
- `health.ts` では `kokuzo_core` テーブルを参照しているが、実際のデータは `kokuzo_pages` テーブルにある
- `chat.ts` の `#status` コマンド（473行目）では正しく `kokuzo_pages` を参照している

#### 4. `api/src/routes/chat.ts` - 会話ログのINSERT確認

**会話ログのINSERT箇所**:
- `conversationStore.ts` の `conversationAppend()` 関数で `conversation_log` にINSERT
- `sessionMemory.ts` の `sessionMemoryAdd()` 関数で `session_memory` にINSERT
- ただし、`chat.ts` のメインハンドラでは直接INSERTしていない可能性がある

## 原因分析

### kokuzo_pages を数えていない理由

1. **固定値返却**: `meta.ts` の `/memory/stats` が固定値 `0` を返している
2. **実DB参照なし**: `getDb("kokuzo")` を使用して `SELECT COUNT(*)` を実行していない
3. **テーブル名の不一致**: `health.ts` では `kokuzo_core` を参照しているが、実際のデータは `kokuzo_pages` にある

### 修正方針（最小diff）

1. `meta.ts` の `/memory/stats` ハンドラを実DBから取得するように変更
2. 参照するテーブル:
   - `session_memory` → `session` カウント
   - `conversation_log` → `conversation` カウント
   - `kokuzo_pages` → `kokuzo` カウント（7849件を返す）
   - `training_sessions`, `training_messages`, `training_rules`, `training_freezes` → `training` オブジェクト
3. エラーハンドリング:
   - テーブルが存在しない場合は `sqlite_master` で存在確認
   - 存在しない場合は 0 を返し、WARNログを1回出力
   - try/catch で例外を握りつぶさず、ログに記録

### 影響範囲

- **変更ファイル**: `api/src/routes/meta.ts` のみ
- **影響するAPI**: `/api/memory/stats` のみ
- **既存機能への影響**: なし（固定値から実DB参照に変更するだけ）

## 実装詳細

### 参照するSQL

```sql
-- session_memory の件数
SELECT COUNT(*) AS cnt FROM session_memory;

-- conversation_log の件数
SELECT COUNT(*) AS cnt FROM conversation_log;

-- kokuzo_pages の件数（7849件を返す）
SELECT COUNT(*) AS cnt FROM kokuzo_pages;

-- training_sessions の件数
SELECT COUNT(*) AS cnt FROM training_sessions;

-- training_messages の件数
SELECT COUNT(*) AS cnt FROM training_messages;

-- training_rules の件数
SELECT COUNT(*) AS cnt FROM training_rules;

-- training_freezes の件数
SELECT COUNT(*) AS cnt FROM training_freezes;
```

### テーブル存在確認

```sql
-- テーブルが存在するか確認
SELECT name FROM sqlite_master WHERE type='table' AND name='<table_name>' LIMIT 1;
```
