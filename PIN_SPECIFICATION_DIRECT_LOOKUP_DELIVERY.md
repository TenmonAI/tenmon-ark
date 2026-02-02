# ピン指定直接取得実装 - 納品物

## 目的

"doc=KHS pdfPage=32" のようなピン指定入力は、検索/FTS/LIKE/fallback を通さずに必ず kokuzo_pages から直取得し、candidates[0] が doc=KHS pdfPage=32 になるよう固定する。

## 変更差分

### api/src/kokuzo/search.ts

**変更内容**: `searchPagesForHybrid` 関数の最初でピン指定を解析し、該当する場合は直取得に切り替える

**実装**:

```typescript
export function searchPagesForHybrid(docOrNull: string | null, query: string, limit = 10): KokuzoCandidate[] {
  try {
    const db = getDb("kokuzo");

    // ピン指定の解析（doc=... pdfPage=...）
    const pinMatch = query.match(/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i);
    if (pinMatch) {
      const pinDoc = pinMatch[1];
      const pinPdfPage = parseInt(pinMatch[2], 10);
      
      // 直SQLで取得
      const pinStmt = db.prepare(`SELECT doc, pdfPage, text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`);
      const pinRow = pinStmt.get(pinDoc, pinPdfPage) as { doc: string; pdfPage: number; text: string } | undefined;
      
      if (pinRow) {
        // 見つかったら candidates をその1件で返す（先頭固定）
        const fullText = String(pinRow.text || "");
        const tags = extractKotodamaTags(fullText);
        // snippet は text 先頭120文字（既存ルールに合わせる）
        const snippet = fullText.replace(/\f/g, '').slice(0, 120);
        
        return [{
          doc: pinDoc,
          pdfPage: pinPdfPage,
          snippet: snippet || "(pin) page indexed",
          score: 1000, // ピン指定は最高スコア
          tags,
        }];
      }
      // 見つからない場合のみ、従来検索へフォールバック
    }

    // クエリを正規化（従来の検索処理）
    const normalizedQuery = normalizeHybridQuery(query);
    // ... 以下、既存の検索処理
  }
}
```

## 実装確認

### ピン指定の解析

- ✅ `doc=... pdfPage=...` のパターンマッチ（大文字小文字無視、空白許容）
- ✅ 正規表現: `/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i`

### 直取得処理

- ✅ 直SQL: `SELECT doc, pdfPage, text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?`
- ✅ 見つかったら candidates をその1件で返す（先頭固定）
- ✅ snippet は text 先頭120文字（既存ルールに合わせる、`\f` 除去）
- ✅ tags は `extractKotodamaTags(text)` を必ず通す
- ✅ score は 1000（ピン指定は最高スコア）

### フォールバック

- ✅ 見つからない場合のみ、従来検索へフォールバック
- ✅ 既存の通常検索は壊さない

## 期待される結果

1. `curl -fsS /api/chat {"message":"doc=KHS pdfPage=32"}` の `.candidates[0].pdfPage` が 32
2. `candidates[0].tags` が `length>=1`
3. `candidates[0].snippet` が存在し、長さ>0
4. `scripts/acceptance_test.sh Phase38` が PASS

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
  jq '{candidates: .candidates[0] | {doc, pdfPage, tags, snippet: (.snippet|length)}}'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- ピン指定は検索/FTS/LIKE/fallback を通さずに直取得
- 既存の通常検索は壊さない（ピン指定でない場合は従来通り）
- 変更は最小（search.ts の1箇所のみ）
- LLM禁止（決定論のみ）
