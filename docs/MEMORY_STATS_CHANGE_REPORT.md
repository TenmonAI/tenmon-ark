# /api/memory/stats 変更点レポート

## 1. 現状確認

### 対象ファイル: `api/src/routes/meta.ts`

**変更前（22-28行目）**:
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
- 実DB（`kokuzo.sqlite`）を参照していない
- 実際の `kokuzo_pages` は 7849件存在するが、0が返される

## 2. 使用したDBユーティリティ

### ファイルパス: `api/src/db/index.ts`

**使用した関数**:
- `getDb(kind: DbKind): DatabaseSync` (172-248行目)
  - `getDb("kokuzo")` で `kokuzo.sqlite` の `DatabaseSync` インスタンスを取得
  - シングルトンパターンでキャッシュされる
  - DBパス: `${TENMON_DATA_DIR}/kokuzo.sqlite` (デフォルト: `/opt/tenmon-ark-data/kokuzo.sqlite`)

- `dbPrepare(kind: DbKind, sql: string)` (266-279行目)
  - `getDb(kind)` でDB接続を取得し、`prepare(sql)` でステートメントを作成
  - 自動リトライ機能付き（SQLITE_BUSY/SQLITE_LOCKED エラー時）

**参考実装例**:
- `api/src/routes/chat.ts` 473行目: `dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_pages").get()?.cnt || 0`
- `api/src/ops/health.ts` 56-59行目: 同様のパターンでCOUNT(*)を取得

## 3. 実行するSQL

### テーブル存在確認
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1;
```

### 件数取得SQL
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

## 4. APIレスポンス形式

### 変更前
```json
{
  "session": 0,
  "conversation": 0,
  "kokuzo": 0
}
```

### 変更後
```json
{
  "session": <session_memory の件数>,
  "conversation": <conversation_log の件数>,
  "kokuzo": <kokuzo_pages の件数（期待値: 7849）>,
  "training": {
    "sessions": <training_sessions の件数>,
    "messages": <training_messages の件数>,
    "rules": <training_rules の件数>,
    "freezes": <training_freezes の件数>
  }
}
```

## 5. 変更内容

### 変更ファイル: `api/src/routes/meta.ts`

**追加したインポート**:
```typescript
import { getDb, dbPrepare } from "../db/index.js";
```

**実装内容**:
1. `getDb("kokuzo")` でDB接続を取得
2. `sqlite_master` でテーブル存在確認
3. 各テーブルに対して `SELECT COUNT(*)` を実行
4. エラーハンドリング:
   - テーブルが存在しない場合は WARNログを出力し、0を返す
   - SQL実行エラー時も WARNログを出力し、0を返す
   - DB接続エラー時は ERRORログを出力し、0を返す（サービスを停止させない）

## 6. 影響範囲

- **変更ファイル**: `api/src/routes/meta.ts` のみ
- **影響するAPI**: `/api/memory/stats` のみ
- **既存機能への影響**: なし（固定値から実DB参照に変更するだけ）
- **パフォーマンス**: 各テーブルに対して1回ずつCOUNT(*)を実行（合計7回のクエリ）

## 7. 確認方法

### ローカル確認
```bash
cd /opt/tenmon-ark-repo/api
pnpm -s build
node dist/index.js &
sleep 2
curl http://127.0.0.1:3000/api/memory/stats | jq
# 期待値: {"session": <数値>, "conversation": <数値>, "kokuzo": 7849, "training": {...}}
kill %1
```

### デプロイ後確認
```bash
curl https://tenmon-ark.com/api/memory/stats | jq
# 期待値: {"session": <数値>, "conversation": <数値>, "kokuzo": 7849, "training": {...}}
```
