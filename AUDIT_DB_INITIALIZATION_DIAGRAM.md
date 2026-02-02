# Audit DB 初期化フロー図

## dbReady.audit が true になる条件

```
[起動時]
    ↓
[index.ts: app.listen()]
    ↓
[markListenReady()] → listenReady = true
    ↓
[getDb("audit") が呼ばれる] ← ★問題: どこでも呼ばれていない可能性
    ↓
[getDbPath("audit")]
    ├─ [getTenmonDataDir()] → /opt/tenmon-ark-data
    └─ [defaultDbFile("audit")] → /opt/tenmon-ark-data/audit.sqlite
    ↓
[new DatabaseSync(filePath)]
    ↓
[PRAGMA 設定] (WAL, synchronous, foreign_keys, busy_timeout)
    ↓
[applySchemas(database, "audit")]
    ├─ [schemaFilesFor("audit")] → ["approval_schema.sql", "audit_schema.sql"]
    ├─ [dist/db/approval_schema.sql を読み込み]
    ├─ [dist/db/audit_schema.sql を読み込み]
    └─ [database.exec(sql)] (withRetry で SQLITE_BUSY/LOCKED リトライ)
    ↓
[markDbReady("audit")] → dbReady.audit = true
    ↓
[getReadiness().ready = true] (すべての DB が ready になったら)
```

## audit DB が初期化される呼び出し経路

### 現在の問題点

**`getDb("audit")` がどこでも呼ばれていない**

- `api/src/index.ts`: audit router は登録されているが、DB 初期化は行われていない
- `api/src/routes/audit.ts`: `getDb("audit")` を呼んでいない
- lazy initialization のため、実際に呼ばれるまで初期化されない

### 修正後の呼び出し経路

```
[index.ts: 起動時]
    ↓
[getDb("kokuzo")] → kokuzo DB 初期化
    ↓
[getDb("audit")] → audit DB 初期化 ← ★追加
    ↓
[getDb("persona")] → persona DB 初期化
    ↓
[app.listen()] → サーバー起動
```

## audit DB 初期化失敗の原因候補

### 1. schemaFilesFor("audit") の読み込みパス

**問題**: `dist/db/approval_schema.sql` または `dist/db/audit_schema.sql` が存在しない

**確認方法**:
```bash
ls -la /opt/tenmon-ark-live/dist/db/approval_schema.sql
ls -la /opt/tenmon-ark-live/dist/db/audit_schema.sql
```

**再現条件**:
- `pnpm build` で SQL ファイルがコピーされていない
- `copy-assets` スクリプトが失敗している

### 2. dist/db/*.sql の配置

**問題**: `dist/db/` ディレクトリに SQL ファイルが配置されていない

**確認方法**:
```bash
ls -la /opt/tenmon-ark-live/dist/db/*.sql
```

**再現条件**:
- `vite.config.ts` の `copy-assets` 設定が正しくない
- ビルドプロセスで SQL ファイルが除外されている

### 3. getTenmonDataDir() と /opt/tenmon-ark-data の権限

**問題**: `/opt/tenmon-ark-data` ディレクトリが作成できない、または書き込み権限がない

**確認方法**:
```bash
ls -ld /opt/tenmon-ark-data
touch /opt/tenmon-ark-data/test.sqlite
```

**再現条件**:
- `systemd` サービスが実行するユーザーに書き込み権限がない
- ディレクトリが root 所有で、サービスユーザーが書き込めない

### 4. SQLITE_BUSY/LOCKED retry の適用範囲

**問題**: `applySchemas` 内の `database.exec(sql)` で SQLITE_BUSY/LOCKED が発生し、リトライが効かない

**確認方法**:
- journalctl で `[DB] busy/locked, retrying...` ログを確認

**再現条件**:
- 複数のプロセスが同時に audit DB にアクセスしている
- WAL モードでロックが発生している

### 5. applySchemas で例外が握り潰されている

**問題**: `applySchemas` 内で例外が発生しても、ログが出ていない

**確認方法**:
- journalctl で `[DB-SCHEMA] apply start kind=audit` と `[DB-SCHEMA] apply done kind=audit` のログを確認
- 間にエラーログがないか確認

**再現条件**:
- SQL ファイルの構文エラー
- ファイル読み込みエラー（権限、存在しない）
- `withRetry` で例外が再スローされているが、ログがない

### 6. getDb("audit") が呼ばれていない

**問題**: lazy initialization のため、`getDb("audit")` が呼ばれないと初期化されない

**確認方法**:
- `index.ts` で `getDb("audit")` を呼んでいるか確認
- `audit.ts` ルートで `getDb("audit")` を呼んでいるか確認

**再現条件**:
- 起動時に audit DB を初期化するコードがない
- audit ルートが呼ばれるまで初期化されない（しかし audit ルート自体が ready チェックで 503 を返す）

## 修正方針

1. **`index.ts` で起動時に `getDb("audit")` を呼ぶ**
   - すべての DB を起動時に初期化

2. **`applySchemas` でエラーログを追加**
   - try-catch で例外をキャッチし、詳細なログを出力

3. **acceptance_test.sh で audit テーブル存在確認を追加**
   - `audit_log` テーブルなどの存在を確認

4. **権限チェックを追加**
   - `getTenmonDataDir()` でディレクトリ作成時に権限エラーをログ出力
