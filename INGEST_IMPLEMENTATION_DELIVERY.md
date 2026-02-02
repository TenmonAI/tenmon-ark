# /api/ingest + UI Ingest Flow + Phase44/45 実装 - 納品物

## 目的

UIでアップロードしたPDFを、**明示承認（Confirm）**を挟んで安全に取り込み（ingest）し、取り込み完了後に docを返して #詳細 学習へ接続する。

## 変更差分

### Phase44: API（ingest request/confirm）を追加

#### 1. api/src/routes/ingest.ts（新規作成）

**POST /api/ingest/request**:
- 入力: `{ threadId: string, savedPath: string, doc: string }`
- savedPath は uploads/配下のみ許可（ディレクトリトラバーサル禁止）
- doc は [A-Z0-9._-] のみ（正規化）。空なら 400
- 実ファイルの存在を確認（無ければ 404）
- 返却: `{ ok: true, ingestId: string, confirmText: string }`
- ingestId はランダム（crypto）でOK
- リクエスト情報は `TENMON_DATA_DIR/db/ingest_requests.json` に保存（最小diff優先）

**POST /api/ingest/confirm**:
- 入力: `{ ingestId: string, confirm: boolean }`
- ingestId が無い/confirm!=true は 400
- request時に保存した情報を参照して ingest を実行
- 返却: `{ ok: true, doc: string, pagesInserted: number, emptyPages: number }`

**取り込み方式（最小）**:
- pdftotext で extract_text() を使う（重いOCRはやらない）
- doc,pdfPage,text を kokuzo_pages へ UPSERT
- text が空のページは "[NON_TEXT_PAGE_OR_OCR_FAILED]" を入れて空ページゼロ化
- 最後に FTS rebuild を1回

#### 2. api/src/index.ts（ルーター登録）

**変更内容**: ingestRouter を追加

```typescript
import ingestRouter from "./routes/ingest.js";
// ...
app.use("/api", ingestRouter);
```

### Phase45: UI（ChatRoom.tsx）に「取り込む」導線を追加

#### 3. client/src/pages/ChatRoom.tsx（ingest UI追加）

**要件**:
- DropZoneで /api/upload 成功したら、UIに「取り込む」ボタンを表示
- 押したら: /api/ingest/request を呼ぶ
- confirmText を表示して「実行」ボタン
- /api/ingest/confirm を呼ぶ
- 成功したら chat入力に自動で `doc=<doc> #詳細` を送る（または送信ボタンを提示）
- 取り込み中は spinner/disabled
- 失敗は toast.error

**実装**:
- `uploadedFileForIngest` state: アップロード成功したPDFファイル情報を保存
- `ingestRequest` state: ingest request の結果（ingestId, confirmText, doc）を保存
- `isIngesting` state: 取り込み中の状態管理
- `handleIngestRequest`: /api/ingest/request を呼ぶ
- `handleIngestConfirm`: /api/ingest/confirm を呼ぶ
- 成功時に `setInputMessage(\`doc=${data.doc} #詳細\`)` で自動入力

**UI要件**:
- 既存機能を壊さない（深層解析トグル、candidates表示、law/alg UI、file upload）
- 最小のUI（「取り込む」ボタン + 確認ダイアログ）

### acceptance封印（Phase44/45）

#### 4. api/scripts/acceptance_test.sh（Phase44/45追加）

**Phase44: ingest request/confirm gate**:
- Phase42で使う小ファイルアップロードを流用（uploads/xxx を得る）
- /api/ingest/request → ok:true & ingestId string
- /api/ingest/confirm → ok:true & pagesInserted>=1 & emptyPages==0
- DB確認：kokuzo_pages where doc=<doc> count>=1
- FTS確認：kokuzo_pages_fts が存在し検索が落ちない

**Phase45: chat integration smoke（軽め）**:
- ingest後に /api/chat で doc=<doc> pdfPage=1 を叩いて snippet length>0 が返る

## 実装確認

### /api/ingest/request

- ✅ savedPath は uploads/配下のみ許可（ディレクトリトラバーサル禁止）
- ✅ doc は [A-Z0-9._-] のみ（正規化）。空なら 400
- ✅ 実ファイルの存在を確認（無ければ 404）
- ✅ ingestId はランダム（crypto）でOK
- ✅ リクエスト情報は JSONファイルに保存

### /api/ingest/confirm

- ✅ ingestId が無い/confirm!=true は 400
- ✅ request時に保存した情報を参照して ingest を実行
- ✅ pdftotext で extract_text() を使う
- ✅ doc,pdfPage,text を kokuzo_pages へ UPSERT
- ✅ text が空のページは "[NON_TEXT_PAGE_OR_OCR_FAILED]" を入れて空ページゼロ化
- ✅ 最後に FTS rebuild を1回

### ChatRoom.tsx

- ✅ DropZoneで /api/upload 成功したら、UIに「取り込む」ボタンを表示
- ✅ 押したら: /api/ingest/request を呼ぶ
- ✅ confirmText を表示して「実行」ボタン
- ✅ /api/ingest/confirm を呼ぶ
- ✅ 成功したら chat入力に自動で `doc=<doc> #詳細` を送る
- ✅ 取り込み中は spinner/disabled
- ✅ 失敗は toast.error
- ✅ 既存機能を壊さない

### acceptance_test.sh

- ✅ Phase44: ingest request/confirm gate
- ✅ Phase45: chat integration smoke

## 期待される結果

1. `/api/ingest/request` で取り込みリクエストを作成できる
2. `/api/ingest/confirm` で取り込みを実行できる
3. ChatRoom でドラッグ&ドロップでPDFをアップロード → 「取り込む」ボタン → 確認 → 実行 → 成功時に `doc=<doc> #詳細` が自動入力される
4. `scripts/acceptance_test.sh` が PASS（Phase44/45追加込み）

## 検証方法

```bash
# VPS で実行
cd /opt/tenmon-ark-repo/api
git pull
pnpm -s build
sudo systemctl restart tenmon-ark-api.service

# acceptance_test.sh 実行
bash scripts/acceptance_test.sh
echo "EXIT=$?"

# 手動確認（Phase44）
printf "hello phase44" > /tmp/up_phase44.txt
curl -fsS -F "file=@/tmp/up_phase44.txt" http://127.0.0.1:3000/api/upload | jq '.'
# savedPath を取得して
curl -fsS http://127.0.0.1:3000/api/ingest/request \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t44","savedPath":"uploads/up_phase44.txt","doc":"TEST44"}' | jq '.'

# ingestId を取得して
curl -fsS http://127.0.0.1:3000/api/ingest/confirm \
  -H "Content-Type: application/json" \
  -d '{"ingestId":"...","confirm":true}' | jq '.'

# 手動確認（Phase45）
curl -fsS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t45","message":"doc=TEST44 pdfPage=1"}' | jq '.candidates[0].snippet'
```

## 注意事項

- Runtime LLM禁止（決定論のみ）
- decisionFrame.ku は常に object
- Phase2/Phase4/ /api/audit を壊さない
- rg禁止（grep -R / jq -e のみ）
- scripts/acceptance_test.sh がPASSしない変更は無効
- ingestは自動実行禁止（必ず Confirm を挟む）
- ingestは uploads配下のみ許可（savedPathをそのまま join しない）
- doc名はサニタイズ（危険文字除去）
- extract_text() が空なら NON_TEXT_PAGE_OR_OCR_FAILED を入れて emptyPages=0 を保証
- FTS rebuild は ingest最後に1回だけ
- restart後は /api/audit ok==true を待ってから他APIを叩く（既存の待ちロジックを再利用）
