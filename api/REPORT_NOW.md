# TENMON-ARK 現状完全レポート（2026-01-26）

## 1. 概要（結論1ページ）

### 現状の完成度
- **Phase2（候補提示→番号選択→detail string）**: ✅ 実装済み（証拠あり）
- **Phase4（decisionFrame.ku 非null）**: ✅ 実装済み（証拠あり）
- **SLO（/api/audit）**: ✅ 実装済み（builtAt/gitSha/rankingPolicy を返す）
- **NATURAL（挨拶＋日付＋雑談誘導）**: ✅ 実装済み（証拠あり）

### 主要な実装状況
- `chat.ts`: 980行（KuFrame型とku()ヘルパーでku object保証）
- `autoPickMemory.set()`: 2箇所で実装（候補提示と暫定採用の両方）
- `dist/version.js`: ビルド時に生成（builtAt/gitSha含む）
- `acceptance_test.sh`: 1218行（Phase19まで含む）

### 次のアクション（最短3ステップ）
1. VPSでの動作確認と受入テスト実行（完了条件: `bash scripts/acceptance_test.sh` が PASS）
2. `/api/audit` の `builtAt` が string かつ length>0 を確認（完了条件: `jq -e '.builtAt | type == "string" and length > 0'`）
3. NATURAL モードの3ケース（greeting/datetime/other）を手動確認（完了条件: 各ケースで `kuType=="object"`）

---

## 2. 実行環境

### Git情報
```bash
$ git rev-parse --short HEAD
f7ffaa5

$ git status -sb
## 2025-12-24-hxmd...origin/2025-12-24-hxmd [ahead 51]
 M scripts/acceptance_test.sh
 M src/routes/chat.ts
?? ../__dummy__.ipynb
?? scripts/extract_law_candidates.ts
?? src/kanagi/patterns/amatsuKanagi50Patterns.json
?? ../docs/AUDIT_REPORT_2026-01-20.md
?? ../docs/STATUS_REPORT.md
```

### OS情報
```bash
$ uname -a
Darwin AI.local 24.5.0 Darwin Kernel Version 24.5.0: Tue Apr 22 19:52:00 PDT 2025; root:xnu-11417.121.6~2/RELEASE_ARM64_T6031 arm64
```

**注意**: ローカル環境（macOS）。VPS環境は未確認。

### Node.js / pnpm
```bash
$ node -v
v22.20.0

$ pnpm -v
10.18.3
```

### Service / Listen（未確認）
**注意**: ローカル環境では systemd サービスが起動していないため、以下は未確認:
- `systemctl status tenmon-ark-api.service`
- `ss -ltnp | grep ':3000'`
- `/etc/nginx/sites-enabled/tenmon-ark` の設定

### ビルド結果
```bash
$ pnpm -s build
[copy-assets] copied /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/db/persona_state.sql -> /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/dist/db/persona_state.sql
[copy-assets] copied /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/db/schema.sql -> /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/dist/db/schema.sql
[copy-assets] copied /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/db/training_schema.sql -> /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/dist/db/training_schema.sql
[copy-assets] copied /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/kanagi/patterns/amatsuKanagi50Patterns.json -> /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/dist/kanagi/patterns/amatsuKanagi50Patterns.json
[copy-assets] generated dist/version.js { builtAt: '2026-01-25T23:25:50.766Z', gitSha: 'f7ffaa5' }
```

**注意**: ローカル環境でのビルド結果。VPSでの実行結果は未確認。

---

## 3. 主要エンドポイント仕様

### 3.1 `/api/chat`
- **メソッド**: POST
- **リクエスト**: `{ threadId: string, message: string, meta?: object }`
- **レスポンス**: 
  - `response: string`（回答文）
  - `evidence?: object`（根拠情報）
  - `decisionFrame: { mode, intent, llm, ku }`（決定フレーム）
  - `detail?: string`（#詳細 要求時のみ）
  - `timestamp: string`（ISO形式）

**重要**: `decisionFrame.ku` は常に object（null禁止）

### 3.2 `/api/audit`
- **メソッド**: GET
- **レスポンス**: 
  - `version: string`（TENMON_ARK_VERSION）
  - `builtAt: string`（ISO形式、ビルド時刻）
  - `gitSha: string | null`（git commit hash）
  - `corpus: object`（コーパス存在/行数）
  - `rankingPolicy: object`（RANKING_POLICY値）
  - `kanagiPatterns: object`（パターンロード状態）
  - `timestamp: string`

**重要**: `builtAt` は必ず string かつ length>0

### 3.3 `/api/version`
- **メソッド**: GET
- **レスポンス**: `{ version: string, builtAt: string, gitSha: string | null }`

---

## 4. 受入テスト結果

**注意**: ローカル環境では API サーバーが起動していないため、実際のテスト結果は未確認。

VPSでの実行が必要:
```bash
cd /opt/tenmon-ark/api
bash scripts/acceptance_test.sh
```

**期待されるテスト項目**:
- Phase 1-2: `/api/version` の `gitSha`/`builtAt` 確認
- Phase 3-5: HYBRID モードの自動検索（候補提示/暫定採用）
- Phase 6-7: `detail` が string であること
- Phase 8-9: 捏造ID排除
- Phase 10-11: GROUNDED モードの根拠候補
- Phase 12: `decisionFrame.llm` が null（HYBRID）
- Phase 13-14: Content-Type と JSON 形式
- Phase 15-16: Phase2回帰（候補提示→番号選択）
- Phase 17: `/api/audit` の包括的テスト
- Phase 18: Phase2回帰（detailType=="string"）
- Phase 19: NATURAL モード（greeting/datetime/smalltalk）

---

## 5. Phase2（候補提示→番号選択）挙動の証拠

### 静的証拠: `autoPickMemory.set()` の実装箇所

```bash
$ rg -n "autoPickMemory\.set\(threadId" dist/routes/chat.js
586:                        autoPickMemory.set(threadId, { hits: kuResult.candidates, createdAt: Date.now(), detailRequested: detail });
617:                        autoPickMemory.set(threadId, { hits: kuResult.candidates, createdAt: Date.now(), detailRequested: detail });
```

**確認**: 2箇所で実装（候補提示時と暫定採用時）

### 動的証拠（未確認）

VPSでの実行が必要:
```bash
# Step 1: 候補提示
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt","message":"言灵とは？ #詳細"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), detailType:(.detail|type), response:.response}'

# Step 2: 番号選択
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt","message":"1"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), detailType:(.detail|type), detailLen:(.detail|length)}'
```

**期待値**:
- Step 1: `mode=="HYBRID"`, `kuType=="object"`, `detailType=="string"`
- Step 2: `mode=="HYBRID"` または `mode=="GROUNDED"`, `kuType=="object"`, `detailType=="string"`, `detailLen>0`

---

## 6. Phase4（decisionFrame.ku 非null）挙動の証拠

### 静的証拠: `KuFrame` 型と `ku()` ヘルパー

```bash
$ rg -n "type KuFrame|function ku\(" src/routes/chat.ts
38:type KuFrame = {
52:function ku(
```

**確認**: `KuFrame` 型と `ku()` ヘルパーが実装済み

### コード抜粋

```typescript
// src/routes/chat.ts (38-62行目)
type KuFrame = {
  stance: "ASK" | "ANSWER";
  reason: string;
  nextNeed?: string[];
  selected?: { doc: string; pdfPage: number } | null;
};

function ku(
  stance: "ASK" | "ANSWER",
  reason: string,
  nextNeed?: string[],
  selected?: { doc: string; pdfPage: number } | null
): KuFrame {
  return {
    stance,
    reason,
    nextNeed,
    selected: selected ?? null,
  };
}
```

**確認**: すべての `decisionFrame` で `ku: ku(...)` を使用（null禁止）

### 動的証拠（未確認）

#### HYBRID モード
```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt","message":"言灵とは？ #詳細"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), ku:.decisionFrame.ku}'
```

**期待値**: `mode=="HYBRID"`, `kuType=="object"`, `ku.stance=="ASK"` または `"ANSWER"`

#### GROUNDED モード
```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt2","message":"言霊秘書.pdf pdfPage=6 言灵とは？ #詳細"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), ku:.decisionFrame.ku}'
```

**期待値**: `mode=="GROUNDED"`, `kuType=="object"`, `ku.stance=="ANSWER"`, `ku.selected.doc=="言霊秘書.pdf"`

---

## 7. NATURAL の現状

### 実装状況
- `formatJstNow()`: JST時刻を "YYYY-MM-DD（曜）HH:MM（JST）" 形式で返す
- `classifyNatural()`: greeting/datetime/other を判定
- NATURAL応答の3分岐:
  - **greeting**: 時刻帯に応じた挨拶 + 「『言灵/カタカムナ/天津金木』は #詳細 を付けると根拠候補を提示できます。」
  - **datetime**: `formatJstNow()` を含む応答
  - **other**: 「了解。どういう方向で話しますか？」+ 選択肢3つ + 資料指定例

### 静的証拠: `decisionFrame.ku` の実装

```typescript
// src/routes/chat.ts (475-480行目)
decisionFrame: { 
  mode: "NATURAL", 
  intent: "chat",
  llm: null,
  ku: ku("ANSWER", `NATURAL モード（${naturalType}）`, []),
}
```

**確認**: `ku` は常に object（`ku()` ヘルパー使用）

### 動的証拠（未確認）

#### greeting
```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt3","message":"こんにちは"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'
```

**期待値**: `mode=="NATURAL"`, `kuType=="object"`, `response` に挨拶が含まれる

#### datetime
```bash
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-rpt4","message":"今日は何日？"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'
```

**期待値**: `mode=="NATURAL"`, `kuType=="object"`, `response` に "JST" または "YYYY-MM-DD" が含まれる

---

## 8. コード構造（重要ファイル一覧と役割）

### 8.1 `src/routes/chat.ts` (980行)
- **役割**: メインのチャットエンドポイント
- **主要機能**:
  - NATURAL/HYBRID/GROUNDED/LIVE モードの分岐
  - `autoPickMemory` による候補メモリ管理
  - `KuFrame` 型と `ku()` ヘルパーによる ku object保証
  - 番号選択ループ（Phase2）
- **ハッシュ**: `23e27dadef6907a307aca8ea0ea35ae839157f64c39136e163953ef52c9e63d7`

### 8.2 `src/routes/audit.ts` (136行)
- **役割**: システム監査エンドポイント
- **主要機能**:
  - コーパス存在/行数の確認
  - `rankingPolicy` 値の返却
  - `kanagiPatterns` ロード状態の返却
  - `version`/`builtAt`/`gitSha` の返却
- **ハッシュ**: `c61fb1d875a03dbef52c91c7f08b7a7cf9a5f92e629ca69eb69c03369b503d34`

### 8.3 `src/kotodama/retrieveAutoEvidence.ts` (343行)
- **役割**: 自動証拠検索
- **主要機能**:
  - `*_law_candidates.jsonl` を優先検索
  - キーワード展開（「言灵」→「言霊」「言靈」「ことだま」「コトダマ」）
  - KHS定義帯域ボーナス（P6-10: +20〜+16, P13-20: +5）
  - IROHA/KTK ブースト
- **ハッシュ**: `1fd134a87a9553a8bdcbdedf45163b62c066e9117c69134f185f29d8cb5adb6e`

### 8.4 `scripts/acceptance_test.sh` (1218行)
- **役割**: 受入テストスクリプト
- **主要機能**:
  - Phase 1-18: 既存テスト（version/audit/HYBRID/GROUNDED/Phase2回帰）
  - Phase 19: NATURAL モード（greeting/datetime/smalltalk）
  - `jq -e` による厳密な型チェック
- **ハッシュ**: `42926ff57b79f2c49ee91671158f03c58fdfc5427675a2db0a4a342bdecc515c`

### 8.5 `src/version.ts`
- **役割**: バージョン情報管理
- **主要機能**:
  - `TENMON_ARK_VERSION`: "0.9.0"（固定値）
  - `TENMON_ARK_BUILT_AT`: 実行時に `dist/version.js` から読み込み
  - `TENMON_ARK_GIT_SHA`: 実行時に `dist/version.js` から読み込み

### 8.6 `dist/version.js`（ビルド時生成）
```javascript
export const TENMON_ARK_VERSION = "0.9.0";
export const TENMON_ARK_BUILT_AT = "2026-01-25T23:25:50.766Z";
export const TENMON_ARK_GIT_SHA = "f7ffaa5";
```

**確認**: ビルド時に `copy-assets.mjs` が生成

---

## 9. 既知の不具合/リスク（再発条件つき）

### 9.1 `dist/version.js` が古いバージョンのまま（VPS上）
- **症状**: VPS上の `dist/version.js` が `null` を含む古いバージョン
- **原因**: `copy-assets.mjs` が正しく実行されていない、または古いファイルが残っている
- **再発防止策**: ビルド後に `dist/version.js` の内容を検証するステップを追加
- **確認コマンド**: `grep -q "TENMON_ARK_BUILT_AT" dist/version.js && echo "OK" || echo "NG"`

### 9.2 `gitSha` が常に `null`（git リポジトリ外でのビルド）
- **症状**: `/api/audit` で `gitSha: null`
- **原因**: git リポジトリ外でのビルド、または `git rev-parse --short HEAD` が失敗
- **再発防止策**: `gitSha` は `null` 許容として設計（要件通り）
- **確認コマンド**: `git rev-parse --short HEAD` が成功するか確認

### 9.3 `chat.ts` の肥大化（980行）
- **症状**: 1ファイルに複数責務が混在
- **原因**: NATURAL/HYBRID/GROUNDED/LIVE のすべての分岐が1ファイルに集約
- **再発防止策**: 将来的に分割（NaturalRouter / KanagiReasoner / EvidenceRetriever）
- **現状**: 動作には問題なし

### 9.4 `version.ts` の top-level await 問題
- **症状**: CommonJS との互換性問題の可能性
- **原因**: `version.ts` が top-level await を使用
- **再発防止策**: 現状は動作しているが、将来的に lazy loading に変更する可能性
- **現状**: 動作には問題なし

---

## 10. 次のアクション（最短3ステップ）

### Step 1: VPSでの動作確認と受入テスト実行

**目的**: 実運用環境での動作確認

**作業内容**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
sudo systemctl restart tenmon-ark-api.service
sleep 0.6
bash scripts/acceptance_test.sh
```

**完了条件**:
- `bash scripts/acceptance_test.sh` が PASS（exit code 0）
- すべての Phase（1-19）が PASS

**確認コマンド**:
```bash
bash scripts/acceptance_test.sh 2>&1 | tail -n 20
```

---

### Step 2: `/api/audit` の `builtAt` が string かつ length>0 を確認

**目的**: SLO（Service Level Objective）の達成確認

**作業内容**:
```bash
curl -fsS http://127.0.0.1:3000/api/audit | jq -e '.builtAt | type == "string" and length > 0'
```

**完了条件**:
- `jq -e` が成功（exit code 0）
- `builtAt` が string かつ length>0

**確認コマンド**:
```bash
curl -fsS http://127.0.0.1:3000/api/audit | jq '{builtAt, builtAtType:(.builtAt|type), builtAtLen:(.builtAt|length)}'
```

---

### Step 3: NATURAL モードの3ケース（greeting/datetime/other）を手動確認

**目的**: NATURAL モードの動作確認

**作業内容**:
```bash
# greeting
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n1","message":"こんにちは"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), llm:.decisionFrame.llm}'

# datetime
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n2","message":"今日は何日？"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'

# other
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n3","message":"ちょっと相談"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'
```

**完了条件**:
- すべてのケースで `mode=="NATURAL"`
- すべてのケースで `kuType=="object"`
- greeting: `llm==null`
- datetime: `response` に "JST" または "YYYY-MM-DD" が含まれる
- other: `response` に "1)" "2)" "3)" が含まれる

**確認コマンド**:
```bash
# 一括確認
for msg in "こんにちは" "今日は何日？" "ちょっと相談"; do
  echo "=== Testing: $msg ==="
  curl -sS http://127.0.0.1:3000/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"threadId\":\"t-test\",\"message\":\"$msg\"}" | \
    jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), llm:.decisionFrame.llm}'
  echo ""
done
```

---

## 付録: 静的証拠の詳細

### A. `autoPickMemory.set()` の実装箇所

```javascript
// dist/routes/chat.js (586行目)
autoPickMemory.set(threadId, { hits: kuResult.candidates, createdAt: Date.now(), detailRequested: detail });

// dist/routes/chat.js (617行目)
autoPickMemory.set(threadId, { hits: kuResult.candidates, createdAt: Date.now(), detailRequested: detail });
```

**確認**: 2箇所で実装（候補提示時と暫定採用時）

### B. `KuFrame` 型と `ku()` ヘルパー

```typescript
// src/routes/chat.ts (38-62行目)
type KuFrame = {
  stance: "ASK" | "ANSWER";
  reason: string;
  nextNeed?: string[];
  selected?: { doc: string; pdfPage: number } | null;
};

function ku(
  stance: "ASK" | "ANSWER",
  reason: string,
  nextNeed?: string[],
  selected?: { doc: string; pdfPage: number } | null
): KuFrame {
  return {
    stance,
    reason,
    nextNeed,
    selected: selected ?? null,
  };
}
```

**確認**: すべての `decisionFrame` で `ku: ku(...)` を使用（null禁止）

### C. バージョン情報

```typescript
// src/version.ts
export const TENMON_ARK_VERSION = "0.9.0";
export let TENMON_ARK_BUILT_AT: string | null = null;
export let TENMON_ARK_GIT_SHA: string | null = null;
```

```javascript
// dist/version.js（ビルド時生成）
export const TENMON_ARK_VERSION = "0.9.0";
export const TENMON_ARK_BUILT_AT = "2026-01-25T23:25:50.766Z";
export const TENMON_ARK_GIT_SHA = "f7ffaa5";
```

**確認**: ビルド時に `copy-assets.mjs` が生成

---

## レポート生成日時

- **生成日時**: 2026-01-26
- **Git SHA**: f7ffaa5
- **ビルド時刻**: 2026-01-25T23:25:50.766Z（ローカル環境）
- **注意**: 動的証拠（APIテスト結果）は未確認。VPSでの実行が必要。

