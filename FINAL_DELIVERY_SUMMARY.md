# TENMON-ARK 会話成立品質固定 - 最終納品物

## 目的

TENMON-ARK の「言灵/法則」質問が自然会話として成立し、かつ言灵秘書（KHS）根拠を提示できる状態に固定する。

## 変更ファイル一覧

### タスクA: /api/audit 503 を根絶

1. **api/src/index.ts**
   - 起動時に `getDb("audit")` を呼び出し
   - 全DB（kokuzo, audit, persona）を起動時に初期化

2. **api/src/db/index.ts**
   - `applySchemas()` で詳細なエラーログを追加
   - ファイル存在確認、読み込み、SQL実行の各段階でログ出力
   - 例外を握り潰さず、詳細なスタックトレースを出力

3. **api/scripts/copy-assets.mjs**
   - `src/db/*.sql` を `dist/db/*.sql` にコピー（確認済み）

4. **api/src/routes/audit.ts**
   - `getReadiness().ready === true` の場合、200 を返す
   - `ready === false` の場合、503 を返す（stage 情報を含む）

5. **api/scripts/acceptance_test.sh**
   - `[1-1]` セクションで `tool_audit` テーブルの存在確認を追加
   - audit schema を事前に適用

### タスクB: KHS（言灵秘書）投入の導線

6. **api/scripts/ingest_kokuzo_sample.sh** (新規)
   - KHS サンプルページを投入
   - FTS5 インデックスを更新

7. **api/scripts/check_kokuzo_pages.sh** (新規)
   - doc別件数・上位20を表示
   - KHS の存在確認

8. **api/scripts/acceptance_test.sh**
   - Phase37: KHS サンプル投入 → 質問 → evidence 確認のE2Eケース追加

### タスクC: 会話成立の品質固定

9. **api/src/routes/chat.ts**
   - ドメイン質問で根拠情報を追加
   - `evidence` と `detailPlan.evidence` に doc/pdfPage/quote を設定
   - 根拠がない場合、`evidenceStatus` と `evidenceHint` を設定

10. **CONVERSATION_FLOW_DIAGRAM.md** (更新)
    - 会話フロー図に evidence パスを追加

11. **CONVERSATION_QUALITY_FIX_SUMMARY.md** (新規)
    - 実装内容のサマリー

12. **AUDIT_DB_INITIALIZATION_DIAGRAM.md** (新規)
    - audit DB 初期化フロー図

13. **AUDIT_DB_FIX_SUMMARY.md** (新規)
    - audit DB 修正サマリー

## 会話フロー図（入口→pending→HYBRID→evidence）

詳細は `CONVERSATION_FLOW_DIAGRAM.md` を参照。

### 要点

1. **ドメイン質問検出**
   - `naturalRouter()` で `handled=false` を返し、HYBRID 処理にフォールスルー

2. **HYBRID 処理**
   - `searchPagesForHybrid()` で候補を検索
   - 候補がある場合: `getPageText()` で本文取得 → 回答生成 + evidence 設定
   - 候補がない場合: フォールバック回答 + `evidenceStatus="not_found"`

3. **根拠情報の提示**
   - 根拠がある場合: `evidence: {doc, pdfPage, quote}` を設定
   - 根拠がない場合: `evidenceStatus` と `evidenceHint` を設定

## VPS再現手順

```bash
# 1. コードを取得
cd /opt/tenmon-ark-repo/api
git pull

# 2. ビルド
pnpm -s build

# 3. サービス再起動
sudo systemctl restart tenmon-ark-api.service

# 4. /api/audit が ready になるまで待つ
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

# 5. acceptance_test.sh を実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"

# 6. KHS サンプル投入（オプション）
bash scripts/ingest_kokuzo_sample.sh

# 7. 確認
bash scripts/check_kokuzo_pages.sh

# 8. 手動確認（言霊とは何？で引用が出る）
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言霊とは何？"}' \
  | jq '{response: .response[0:100], evidence: .evidence, candidates: .candidates[0]}'
```

## 追加したE2Eケース

### Phase37: KHS sample ingestion E2E

**目的**: KHS サンプル投入後、「言霊とは何？」で引用が出ることを確認

**手順**:
1. `scripts/ingest_kokuzo_sample.sh` を実行して KHS サンプルデータを投入
2. 「言霊とは何？」で質問
3. 回答が50文字以上であることを確認
4. candidates が存在する場合、evidence または detailPlan.evidence に doc/pdfPage が含まれることを確認
5. snippet が存在することを確認
6. decisionFrame.ku が object であることを確認

**期待される結果**:
- 回答本文が50文字以上
- evidence に `{doc: "KHS", pdfPage: 2, quote: "..."}` が設定される
- candidates[0].snippet が存在する
- decisionFrame.ku が object

## 絶対条件（破るな）

- ✅ `decisionFrame.llm` は常に null
- ✅ `decisionFrame.ku` は全経路で object（null/undefined禁止）
- ✅ `scripts/acceptance_test.sh` が PASS すること（最終権威）

## 期待される結果

1. `/api/audit` が 200 を返す（503 禁止）
2. `readiness.ready=true`, `readiness.stage=READY`
3. `dbReady.audit=true`
4. ドメイン質問がメニューだけではなく回答を返す（50文字以上）
5. 根拠がある場合、evidence に doc/pdfPage/quote が設定される
6. 根拠がない場合、evidenceStatus と evidenceHint が設定される
7. `acceptance_test.sh` が PASS
