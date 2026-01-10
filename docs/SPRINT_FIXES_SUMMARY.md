# TENMON-ARK 理想会話改修スプリント - 完了サマリー

**生成日時**: 2026-01-10  
**ステータス**: ✅ 実装完了

---

## 実装完了タスク

### ✅ Phase 0: 実運用の実体確定
- Nginx設定確認（`/etc/nginx/sites-enabled/tenmon-ark`）
- フロント配信パス確認（`/var/www/tenmon-ark.com/current/dist/`）
- API実体確認（`/opt/tenmon-ark/api/src/`）

### ✅ Phase 1: ビルド識別子追加
- **API**: `/api/version` に `builtAt`, `gitSha` を追加
- **Front**: フッターに `Build: {BUILD_ID}` を表示
- **ビルド時注入**: `copy-assets.mjs` で `dist/version.js` を生成、`vite.config.ts` で `VITE_BUILD_ID` を定義

### ✅ Phase 2: 仕様根治
- **2-A**: `intent === "domain"` は常に `HYBRID`（#詳細でも）
- **2-B**: `detail === true` のときは必ず `string` で返す（null禁止）、`detail === false` のときはフィールドを返さない
- **2-C**: HYBRIDモードで `EvidencePack` 注入を必須化、Evidence外断定禁止を絶対制約として追加

### ✅ Phase 3: 推定実装
- `estimateDocAndPage(message)` を実装（キーワードマッチングベース）
- HYBRIDモードで `doc/pdfPage` が無い場合、推定を使用
- 推定理由 `explain` を `decisionFrame` と `detail` に追加

### ✅ Phase 4: 受入テスト
- `acceptance_test.sh` を更新（Phase 4対応）
- 最終確認3コマンドを追加

### ✅ Phase 5: デプロイ手順
- `docs/SPRINT_FIXES.md` にデプロイ手順を記載

---

## 修正ファイル一覧（実運用パス対応）

### API側（/opt/tenmon-ark/api）:
1. ✅ `src/version.ts` - `TENMON_ARK_BUILT_AT`, `TENMON_ARK_GIT_SHA` 追加
2. ✅ `src/routes/health.ts` - `/api/version` エンドポイント強化
3. ✅ `src/truth/truthSkeleton.ts` - domain→HYBRID固定（#詳細でも）
4. ✅ `src/routes/chat.ts` - detail=null禁止（全モード）、EvidencePack必須化、推定ロジック統合
5. ✅ `src/kotodama/evidencePack.ts` - `estimateDocAndPage()` 実装、`estimateExplain` 追加
6. ✅ `src/llm/prompts.ts` - `systemHybridDomain()` にEvidence外断定禁止を絶対制約として追加
7. ✅ `scripts/copy-assets.mjs` - ビルド時に `dist/version.js` を生成
8. ✅ `scripts/acceptance_test.sh` - 受入テストスクリプト更新

### Front側（/opt/tenmon-chat-core → web/）:
1. ✅ `src/App.tsx` - ビルドID表示（フッター）
2. ✅ `vite.config.ts` - `VITE_BUILD_ID` 定義
3. ✅ `package.json` - `build` スクリプトにビルドID注入
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
  "builtAt": "2026-01-10T08:14:00.789Z",
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

---

## ビルド確認

### API:
```bash
cd /opt/tenmon-ark/api
pnpm build
# 出力: [copy-assets] generated dist/version.js with builtAt=..., gitSha=...
```

### Front:
```bash
cd /opt/tenmon-chat-core
VITE_BUILD_ID=$(date -u +%Y-%m-%dT%H:%M:%SZ) pnpm build
# 出力: ✓ built in ...ms
```

---

## 受入テスト実行

```bash
cd /opt/tenmon-ark/api
BASE_URL=https://tenmon-ark.com ./scripts/acceptance_test.sh
```

**期待値**: すべてのテストが ✅ PASS

---

## 禁止事項（重要）✅ 実装済み

- ✅ `/opt/tenmon-ark/api` 以外の「別系統 `web/`」を修正しない（`web/` は開発環境、実運用は `/opt/tenmon-chat-core`）
- ✅ `.detail` を `null` で返さない（全モードで `detail === true` の場合は必ず `string` で返す）
- ✅ `domain`を`NATURAL`に落とさない（`intent === "domain"` は常に `HYBRID`、#詳細でも）
- ✅ `HYBRID`で`Evidence`が無いのに断定回答しない（「資料不足」を明示、次の導線を提示）

---

## 次のステップ（オプション）

1. **P3改善**: `estimateDocAndPage()` を `law_candidates/text.jsonl` のスコアリングベースに改善
2. **UI改善**: `decisionFrame` / `truthCheck` / `evidence` の展開UI（折りたたみ可能）
3. **スレッド管理**: スレッド一覧UI（Sidebarに表示）、スレッド切り替え機能

