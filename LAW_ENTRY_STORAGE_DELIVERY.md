# LawEntry 保存機能実装 - 納品物

## 目的

TENMON-ARKに「会話で確定した学習（LawEntry）を保存し、次回再提示する」機能を最小実装する。
LLM禁止・捏造ゼロ・acceptance_test.sh最優先を厳守。

## 変更差分

### 1. api/src/db/kokuzo_schema.sql（テーブル追加）

**変更内容**: `kokuzo_laws` テーブルを追加

```sql
-- kokuzo_laws (Phase40/41: LawEntry storage)
CREATE TABLE IF NOT EXISTS kokuzo_laws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId TEXT NOT NULL,
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  quote TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array of KotodamaTag
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_laws_threadId ON kokuzo_laws(threadId);
CREATE INDEX IF NOT EXISTS idx_kokuzo_laws_doc_page ON kokuzo_laws(doc, pdfPage);
```

### 2. api/src/routes/law.ts（新規作成）

**変更内容**: LawEntry 保存・取得APIを実装

#### POST /api/law/commit

- **Body**: `{ doc: string, pdfPage: number, threadId: string }`
- **処理**:
  1. バリデーション（doc, pdfPage, threadId）
  2. `kokuzo_pages` から直取得（捏造ゼロ）
  3. `extractKotodamaTags(text)` で tags を確定
  4. quote/snippet を生成（text 先頭120文字、`\f` 除去）
  5. `kokuzo_laws` に保存
- **レスポンス**: `{ ok: true, id: number }` または 4xx

#### GET /api/law/list?threadId=...

- **処理**:
  1. threadId でバリデーション
  2. `kokuzo_laws` から threadId で検索（作成日時降順）
  3. tags を JSON から配列に変換
- **レスポンス**: `{ ok: true, laws: LawEntry[] }`

### 3. api/src/index.ts（ルーター登録）

**変更内容**: law ルーターを追加

```typescript
import lawRouter from "./routes/law.js";
// ...
app.use("/api", lawRouter);
```

### 4. api/scripts/acceptance_test.sh（Phase40/41追加）

**変更内容**: Phase40/41 のテストケースを追加

#### Phase40: law commit and list

- `doc=KHS pdfPage=32` を commit できる
- list で 1件以上返る
- `laws[0]` に必要なフィールドが存在すること（doc, pdfPage, quote, tags）

#### Phase41: law recall

- 同一threadIdで list が継続して返る（最低限の recall）
- 最初の commit → list → 2回目の commit → list で、最初のエントリが残っていること

## 実装確認

### テーブル構造

- ✅ `kokuzo_laws` テーブルが作成される
- ✅ `threadId`, `doc`, `pdfPage`, `quote`, `tags`, `createdAt` フィールド
- ✅ `threadId` と `doc, pdfPage` にインデックス

### API実装

- ✅ POST /api/law/commit が実装されている
- ✅ GET /api/law/list が実装されている
- ✅ バリデーション（doc, pdfPage, threadId）
- ✅ `kokuzo_pages` から直取得（捏造ゼロ）
- ✅ `extractKotodamaTags(text)` で tags を確定
- ✅ quote/snippet を生成（text 先頭120文字、`\f` 除去）
- ✅ 失敗時は 4xx を返す（捏造ゼロ）

### テストケース

- ✅ Phase40: commit → list >= 1
- ✅ Phase41: 同一threadIdで list が継続して返る（最低限の recall）

## 期待される結果

1. `POST /api/law/commit` で `doc=KHS pdfPage=32` を保存できる
2. `GET /api/law/list?threadId=...` で保存した LawEntry が取得できる
3. 同一threadIdで複数の LawEntry が保存・取得できる
4. `scripts/acceptance_test.sh` が PASS（Phase40/41追加込み）

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# 手動確認
# 1. commit
curl -fsS http://127.0.0.1:3000/api/law/commit \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","doc":"KHS","pdfPage":32}' | jq '.'

# 2. list
curl -fsS "http://127.0.0.1:3000/api/law/list?threadId=test" | jq '.'

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"
```

## 注意事項

- LLM禁止（決定論のみ）
- 捏造ゼロ（`kokuzo_pages` から直取得）
- `acceptance_test.sh` 最優先（Phase40/41追加込み）
- 既存の機能を壊さない（最小実装）
