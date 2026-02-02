# /api/audit 503 根絶 - 納品物

## 目的

`/api/audit` の 503 を根絶し、readiness を READY に固定する。

## 変更差分

### 1. api/src/index.ts

**変更内容**: 起動時に audit DB を必ず初期化

```typescript
// Initialize all databases at startup
console.log(`[DB-INIT] initializing databases at startup pid=${pid} uptime=${uptime}s`);
try {
  getDb("kokuzo");
  console.log(`[DB-INIT] kokuzo ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: kokuzo init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}

try {
  getDb("audit");  // ← 追加
  console.log(`[DB-INIT] audit ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: audit init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}

try {
  getDb("persona");
  console.log(`[DB-INIT] persona ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: persona init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}
```

### 2. api/src/db/index.ts

**変更内容**: DB schema 適用で例外があれば握り潰さずログに出す

```typescript
function applySchemas(database: DatabaseSync, kind: DbKind): void {
  const pid = process.pid;
  const uptime = process.uptime();
  console.log(`[DB-SCHEMA] apply start kind=${kind} schemaDir=${schemaDir} pid=${pid} uptime=${uptime}s`);
  
  try {
    const files = schemaFilesFor(kind);
    console.log(`[DB-SCHEMA] files to apply: ${files.join(", ")}`);
    
    for (const f of files) {
      const full = path.join(schemaDir, f);
      console.log(`[DB-SCHEMA] processing file: ${full}`);
      
      if (!fs.existsSync(full)) {
        console.error(`[DB-SCHEMA] FATAL: schema file not found: ${full} pid=${pid} uptime=${uptime}s`);
        throw new Error(`Schema file not found: ${full}`);
      }
      
      try {
        const sql = fs.readFileSync(full, "utf8");
        if (!sql || sql.trim().length === 0) {
          console.error(`[DB-SCHEMA] FATAL: schema file is empty: ${full} pid=${pid} uptime=${uptime}s`);
          throw new Error(`Schema file is empty: ${full}`);
        }
        console.log(`[DB-SCHEMA] executing SQL from ${f} (${sql.length} chars) pid=${pid} uptime=${uptime}s`);
        withRetry(() => database.exec(sql));
        console.log(`[DB-SCHEMA] executed ${f} successfully pid=${pid} uptime=${uptime}s`);
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        const errorCode = e?.code;
        console.error(`[DB-SCHEMA] FATAL: failed to apply ${f} pid=${pid} uptime=${uptime}s error=${errorMsg} code=${errorCode}`);
        console.error(`[DB-SCHEMA] stack:`, e?.stack);
        throw e;
      }
    }
    console.log(`[DB-SCHEMA] apply done kind=${kind} pid=${pid} uptime=${uptime}s`);
  } catch (e: any) {
    const errorMsg = e?.message || String(e);
    const errorCode = e?.code;
    console.error(`[DB-SCHEMA] FATAL: applySchemas failed for kind=${kind} pid=${pid} uptime=${uptime}s error=${errorMsg} code=${errorCode}`);
    console.error(`[DB-SCHEMA] stack:`, e?.stack);
    throw e;
  }
}
```

**ログ出力内容**:
- schema ファイルパス
- ファイル存在確認
- ファイル読み込み可否
- SQL実行成功/失敗
- エラー時の詳細スタックトレース

### 3. api/scripts/acceptance_test.sh

**変更内容**: `/api/audit` が HTTP200 かつ `readiness.dbReady.audit == true` を確認

```bash
# 最終確認
out="$(http_get_json "$BASE_URL/api/audit")"
code="${out%%$'\t'*}"
body="${out#*$'\t'}"
[ "$code" = "200" ] || (echo "[FAIL] audit not 200 (code=$code)" && echo "$body" && exit 1)
LIVE_SHA="$(echo "$body" | jq -r '.gitSha // ""')"
[ "$LIVE_SHA" = "$REPO_SHA" ] || (echo "[FAIL] audit gitSha mismatch (live=$LIVE_SHA repo=$REPO_SHA)" && exit 1)
# readiness.dbReady.audit == true を確認
echo "$body" | jq -e '(.readiness.dbReady.audit == true)' >/dev/null || (echo "[FAIL] audit dbReady.audit is not true" && echo "$body" | jq '.readiness' && exit 1)
echo "[PASS] audit dbReady.audit == true"
```

## 実装確認

### 起動時のDB初期化

- ✅ `getDb("kokuzo")` を起動時に呼び出し
- ✅ `getDb("audit")` を起動時に呼び出し
- ✅ `getDb("persona")` を起動時に呼び出し
- ✅ 初期化失敗時は `process.exit(1)` で終了

### DB schema 適用のログ

- ✅ schema ファイルパスをログ出力
- ✅ ファイル存在確認をログ出力
- ✅ ファイル読み込み可否をログ出力
- ✅ SQL実行成功/失敗をログ出力
- ✅ エラー時の詳細スタックトレースを出力

### acceptance_test.sh のゲート

- ✅ `/api/audit` が HTTP200 になるまで待つ
- ✅ `readiness.dbReady.audit == true` を確認

## 期待される結果

1. 起動時に audit DB が初期化される
2. schema 適用の詳細ログが出力される
3. `/api/audit` が 200 を返す（503 禁止）
4. `readiness.ready=true`, `readiness.stage=READY`
5. `readiness.dbReady.audit=true`
6. `acceptance_test.sh` が PASS

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# journalctl でログ確認
sudo journalctl -u tenmon-ark-api.service --since "1 minute ago" | grep -E "\[DB-INIT\]|\[DB-SCHEMA\]"

# /api/audit 確認
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok, readiness: .readiness.dbReady.audit, stage: .readiness.stage}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```
