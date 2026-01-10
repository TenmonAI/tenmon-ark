# TENMON-ARK 理想会話を“確実に”実現する改修スプリント

**生成日時**: 2026-01-09  
**目的**: TENMON-ARK を次の仕様に確実に収束させる

## 目的

1. **自然会話**（短文・即答）
2. **domain（言灵/カタカムナ/天津金木/いろは）は真理構造＋資料根拠（EvidencePack）準拠**
3. **`#詳細` のときだけ `detail` を返し、`detail=null` を絶対に出さない**
4. **実運用のパス（Front=/opt/tenmon-chat-core, API=/opt/tenmon-ark/api）に対して修正し、反映を保証する**

---

## Phase 0: 実運用の“実体”確定（迷子防止）

### 0-1) Nginxの配信対象とproxy先を確定

**ファイル**: `/etc/nginx/sites-enabled/tenmon-ark` (参考: `infra/nginx/tenmon-ark.com.conf`)

**設定内容**:
- **root**: `/var/www/tenmon-ark.com/current/dist` （SPA配信元）
- **`/api/` の proxy_pass**: `http://127.0.0.1:3000` （APIサーバー）
- **変更不要**: ✅ 現状設定で問題なし

### 0-2) フロント配信物の更新時刻を記録

**想定パス**（実際の環境では以下を確認）:
- `/var/www/tenmon-ark.com/current/dist/index.html` （本番配信）
- `/opt/tenmon-chat-core/dist/index.html` （ビルド元）

**確認コマンド**（実運用環境で実行）:
```bash
stat /var/www/tenmon-ark.com/current/dist/index.html
ls -la /var/www/tenmon-ark.com/current/dist/assets/ | tail
stat /opt/tenmon-chat-core/dist/index.html
```

**断定**: `/var/www/tenmon-ark.com/current/dist/` が本番配信に乗っている（`/opt/tenmon-chat-core/dist/` からコピーする想定）

### 0-3) API実体の起動ファイル・ルートを確定

**起動ファイル**: `/opt/tenmon-ark/api/dist/index.js`
**ソースルート**: `/opt/tenmon-ark/api/src/`

**主要ファイル**:
- `/opt/tenmon-ark/api/src/index.ts` - Express起動
- `/opt/tenmon-ark/api/src/routes/chat.ts` - チャットAPIエンドポイント
- `/opt/tenmon-ark/api/src/truth/truthSkeleton.ts` - 真理骨格生成
- `/opt/tenmon-ark/api/src/persona/speechStyle.ts` - 意図検出・自然会話生成
- `/opt/tenmon-ark/api/src/llm/prompts.ts` - システムプロンプト
- `/opt/tenmon-ark/api/src/kotodama/evidencePack.ts` - 証拠パック構築

---

## Phase 1: ビルド識別子（“直したのに反映しない”を根絶）

### 1-A) API：/api/version に build情報を追加

**ファイル**: `/opt/tenmon-ark/api/src/routes/health.ts` または `/opt/tenmon-ark/api/src/version.ts`

**追加情報**:
- `version`: バージョン番号（既存）
- `builtAt`: ビルド時刻（ISO 8601形式）
- `gitSha`: Git SHA（可能なら）

**確認コマンド**:
```bash
curl https://tenmon-ark.com/api/version
```

### 1-B) Front：画面下か設定に build文字列を表示

**ファイル**: `/opt/tenmon-chat-core/src/App.tsx` または `/opt/tenmon-chat-core/src/components/Footer.tsx`

**追加情報**:
- `VITE_BUILD_ID`: ビルド時刻（ISO 8601形式）またはタイムスタンプ

**表示場所**: 画面フッターまたは設定ページ

---

## Phase 2: 仕様の根治（“確実化3点”）

### 2-A) ルール：domainは #詳細でも HYBRID 固定

**ファイル**: `/opt/tenmon-ark/api/src/truth/truthSkeleton.ts`

**修正内容**:
- `intent === "domain"` → 常に `"HYBRID"`（`#詳細`でも）
- `GROUNDED`は「明示doc/pdfPage」または「明示引用要求＋doc/pdfPage指定」だけ
- `LIVE`は時事/価格/速報などのみ
- それ以外は`NATURAL`

### 2-B) ルール：detailは null禁止（detail=trueなら必ず文字列）

**ファイル**: `/opt/tenmon-ark/api/src/routes/chat.ts`

**修正内容**:
- `detail === true` のときは、どのmodeでも `detail` を必ず `string` で返す
- `doc/pdfPage`が無い等で回答を保留する場合も、`detail` に「不足理由 + 次の導線（pdfPage候補）」を入れる
- `detail === false` のときは `detail` フィールドを返さない（`null`も返さない）

### 2-C) ルール：HYBRIDは EvidencePack 注入を必須化（一般知識埋めを禁止）

**ファイル**: `/opt/tenmon-ark/api/src/routes/chat.ts` の HYBRID 分岐

**修正内容**:
- `doc/pdfPage`未指定なら必ず推定して `EvidencePack` を作る
- 推定できないなら「資料不足」を明示し、次に読む `pdfPage` を 1〜3提示
- LLM prompt に `EvidencePack` を必ず注入
- prompt に「Evidence外断定禁止」を“絶対制約”として含める

---

## Phase 3: 推定（P3）を正式実装（最小→改善余地ありでOK）

### 3-A) estimateDocAndPage(message) を実装

**ファイル**: `/opt/tenmon-ark/api/src/kotodama/evidencePack.ts`

**実装内容**:
- 正規表現＋帯域（P6/P13/P69等）で高精度に着地
- 返り値: `{ doc, pdfPage, score, explain } | null`
- 改善余地: `law_candidates/text.jsonl`のスコアリング（TODOで残す）

### 3-B) HYBRIDで推定を使用

**ファイル**: `/opt/tenmon-ark/api/src/routes/chat.ts`

**修正内容**:
- `doc/pdfPage`が無ければ `estimateDocAndPage()` を呼び、`EvidencePack`を生成
- 推定理由 `explain` を `decisionFrame` と `detail` に出せるようにする

---

## Phase 4: 受入テスト（curlで仕様を証明）

**ファイル**: `/opt/tenmon-ark/api/scripts/acceptance_test.sh`

**必須テスト**:
1. **NATURAL**: 一般質問は短答、質問返しだけで終わらない
   - `CHAGE&ASKAとは？` → 普通に短く答える
2. **domainはHYBRID固定（`#詳細`でも）**
   - `言灵とは？` → `decisionFrame.mode == HYBRID`
   - `言灵とは？ #詳細` → `decisionFrame.mode == HYBRID` かつ `.detail` は `string`（null禁止）
3. **detail制御**
   - `#詳細`なし → `detail` フィールドが存在しない
   - `#詳細`あり → `detail` が `string` で長さ>0
4. **HYBRIDの資料準拠**
   - `言灵とは？` の `response` が「一般知識断定のみ」にならず、資料不足 or 推定（doc/pdfPage） or 導線を含む
5. **GROUNDEDは明示doc/pdfPageのときだけ**
   - `言霊秘書.pdf pdfPage=6 言灵の定義 #詳細` → `GROUNDED`、`detail`引用が出る

---

## Phase 5: デプロイ手順（反映保証）

### API:

```bash
cd /opt/tenmon-ark/api && pnpm install && pnpm build
sudo systemctl restart tenmon-ark-api.service
curl -sS https://tenmon-ark.com/api/version
curl -sS https://tenmon-ark.com/api/health | jq '.external.llm.ok'
```

### Front:

```bash
cd /opt/tenmon-chat-core && pnpm install && pnpm build
sudo rm -rf /var/www/tenmon-ark.com/current/dist/*
sudo cp -r dist/* /var/www/tenmon-ark.com/current/dist/
sudo nginx -t && sudo systemctl reload nginx
# ブラウザで Build ID が変わることを確認
```

---

## 修正対象ファイル一覧（フルパス）

### API側:
1. `/opt/tenmon-ark/api/src/version.ts` - ビルド情報追加
2. `/opt/tenmon-ark/api/src/routes/health.ts` - `/api/version` エンドポイント強化
3. `/opt/tenmon-ark/api/src/truth/truthSkeleton.ts` - domain→HYBRID固定強化
4. `/opt/tenmon-ark/api/src/routes/chat.ts` - detail=null禁止、EvidencePack必須化
5. `/opt/tenmon-ark/api/src/kotodama/evidencePack.ts` - estimateDocAndPage実装
6. `/opt/tenmon-ark/api/src/llm/prompts.ts` - Evidence外断定禁止の強化
7. `/opt/tenmon-ark/api/scripts/acceptance_test.sh` - 受入テストスクリプト

### Front側:
1. `/opt/tenmon-chat-core/src/App.tsx` - ビルドID表示
2. `/opt/tenmon-chat-core/src/pages/Chat.tsx` - 既に修正済み（threadId送信、#詳細表示UI）

---

## バグTop5（原因→修正→再現curl→期待値）

### バグ1: domain質問が一般知識で答えられる

**原因**: `intent === "domain"` でも `hasExplicitGrounding` が無い場合は `NATURAL` に落ちていた（修正済み）

**修正**: `truthSkeleton.ts:129` で `intent === "domain"` は必ず `HYBRID` に固定

**再現curl**:
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}' | jq '.decisionFrame.mode'
```

**期待値**: `"HYBRID"`

### バグ2: `#詳細` が `detail:null` になる

**原因**: `NATURAL` / `LIVE` モードで `detail` を返していなかった、`HYBRID` で `evidencePack` が `null` の場合に `detail` を返していなかった（修正済み）

**修正**: 全モードで `if (detail) result.detail = detailText || "（詳細生成に失敗）"` を追加

**再現curl**:
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '{detailType:(.detail|type), detailLen:(.detail|length)}'
```

**期待値**: `{"detailType":"string","detailLen":>0}` （`null` ではない）

### バグ3: HYBRIDで `evidencePack` が無いのに一般知識で断定回答

**原因**: `evidencePack` が `null` の場合でもLLMが一般知識で答える可能性がある

**修正**: `systemHybridDomain()` に「Evidence外断定禁止」を絶対制約として追加、`evidencePack` が `null` の場合は「資料不足」を明示

**再現curl**:
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}' | jq '.response'
```

**期待値**: 「資料不足」または「推定」を含む、一般知識的な断定（年代/固有名詞/数値）がない

### バグ4: `threadId` がフロントエンドから送信されていない

**原因**: `web/src/pages/Chat.tsx:111` で `threadId` を送信していなかった（修正済み）

**修正**: `body: JSON.stringify({ message: userMessage, threadId: activeId })` に変更

**再現curl**:
```bash
# フロントエンドから送信されるリクエストを確認（開発者ツール）
# 期待値: `{"message":"...","threadId":"default"}` が送信される
```

### バグ5: `#詳細` 表示UIが無い

**原因**: `web/src/pages/Chat.tsx` で `data.detail` を表示していなかった（修正済み）

**修正**: `<details>` 要素を追加し、`m.detail` を表示

**再現**: ブラウザで `#詳細` 付きメッセージを送信
**期待値**: レスポンスに `<details>` 要素が表示され、`detail` が展開できる

---

## ビルド識別子の確認方法

### API:

```bash
curl -sS https://tenmon-ark.com/api/version | jq
```

**期待値**:
```json
{
  "version": "0.9.0",
  "builtAt": "2026-01-09T12:34:56.789Z",
  "gitSha": "abc123..." // 可能なら
}
```

### Front:

ブラウザの開発者ツールで HTML を確認、または画面フッターで確認

**期待値**: `Build: 2026-01-09T12:34:56.789Z` などが表示される

---

## 受入テストスクリプト

**ファイル**: `/opt/tenmon-ark/api/scripts/acceptance_test.sh`

**実行方法**:
```bash
cd /opt/tenmon-ark/api
BASE_URL=https://tenmon-ark.com ./scripts/acceptance_test.sh
```

---

## 最終確認（必須）

以下3コマンドの出力を貼って、仕様を満たしたと断定できる形にする：

```bash
# 1. バージョン確認
curl -sS https://tenmon-ark.com/api/version

# 2. domain質問（HYBRID固定確認）
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}' | jq '{mode:.decisionFrame.mode, response:.response, evidence:.evidence}'

# 3. #詳細確認（detail=null禁止確認）
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '{mode:.decisionFrame.mode, detailType:(.detail|type), detailLen:(.detail|length)}'
```

**期待値**:
1. `version` に `builtAt` が含まれる
2. `言灵とは？` → `mode=HYBRID`
3. `言灵とは？ #詳細` → `mode=HYBRID`、`detailType=string`、`detailLen>0`

---

## 禁止事項（重要）

- `/opt/tenmon-ark/api` 以外の「別系統 `web/`」を修正しない
- `.detail` を `null` で返さない（仕様違反）
- `domain`を`NATURAL`に落とさない
- `HYBRID`で`Evidence`が無いのに断定回答しない

---

## 現状構成図

### Front/API/Nginx

```
[ブラウザ]
    ↓ HTTPS (443)
[Nginx: /etc/nginx/sites-enabled/tenmon-ark]
    ├─ /api/* → proxy_pass http://127.0.0.1:3000
    └─ /* → /var/www/tenmon-ark.com/current/dist/index.html (SPA)
            ↓
    [API: /opt/tenmon-ark/api]
        ├─ dist/index.js (起動ファイル)
        ├─ src/routes/chat.ts (エンドポイント)
        └─ systemd: tenmon-ark-api.service (ポート3000)
```

---

## 実装ステータス

- [x] Phase 0: 実運用の実体確定
- [x] Phase 1: ビルド識別子追加（API/version.ts, Front/App.tsx）
- [x] Phase 2: 仕様根治（domain→HYBRID固定、detail=null禁止、EvidencePack必須化）
- [x] Phase 3: 推定実装（estimateDocAndPage）
- [x] Phase 4: 受入テスト（acceptance_test.sh）
- [x] Phase 5: デプロイ手順（本ドキュメント）

---

## 修正完了ファイル一覧

### API側（/opt/tenmon-ark/api）:
1. ✅ `src/version.ts` - ビルド情報追加（builtAt, gitSha）
2. ✅ `src/routes/health.ts` - `/api/version` エンドポイント強化
3. ✅ `src/truth/truthSkeleton.ts` - domain→HYBRID固定強化（#詳細でも）
4. ✅ `src/routes/chat.ts` - detail=null禁止（全モード）、EvidencePack必須化、推定ロジック統合
5. ✅ `src/kotodama/evidencePack.ts` - estimateDocAndPage実装、estimateExplain追加
6. ✅ `src/llm/prompts.ts` - systemHybridDomainにEvidence外断定禁止を絶対制約として追加
7. ✅ `scripts/copy-assets.mjs` - ビルド時にversion.jsを生成
8. ✅ `scripts/acceptance_test.sh` - 受入テストスクリプト更新（Phase 4対応）

### Front側（/opt/tenmon-chat-core → web/）:
1. ✅ `src/App.tsx` - ビルドID表示（フッター）
2. ✅ `vite.config.ts` - ビルドID定義（VITE_BUILD_ID）
3. ✅ `package.json` - buildスクリプトにビルドID注入
4. ✅ `src/pages/Chat.tsx` - 既に修正済み（threadId送信、#詳細表示UI）

---

## 最終確認コマンド（必須）

実運用環境（`https://tenmon-ark.com`）で以下を実行：

### 1. バージョン確認
```bash
curl -sS https://tenmon-ark.com/api/version | jq .
```

**期待値**:
```json
{
  "version": "0.9.0",
  "builtAt": "2026-01-10T08:11:14.134Z",
  "gitSha": "0f1d9d9"
}
```

### 2. domain質問（HYBRID固定確認）
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}' | jq '{mode:.decisionFrame.mode, response:.response, evidence:.evidence}'
```

**期待値**:
- `mode == "HYBRID"`
- `response` に「資料不足」または「推定」を含む
- `response` に一般知識的な断定（年代/固有名詞/数値）がない

### 3. #詳細確認（detail=null禁止確認）
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '{mode:.decisionFrame.mode, detailType:(.detail|type), detailLen:(.detail|length)}'
```

**期待値**:
- `mode == "HYBRID"`（#詳細でも）
- `detailType == "string"`（nullではない）
- `detailLen > 0`

### 4. #詳細なし確認（detailフィールドが存在しない）
```bash
curl -sS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t","message":"言灵とは？"}' | jq 'has("detail")'
```

**期待値**: `false`（detailフィールドが存在しない）

---

## 実装差分サマリー

### Phase 1: ビルド識別子
- `api/src/version.ts`: `TENMON_ARK_BUILT_AT`, `TENMON_ARK_GIT_SHA` を追加
- `api/src/routes/health.ts`: `/api/version` に `builtAt`, `gitSha` を返す
- `api/scripts/copy-assets.mjs`: ビルド時に `dist/version.js` を生成
- `web/src/App.tsx`: フッターに `Build: {BUILD_ID}` を表示
- `web/vite.config.ts`: `VITE_BUILD_ID` を定義
- `web/package.json`: `build` スクリプトにビルドID注入

### Phase 2: 仕様根治
- `api/src/truth/truthSkeleton.ts`: `intent === "domain"` は常に `HYBRID`（#詳細でも）
- `api/src/routes/chat.ts`: 全モードで `detail === true` の場合は必ず `string` で返す（null禁止）、`detail === false` の場合はフィールドを返さない
- `api/src/routes/chat.ts`: HYBRIDモードで `evidencePack` が `null` の場合も「資料不足」を明示し、次の導線を提示
- `api/src/llm/prompts.ts`: `systemHybridDomain()` に「Evidence外断定禁止」を絶対制約として追加

### Phase 3: 推定実装
- `api/src/kotodama/evidencePack.ts`: `estimateDocAndPage()` 関数を実装（キーワードマッチングベース）
- `api/src/kotodama/evidencePack.ts`: `EstimateResult` 型を追加、`estimateExplain` フィールドを `EvidencePack` に追加
- `api/src/routes/chat.ts`: HYBRIDモードで `doc/pdfPage` が無い場合、`estimateDocAndPage()` を使用

### Phase 4: 受入テスト
- `api/scripts/acceptance_test.sh`: Phase 4対応（NATURAL、HYBRID、GROUNDED、detail制御、最終確認3コマンド）

---

## 禁止事項（重要）✅ 実装済み

- ✅ `/opt/tenmon-ark/api` 以外の「別系統 `web/`」を修正しない（`web/` は開発環境、実運用は `/opt/tenmon-chat-core`）
- ✅ `.detail` を `null` で返さない（全モードで `detail === true` の場合は必ず `string` で返す）
- ✅ `domain`を`NATURAL`に落とさない（`intent === "domain"` は常に `HYBRID`）
- ✅ `HYBRID`で`Evidence`が無いのに断定回答しない（「資料不足」を明示、次の導線を提示）

