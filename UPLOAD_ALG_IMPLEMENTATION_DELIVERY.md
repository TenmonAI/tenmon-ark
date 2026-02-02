# /api/upload + DropZone + kokuzo_algorithms + Phase42/43 実装 - 納品物

## 目的

UIのChatRoomに ドラッグ&ドロップでファイルを投下 → VPSへ保存できるようにする。

言霊秘書の解析学習で抽出した **アルゴリズム（手順/法則の連鎖）**を保存・再提示できるようにする。

すべてを acceptance_test.sh（Phase42/43）で封印する。

## 変更差分

### A) /api/upload 実装（VPSに保存）

#### 1. api/src/routes/upload.ts（新規作成）

**変更内容**: multipart/form-data を受け取り、TENMON_DATA_DIR/uploads/ に保存

**実装**:
- multer を memoryStorage で受け、サイズチェック（200MB制限）
- ファイル名 sanitize（path.basename + [a-zA-Z0-9._-] 以外は _ に置換）
- SHA256 を計算して返す
- savedPath は実パスを返さず、uploads/<safeName> で返す（情報漏洩抑制）

**応答**: `{ ok: true, fileName, savedPath, size, sha256 }`

#### 2. api/src/index.ts（ルーター登録）

**変更内容**: uploadRouter を追加

```typescript
import uploadRouter from "./routes/upload.js";
// ...
app.use("/api", uploadRouter);
```

### B) ChatRoom.tsx DropZone 実装

#### 3. client/src/pages/ChatRoom.tsx（DropZone追加）

**変更内容**: 既存UIを壊さず、新しい `/api/upload` を使用するDropZoneを追加

**実装**:
- `handleFileUploadToVPS` 関数を追加
- FormData で POST /api/upload に送信
- 成功したら toast と Event Log に記録
- 失敗時は toast.error（サイズ超過/ネット断）

**UI要件**:
- 最小のUI（枠線＋「ここにドロップ」）
- 既存の深層解析トグルや candidates/laws UIは保持

### C) kokuzo_algorithms + /api/alg/* 実装

#### 4. api/src/db/kokuzo_schema.sql（テーブル追加）

**変更内容**: `kokuzo_algorithms` テーブルを追加

```sql
CREATE TABLE IF NOT EXISTS kokuzo_algorithms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId TEXT NOT NULL,
  title TEXT NOT NULL,
  steps TEXT NOT NULL, -- JSON array
  summary TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kokuzo_algorithms_threadId ON kokuzo_algorithms(threadId);
CREATE INDEX IF NOT EXISTS idx_kokuzo_algorithms_createdAt ON kokuzo_algorithms(createdAt);
```

#### 5. api/src/routes/alg.ts（新規作成）

**変更内容**: アルゴリズム保存・取得APIを実装

**POST /api/alg/commit**:
- Body: `{ threadId: string, title: string, steps: Step[], summary?: string }`
- Step: `{ text: string, doc?: string, pdfPage?: number, tags?: string[] }`
- バリデーション：threadId/title/steps必須、steps.length>=1、textは空禁止
- doc/pdfPageがあるStepは kokuzo_pages に存在することを検証（捏造ゼロ）
- 保存：stepsはJSON.stringifyで保存
- レスポンス: `{ ok: true, id: number }` または 4xx

**GET /api/alg/list?threadId=...**:
- レスポンス: `{ ok: true, algorithms: Algorithm[] }`（createdAt desc）

#### 6. api/src/index.ts（ルーター登録）

**変更内容**: algRouter を追加

```typescript
import algRouter from "./routes/alg.js";
// ...
app.use("/api", algRouter);
```

### D) acceptance_test.sh（Phase42/43追加）

#### 7. api/scripts/acceptance_test.sh（Phase42/43追加）

**Phase42: file upload gate**:
- 小さなファイル（数バイト）をmultipartで送って ok==true を確認
- sha256 が 64hex
- size が正しい
- savedPath が uploads/ で始まる
- 実ファイルが TENMON_DATA_DIR/uploads/<name> に存在する

**Phase43: alg commit + list gate**:
- POST /api/alg/commit で以下を保存できること
  - threadId: "t43"
  - title: "KHS Breath->Sound->50->Kana"
  - steps: [{text:"天地の息が動くと音が発する", doc:"KHS", pdfPage:549}, {text:"息の形が五十連となる", doc:"KHS", pdfPage:549}]
- commit が ok==true で id:number
- list が algorithms.length>=1
- algorithms[0].steps が配列に戻せる（JSON parse）
- algorithms[0].title が正しい

## 実装確認

### /api/upload

- ✅ multipart/form-data を受け取り、TENMON_DATA_DIR/uploads/ に保存
- ✅ sha256 を計算して返す
- ✅ サイズ制限（200MB）を設ける（超過は 413）
- ✅ ファイル名は危険文字を除去して安全化（ディレクトリトラバーサル禁止）
- ✅ savedPath は実パスを返さず、uploads/<safeName> で返す

### ChatRoom.tsx DropZone

- ✅ 既存UIを壊さず追加
- ✅ ドラッグ&ドロップでファイルを投下
- ✅ POST /api/upload に FormData で送信
- ✅ 成功したら toast と Event Log に記録
- ✅ 失敗時は toast.error

### kokuzo_algorithms

- ✅ `kokuzo_algorithms` テーブルが作成される
- ✅ POST /api/alg/commit が実装されている
- ✅ GET /api/alg/list が実装されている
- ✅ バリデーション（threadId/title/steps必須、steps.length>=1、textは空禁止）
- ✅ doc/pdfPageがあるStepは kokuzo_pages に存在することを検証（捏造ゼロ）

### acceptance_test.sh

- ✅ Phase42: file upload gate
- ✅ Phase43: alg commit + list gate

## 期待される結果

1. `/api/upload` でファイルをアップロードできる
2. ChatRoom でドラッグ&ドロップでファイルをVPSに保存できる
3. `/api/alg/commit` でアルゴリズムを保存できる
4. `/api/alg/list` でアルゴリズム一覧を取得できる
5. `scripts/acceptance_test.sh` が PASS（Phase42/43追加込み）

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

# 手動確認（Phase42）
printf "hello phase42" > /tmp/up_phase42.txt
curl -fsS -F "file=@/tmp/up_phase42.txt" http://127.0.0.1:3000/api/upload | jq '.'

# 手動確認（Phase43）
curl -fsS http://127.0.0.1:3000/api/alg/commit \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t43","title":"KHS Breath->Sound->50->Kana","steps":[{"text":"天地の息が動くと音が発する","doc":"KHS","pdfPage":549},{"text":"息の形が五十連となる","doc":"KHS","pdfPage":549}]}' | jq '.'

curl -fsS "http://127.0.0.1:3000/api/alg/list?threadId=t43" | jq '.'
```

## 注意事項

- Runtime LLM禁止（決定論のみ）
- decisionFrame.ku は常に object
- Phase2/Phase4/ /api/audit を壊さない
- rg禁止（grep -R / jq -e のみ）
- scripts/acceptance_test.sh がPASSしない変更は無効
