# TENMON-ARK FIX PACK (2026-01-26)

## 変更したファイル一覧

1. `src/routes/chat.ts`
   - `classifyNatural()` を英語対応に拡張（hello/hi/date/time/help）
   - NATURAL モードの3分岐（greeting/datetime/other）は既に実装済み

2. `package.json`
   - `build` スクリプトにログを追加（"Compiled routes and modules"）

3. `scripts/acceptance_test.sh`
   - Phase19のテストを英語対応に変更（hello/date/help）
   - 途中PASSメッセージを削除（最後に1回だけPASSを表示）

4. `src/routes/audit.ts`
   - 既にSLO固定済み（version/builtAt/gitSha/corpus/rankingPolicy/kanagiPatterns）
   - `builtAt` は string 必須（null の場合は現在時刻を使用）

## 変更内容の詳細

### 1. NATURALの英語対応

`classifyNatural()` 関数を拡張し、以下の英語メッセージにも対応：

- **greeting**: `hello`, `hi`, `hey`, `good morning`, `good afternoon`, `good evening`, `greetings`
- **datetime**: `what date`, `what time`, `what day`, `current date`, `current time`, `today`, `now`
- **other**: それ以外（`help` など）

### 2. buildの恒久修正

`package.json` の `build` スクリプトにログを追加：

```json
"build": "echo '[build] Compiling TypeScript...' && tsc && echo '[build] Compiled routes and modules' && node scripts/copy-assets.mjs"
```

これにより、ビルド時に "Compiled routes and modules" が表示され、TypeScriptコンパイルが成功したことが確認できます。

### 3. acceptance_test.shの整理

- Phase19のテストを英語対応に変更：
  - greeting: `"hello"` を使用
  - datetime: `"date"` を使用
  - other: `"help"` を使用
- 途中PASSメッセージを削除（最後に1回だけPASSを表示）

### 4. /api/auditのSLO固定

既に実装済み：
- `version`: string（TENMON_ARK_VERSION）
- `builtAt`: string 必須（null の場合は現在時刻を使用）
- `gitSha`: string | null
- `corpus`: object（khs/ktk/iroha の text.jsonl / law_candidates.jsonl）
- `rankingPolicy`: object（RANKING_POLICY値）
- `kanagiPatterns`: object（loaded/count/sourcePath）
- `timestamp`: string（ISO形式）

## 受入テストの変更

### Phase19のテスト（英語対応）

```bash
# greeting
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-greeting","message":"hello"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), llm:.decisionFrame.llm}'

# datetime
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-datetime","message":"date"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'

# other
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-smalltalk","message":"help"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'
```

## 完了条件

1. ✅ NATURALの暫定文を撤去し、3分岐を実装（greeting/datetime/other）
2. ✅ buildの恒久修正（"Compiled routes and modules" ログ追加）
3. ✅ acceptance_test.shの整理（Phase19を英語対応、途中PASS削除）
4. ✅ /api/auditのSLO固定（既に実装済み）

## VPSでの確認コマンド

```bash
cd /opt/tenmon-ark/api

# 1. ビルド確認
pnpm -s build
# 期待値: "[build] Compiled routes and modules" が表示される

# 2. 再起動
sudo systemctl restart tenmon-ark-api.service
sleep 0.6

# 3. 受入テスト実行
bash scripts/acceptance_test.sh
# 期待値: すべてのテストがPASS（最後に1回だけPASSメッセージ）

# 4. NATURAL手動確認（英語）
curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n1","message":"hello"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), llm:.decisionFrame.llm}'

curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n2","message":"date"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'

curl -sS http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"t-n3","message":"help"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type), response:.response}'
```

## 注意事項

- LLM呼び出し禁止（NATURAL含む）。`decisionFrame.llm` は常に `null`。
- `decisionFrame.ku` は全経路で object（null禁止）。
- domain回答の捏造は禁止。根拠経路は既存を壊さない。

