# 言霊秘書PDF投入 - 納品物

## 目的

VPSに存在する言霊秘書PDF（KHS）を、Kokūzō DBへ投入し、/api/chat の HYBRID が本文根拠を返せる状態にする。

## 変更差分

### 1. api/scripts/find_khs_pdf.sh（新規作成）

**目的**: VPS内で「言霊秘書PDF」の実在パスを特定する

**機能**:
- 標準配置パスを優先順位順に検索
  - `/opt/tenmon-ark-repo/docs`
  - `/opt/tenmon-ark-repo/assets`
  - `/opt/tenmon-ark-data/docs`
  - `/opt/tenmon-ark-data/assets`
  - `/opt/tenmon-ark-live/docs`
  - `/opt/tenmon-ark-live/assets`
  - その他
- 複数パターンで検索:
  - ファイル名に「言霊秘書」を含む
  - ファイル名に「KHS」を含む
  - ファイル名に「kotodama」を含む
- 最初に見つかったファイルのパスを標準出力に出力

### 2. api/scripts/ingest_khs_from_pdf.sh（新規作成）

**目的**: PDFからページテキストを抽出して kokuzo_pages に投入

**機能**:
- PDF パスの決定（環境変数 > 引数 > find コマンド）
- ページ範囲指定（デフォルト: 1-3ページ）
- pdftotext でページ単位に抽出
- SQL インジェクション対策（テキストエスケープ）
- FTS5 インデックス更新
- 投入後の検証（総件数確認）

**使用方法**:
```bash
# 自動検索
bash scripts/ingest_khs_from_pdf.sh

# 手動指定
export KHS_PDF_PATH=/path/to/言霊秘書.pdf
bash scripts/ingest_khs_from_pdf.sh

# ページ範囲指定
bash scripts/ingest_khs_from_pdf.sh /path/to/言霊秘書.pdf 1 10
```

### 3. api/scripts/acceptance_test.sh（ゲート追加）

**変更内容**:

1. **Phase1-1: kokuzo_pages count > 0 を必須ゲートに変更**
```bash
# kokuzo_pages count > 0 を確認（必須ゲート）
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[FAIL] kokuzo_pages is empty (count=0). Must ingest data before proceeding."
  exit 1
fi
```

2. **Phase37: 再確認を追加**
```bash
# kokuzo_pages count > 0 は Phase1-1 で既に確認済み（FAIL で終了するため、ここには到達しない）
# 念のため再確認
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[FAIL] Phase37: kokuzo_pages is empty (should have been caught in Phase1-1)"
  exit 1
fi
```

3. **Phase2: /api/audit が 200 で readiness READY になることを封印（既存）**
```bash
# 最終確認
out="$(http_get_json "$BASE_URL/api/audit")"
code="${out%%$'\t'*}"
body="${out#*$'\t'}"
[ "$code" = "200" ] || (echo "[FAIL] audit not 200 (code=$code)" && echo "$body" && exit 1)
# readiness.dbReady.audit == true を確認
echo "$body" | jq -e '(.readiness.dbReady.audit == true)' >/dev/null || (echo "[FAIL] audit dbReady.audit is not true" && echo "$body" | jq '.readiness' && exit 1)
echo "[PASS] audit dbReady.audit == true"
```

## 実装確認

### PDF検索

- ✅ `find_khs_pdf.sh` が標準配置パスを検索
- ✅ 複数パターンで検索（言霊秘書/KHS/kotodama）
- ✅ 最初に見つかったファイルのパスを出力

### PDF投入

- ✅ `ingest_khs_from_pdf.sh` が PDF からページテキストを抽出
- ✅ デフォルトで 1-3ページを投入（導通確認用）
- ✅ SQL インジェクション対策
- ✅ FTS5 インデックス更新
- ✅ 投入後の検証（総件数確認）

### acceptance_test.sh のゲート

- ✅ Phase1-1 で kokuzo_pages count > 0 を必須ゲートに変更
- ✅ Phase2 で /api/audit が 200 で readiness READY になることを封印（既存）

## 期待される結果

1. `find_khs_pdf.sh` が PDF ファイルを検索
2. `ingest_khs_from_pdf.sh` が PDF からページテキストを抽出して投入
3. `kokuzo_pages` にデータが投入される（count > 0）
4. `/api/chat {"message":"言霊とは？ #詳細"}` で candidates が本文snippetを含む
5. `acceptance_test.sh` が PASS

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull

# PDF を検索
bash scripts/find_khs_pdf.sh

# PDF から投入（1-3ページ）
bash scripts/ingest_khs_from_pdf.sh

# 確認
sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(*) FROM kokuzo_pages;"

# /api/chat で確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言霊とは？ #詳細"}' | \
  jq '{candidates: .candidates[0] | {doc, pdfPage, snippet}}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- まず 1〜3ページだけを抽出して投入し、導通確認する（全面OCRは後回し）
- 捏造ゼロ（DBに無いものを"ある"と言わない）
- Runtime LLM禁止（decisionFrame.llm は常に null）
- decisionFrame.ku は常に object
- acceptance_test.sh が唯一の合否
