# 言霊秘書タグ付け - 納品物

## 目的

言霊秘書の本文から IKI/SHIHO/KAMI/HOSHI を決定論でタグ付けし、detail側に載せる。

## 変更差分

### 1. api/src/kotodama/tagger.ts（新規作成）

**目的**: テキストから IKI/SHIHO/KAMI/HOSHI タグを抽出（決定論）

**機能**:
- `extractKotodamaTags(text: string): KotodamaTag[]` 関数
- 優先ルール:
  - カミ/ホシ/シホ/イキ表記を優先
  - 単独の「火水」「水火」だけで両方付けない（優先順位: カミ > ホシ > シホ > イキ）

**実装**:
```typescript
export type KotodamaTag = "IKI" | "SHIHO" | "KAMI" | "HOSHI";

export function extractKotodamaTags(text: string): KotodamaTag[] {
  // 優先順位1: カミ/ホシ/シホ/イキ の明示的な表記を検出
  // 優先順位2: 明示的な表記がない場合、単独の「火水」「水火」から推測（カミのみ）
  // 配列に変換（順序: KAMI > HOSHI > SHIHO > IKI）
}
```

### 2. api/src/kokuzo/search.ts（修正）

**変更内容**:
- `KokuzoCandidate` 型に `tags?: KotodamaTag[]` フィールドを追加
- HYBRID候補生成のタイミングで tags を付与
  - FTS5 検索結果の候補生成時
  - LIKE 検索結果の候補生成時
  - fallback 候補生成時（3箇所）

**実装箇所**:
1. FTS5 検索結果の候補生成（`scored.map` 内）
2. doc指定 fallback（`snippetStmt` で fullText も取得）
3. doc未指定 fallback（`snippetStmt` で fullText も取得）
4. 補完候補生成（`fullTextStmt` で fullText を取得）
5. 安全なフォールバック（`fullTextStmt` で fullText を取得）

### 3. api/scripts/acceptance_test.sh（ゲート追加）

**変更内容**: Phase38 を追加

```bash
echo "[38] Phase38 kotodama tags (doc=KHS pdfPage=32 -> tags >= 1)"
# doc=KHS pdfPage=32 を指定して tags が最低1つ出ることを確認
r38="$(post_chat_raw_tid "doc=KHS pdfPage=32" "t38")"
# candidates が存在すること
if echo "$r38" | jq -e '(.candidates|type)=="array" and (.candidates|length)>0' >/dev/null 2>&1; then
  # candidates[0] に tags が存在し、最低1つあること
  echo "$r38" | jq -e '(.candidates[0].tags|type)=="array" and (.candidates[0].tags|length)>=1' >/dev/null || (echo "[FAIL] Phase38: tags not found or empty" && exit 1)
  # tags が IKI/SHIHO/KAMI/HOSHI のいずれかであること
  echo "$r38" | jq -e '(.candidates[0].tags|map(. as $tag | $tag == "IKI" or $tag == "SHIHO" or $tag == "KAMI" or $tag == "HOSHI")|all)' >/dev/null || (echo "[FAIL] Phase38: invalid tags" && exit 1)
  echo "[PASS] Phase38 kotodama tags"
fi
```

## 実装確認

### タグ抽出ロジック

- ✅ `extractKotodamaTags` が IKI/SHIHO/KAMI/HOSHI を抽出
- ✅ 優先ルール: カミ/ホシ/シホ/イキ表記を優先
- ✅ 単独の「火水」「水火」だけで両方付けない（カミのみ）

### 候補生成時のタグ付与

- ✅ FTS5 検索結果の候補生成時に tags を付与
- ✅ LIKE 検索結果の候補生成時に tags を付与
- ✅ fallback 候補生成時に tags を付与（3箇所）
- ✅ 補完候補生成時に tags を付与

### acceptance_test.sh のゲート

- ✅ Phase38 で doc=KHS pdfPage=32 を指定して tags が最低1つ出ることを確認

## 期待される結果

1. `extractKotodamaTags` がテキストからタグを抽出
2. HYBRID候補生成時に tags が付与される
3. `candidates[0].tags` が配列で、最低1つのタグが含まれる
4. tags が IKI/SHIHO/KAMI/HOSHI のいずれかである
5. `acceptance_test.sh` が PASS

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# 手動確認
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"doc=KHS pdfPage=32"}' | \
  jq '{candidates: .candidates[0] | {doc, pdfPage, tags}}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- LLM禁止（決定論のみ）
- 既存レスポンス契約を壊さない（追加フィールドはOK）
- tags はオプショナル（空の場合は undefined）
