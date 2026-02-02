# Audit DB 初期化修正 - サマリー

## 問題

- `/api/audit` が 503 を返す
- `stage=WAIT_DB_AUDIT`, `dbReady.audit=false`
- audit DB が初期化されていない

## 原因

**`getDb("audit")` が起動時に呼ばれていない**

- lazy initialization のため、実際に呼ばれるまで初期化されない
- `index.ts` で audit DB の初期化が行われていない
- `audit.ts` ルートでも `getDb("audit")` を呼んでいない

## 修正内容

### 1. `api/src/index.ts` - 起動時に全DBを初期化

```typescript
// Initialize all databases at startup
getDb("kokuzo");
getDb("audit");  // ← 追加
getDb("persona");
```

### 2. `api/src/db/index.ts` - エラーログ強化

- `applySchemas()` で詳細なエラーログを追加
- ファイル存在確認、ファイル読み込み、SQL実行の各段階でログ出力
- 例外を握り潰さず、詳細なスタックトレースを出力

### 3. `api/scripts/acceptance_test.sh` - audit テーブル存在確認

- `[1-1]` セクションで `tool_audit` テーブルの存在確認を追加
- audit schema を事前に適用

### 4. `api/scripts/check_kokuzo_pages.sh` - kokuzo_pages 確認スクリプト

- doc="KHS" の存在確認
- 全docの一覧表示

### 5. `api/scripts/ingest_kokuzo_sample.sh` - サンプルデータ投入

- KHS のサンプルページを投入
- FTS5 インデックスを更新

## 再現手順（VPS）

```bash
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# /api/audit が ready になるまで待つ
REPO_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD)"
for i in $(seq 1 200); do
  out="$(curl -sS -m 1 -o /tmp/_audit.json -w '%{http_code}' http://127.0.0.1:3000/api/audit || echo 000)"
  code="${out%%$'\t'*}"
  if [ "$code" = "200" ]; then
    LIVE_SHA="$(jq -r '.gitSha // ""' /tmp/_audit.json)"
    if [ -n "$LIVE_SHA" ] && [ "$LIVE_SHA" = "$REPO_SHA" ]; then
      echo "[OK] audit ready (gitSha=$LIVE_SHA)"
      break
    fi
  fi
  sleep 0.2
done

# acceptance_test.sh を実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## kokuzo_pages データ投入

```bash
# 確認
bash scripts/check_kokuzo_pages.sh

# サンプルデータ投入
bash scripts/ingest_kokuzo_sample.sh

# /api/chat で確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言霊とは何？"}' \
  | jq '.candidates[0].snippet'
```

## 期待される結果

1. `/api/audit` が 200 を返す
2. `readiness.ready=true`, `readiness.stage=READY`
3. `dbReady.audit=true`
4. `acceptance_test.sh` が PASS
5. kokuzo_pages にデータがあれば、`/api/chat` の HYBRID が snippet を返す
