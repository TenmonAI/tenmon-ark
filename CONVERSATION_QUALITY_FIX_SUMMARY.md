# 会話成立の品質固定 - サマリー

## 目的

TENMON-ARK の「言灵/法則」質問が自然会話として成立し、かつ言灵秘書（KHS）根拠を提示できる状態に固定する。

## 実装内容

### タスクA: /api/audit 503 を根絶

#### 1. 起動時に audit DB を必ず初期化

**ファイル**: `api/src/index.ts`

```typescript
// Initialize all databases at startup
getDb("kokuzo");
getDb("audit");  // ← 追加
getDb("persona");
```

#### 2. applySchemas の失敗を詳細ログ出力

**ファイル**: `api/src/db/index.ts`

- ファイル存在確認、読み込み、SQL実行の各段階でログ出力
- 例外を握り潰さず、詳細なスタックトレースを出力
- PID/uptime を含むログで追跡可能

#### 3. dist に audit_schema.sql / approval_schema.sql が必ず入ることを確認

**ファイル**: `api/scripts/copy-assets.mjs`

- `src/db/*.sql` を `dist/db/*.sql` にコピー
- ビルド時に自動実行

#### 4. readiness が READY になったら /api/audit は HTTP200 を返す

**ファイル**: `api/src/routes/audit.ts`

- `getReadiness().ready === true` の場合、200 を返す
- `ready === false` の場合、503 を返す（stage 情報を含む）

#### 5. acceptance_test.sh に「audit DB テーブル存在」検証を追加

**ファイル**: `api/scripts/acceptance_test.sh`

- `[1-1]` セクションで `tool_audit` テーブルの存在確認
- audit schema を事前に適用

### タスクB: KHS（言灵秘書）投入の導線

#### 1. kokuzo_pages サンプル投入スクリプト

**ファイル**: `api/scripts/ingest_kokuzo_sample.sh` (作成済み)

- doc=KHS, pdfPage, text を INSERT/UPSERT
- FTS5 インデックスを更新（kokuzo_pages_fts）

#### 2. kokuzo_pages 確認スクリプト

**ファイル**: `api/scripts/check_kokuzo_pages.sh` (作成済み)

- doc別件数・上位20を表示
- KHS の存在確認

#### 3. acceptance に「KHSサンプル投入後、言霊とは？に引用が出る」E2Eケース追加

**ファイル**: `api/scripts/acceptance_test.sh`

- Phase37: KHS サンプル投入 → 質問 → evidence 確認

### タスクC: 会話成立の品質固定

#### 1. ドメイン質問で「メニュー返しだけ」を禁止

**ファイル**: `api/src/routes/chat.ts`

- ドメイン質問は必ず回答本文を返す（50文字以上）
- 根拠がある場合: `evidence` と `detailPlan.evidence` に doc/pdfPage/quote を設定
- 根拠がない場合: `evidenceStatus="not_found"` と `evidenceHint` を設定

## 会話フロー図

```
[ユーザー入力: "言霊とは何？"]
    ↓
[chat.ts: router.post("/chat")]
    ↓
[ドメイン質問検出] (isDomainQuestion = true)
    ↓
[HYBRID 処理]
    ├─ [searchPagesForHybrid()] → candidates
    ├─ [candidates.length > 0?]
    │   ├─ YES → [getPageText()] → pageText
    │   │       ├─ [pageText あり?]
    │   │       │   ├─ YES → [回答本文生成] + [evidence 設定]
    │   │       │   └─ NO  → [フォールバック回答]
    │   │       └─ [evidence: {doc, pdfPage, quote}]
    │   └─ NO  → [フォールバック回答] + [evidenceStatus="not_found"]
    ↓
[レスポンス返却]
    ├─ response: 回答本文（50文字以上）
    ├─ evidence: {doc, pdfPage, quote} または null
    ├─ detailPlan.evidence: 同上
    ├─ detailPlan.evidenceStatus: "not_found" (候補がない場合)
    └─ detailPlan.evidenceHint: 投入方法のヒント
```

## 変更ファイル一覧

1. **api/src/index.ts** - 起動時に全DBを初期化
2. **api/src/db/index.ts** - エラーログ強化
3. **api/src/routes/chat.ts** - ドメイン質問で根拠情報を追加
4. **api/scripts/acceptance_test.sh** - audit テーブル確認 + Phase37 E2E追加
5. **api/scripts/check_kokuzo_pages.sh** - doc別件数表示（上位20）
6. **api/scripts/ingest_kokuzo_sample.sh** - KHS サンプル投入（作成済み）
7. **AUDIT_DB_INITIALIZATION_DIAGRAM.md** - 初期化フロー図（作成済み）
8. **AUDIT_DB_FIX_SUMMARY.md** - 修正サマリー（作成済み）

## VPS再現手順

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

# KHS サンプル投入（オプション）
bash scripts/ingest_kokuzo_sample.sh

# 確認
bash scripts/check_kokuzo_pages.sh
```

## 追加したE2Eケース

### Phase37: KHS sample ingestion E2E

1. `scripts/ingest_kokuzo_sample.sh` を実行して KHS サンプルデータを投入
2. 「言霊とは何？」で質問
3. 回答が50文字以上であることを確認
4. candidates が存在する場合、evidence または detailPlan.evidence に doc/pdfPage が含まれることを確認
5. snippet が存在することを確認
6. decisionFrame.ku が object であることを確認

## 期待される結果

1. `/api/audit` が 200 を返す（503 禁止）
2. `readiness.ready=true`, `readiness.stage=READY`
3. `dbReady.audit=true`
4. ドメイン質問がメニューだけではなく回答を返す（50文字以上）
5. 根拠がある場合、evidence に doc/pdfPage/quote が設定される
6. 根拠がない場合、evidenceStatus と evidenceHint が設定される
7. `acceptance_test.sh` が PASS
