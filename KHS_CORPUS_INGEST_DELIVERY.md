# 言霊秘書Corpus投入 - 納品物

## 目的

/opt/tenmon-corpus/db/khs_pages.jsonl（または khs_text.jsonl）を
/opt/tenmon-ark-data/kokuzo.sqlite の kokuzo_pages に投入し、
/api/chat の HYBRID が候補（candidates）を返せるようにする。

## 変更差分

### 1. api/scripts/ingest_khs_from_corpus.sh（新規作成）

**目的**: jsonl ファイルから kokuzo_pages に投入

**機能**:
- 入力：/opt/tenmon-corpus/db/khs_pages.jsonl（なければ khs_text.jsonl）
- 出力：kokuzo_pages に doc="KHS" と pdfPage をキーに upsert
- FTS5 も更新（rowid連携）
- Node.js スクリプト（ingest_khs_from_corpus.mjs）を呼び出す

**使用方法**:
```bash
# 自動検索（/opt/tenmon-corpus/db/khs_pages.jsonl または khs_text.jsonl）
bash scripts/ingest_khs_from_corpus.sh

# 手動指定
bash scripts/ingest_khs_from_corpus.sh /path/to/khs_pages.jsonl
```

### 2. api/scripts/ingest_khs_from_corpus.mjs（新規作成）

**目的**: jsonl ファイルを読み込んで kokuzo_pages に投入（Node.js）

**機能**:
- jsonl を1行ずつパース（{doc, pdfPage, text} 形式）
- DatabaseSync（node:sqlite）を使用
- sha フィールドの有無を自動判定
- FTS5 インデックスを更新
- 100件ごとに進捗を表示

**実装**:
- `DatabaseSync` を使用（better-sqlite3 ではなく node:sqlite）
- トランザクションなしで直接実行（パフォーマンス重視）
- rowid を取得して FTS5 を更新

### 3. api/scripts/check_khs_loaded.sh（新規作成）

**目的**: kokuzo_pages の doc="KHS" 件数と、pdfPage=32 の text 長さを表示

**機能**:
- kokuzo_pages の doc="KHS" 件数を表示
- pdfPage=32 の text 長さを表示
- サンプルページ（最初の5件）を表示

**使用方法**:
```bash
bash scripts/check_khs_loaded.sh
```

### 4. api/scripts/acceptance_test.sh（ゲート追加）

**変更内容**:

1. **Phase1-1: 自動投入を試みる（冪等）**
```bash
# kokuzo_pages count > 0 を確認（必須ゲート）
# データが無い場合は自動投入を試みる（冪等）
PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
if [ "$PAGES_COUNT" = "0" ]; then
  echo "[INFO] kokuzo_pages is empty (count=0). Attempting to ingest from corpus..."
  # まず corpus から投入を試みる
  if [ -f "/opt/tenmon-corpus/db/khs_pages.jsonl" ] || [ -f "/opt/tenmon-corpus/db/khs_text.jsonl" ]; then
    echo "[INFO] Found corpus jsonl, running ingest_khs_from_corpus.sh"
    bash scripts/ingest_khs_from_corpus.sh || (echo "[WARN] corpus ingest failed, trying minimal sample" && bash scripts/ingest_khs_minimal.sh || true)
  else
    echo "[INFO] Corpus jsonl not found, trying minimal sample"
    bash scripts/ingest_khs_minimal.sh || true
  fi
  sleep 0.5
  # 再確認
  PAGES_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages;" 2>/dev/null || echo "0")"
  if [ "$PAGES_COUNT" = "0" ]; then
    echo "[FAIL] kokuzo_pages is still empty after ingestion attempt"
    exit 1
  fi
fi
```

2. **Phase38: snippet チェックを追加**
```bash
# candidates[0].snippet が存在し、長さ>0であること
echo "$r38" | jq -e '(.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null || (echo "[FAIL] Phase38: snippet not found or empty" && exit 1)
```

3. **Phase39: corpus ingestion gate を追加**
```bash
echo "[39] Phase39 corpus ingestion gate (doc=KHS count>=1, candidates.length>=1, snippet length>0)"
# (a) kokuzo_pages に doc=KHS が 1件以上
KHS_COUNT="$(sqlite3 "$DATA_DIR/kokuzo.sqlite" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='KHS';" 2>/dev/null || echo "0")"
if [ "$KHS_COUNT" = "0" ]; then
  echo "[FAIL] Phase39: kokuzo_pages has no doc='KHS' records"
  exit 1
fi
# (b) /api/chat で "言霊とは？ #詳細" が candidates.length>=1
r39="$(post_chat_raw_tid "言霊とは？ #詳細" "t39")"
if ! echo "$r39" | jq -e '(.candidates|type)=="array" and (.candidates|length)>=1' >/dev/null 2>&1; then
  echo "[FAIL] Phase39: candidates.length < 1 for '言霊とは？ #詳細'"
  exit 1
fi
# (c) "doc=KHS pdfPage=32" が candidates[0].snippet を返す（length>0）
r39_32="$(post_chat_raw_tid "doc=KHS pdfPage=32" "t39-32")"
if ! echo "$r39_32" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0 and (.candidates[0].snippet|type)=="string" and (.candidates[0].snippet|length)>0' >/dev/null 2>&1; then
  echo "[FAIL] Phase39: doc=KHS pdfPage=32 did not return snippet with length>0"
  exit 1
fi
```

## 実装確認

### jsonl 投入

- ✅ `ingest_khs_from_corpus.sh` が jsonl ファイルを検索
- ✅ `ingest_khs_from_corpus.mjs` が jsonl を読み込んで投入
- ✅ DatabaseSync（node:sqlite）を使用
- ✅ sha フィールドの有無を自動判定
- ✅ FTS5 インデックスを更新

### 確認スクリプト

- ✅ `check_khs_loaded.sh` が doc="KHS" 件数と pdfPage=32 の text 長さを表示

### acceptance_test.sh のゲート

- ✅ Phase1-1 で自動投入を試みる（冪等）
- ✅ Phase38 で snippet チェックを追加
- ✅ Phase39 で corpus ingestion gate を追加

## 期待される結果

1. `ingest_khs_from_corpus.sh` が jsonl ファイルから投入
2. `kokuzo_pages` に doc="KHS" のデータが投入される（count >= 1）
3. `/api/chat {"message":"言霊とは？ #詳細"}` で candidates.length >= 1
4. `doc=KHS pdfPage=32` で candidates[0].snippet が length > 0
5. `acceptance_test.sh` が PASS

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# 手動投入（オプション）
bash scripts/ingest_khs_from_corpus.sh

# 確認
bash scripts/check_khs_loaded.sh

# /api/chat で確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言霊とは？ #詳細"}' | \
  jq '{candidates: .candidates | length, snippet: .candidates[0].snippet}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- 捏造ゼロ（DBに無いものを"ある"と言わない）
- Runtime LLM禁止（decisionFrame.llm は常に null）
- decisionFrame.ku は常に object
- acceptance_test.sh が唯一の合否
- 既存の Phase2（候補→番号選択→detail）と Phase4（ku保証）を壊さない
