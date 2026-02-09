# API Stability Fixes

## 概要

API の安定性を向上させるための修正を実施しました。主な目的は以下の通りです：

1. **intent 汚染の遮断**: `trace.intent` が次の入力に混ざることを防ぐ
2. **decisionFrame.intent の固定**: サーバ側で `intent` を `"chat"` に固定
3. **未処理例外のログ化**: Node.js の未処理例外をログに記録し、プロセスを終了

## 変更内容

### 1. 例外ログ（FATAL）の追加

**ファイル**: `api/src/index.ts`

```typescript
// 例外でプロセスが落ちるのをログ化（Node）
// systemd の Restart=always とセットで動作（プロセス終了後自動再起動）
process.on("unhandledRejection", (e) => {
  console.error("[FATAL] unhandledRejection", e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("[FATAL] uncaughtException", e);
  process.exit(1);
});
```

**効果**:
- 未処理の Promise rejection と未捕捉例外をログに記録
- プロセスを終了させ、systemd の `Restart=always` により自動再起動
- `/api/audit` と `/api/chat` の疎通が落ちたときに原因がログで追える

### 2. decisionFrame.intent の固定

**ファイル**: `api/src/routes/chat.ts`

すべてのレスポンスで `decisionFrame.intent` を `"chat"` に固定しました。

**変更前**:
```typescript
decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} }
decisionFrame: { mode: "HYBRID", intent: "search", llm: null, ku: {} }
```

**変更後**:
```typescript
decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} }
decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} }
```

**影響範囲**:
- `#status` コマンド: `intent: "command"` → `intent: "chat"`
- `#search` コマンド: `intent: "search"` → `intent: "chat"`
- `#pin` コマンド: `intent: "command"` → `intent: "chat"`

**効果**:
- 入力由来の `intent` を混ぜない
- サーバ側で `intent` を完全に制御

### 3. trace の sanitize（trace.intent の削除）

**ファイル**: `api/src/routes/chat.ts`

レスポンス返却前に `trace.intent` を削除する処理を追加しました。

**実装箇所**:
1. `#talk` コマンド（547-551行目）
2. メインの HYBRID 処理（1007-1011行目）

**コード**:
```typescript
// decisionFrame.intent 汚染を遮断: trace から intent を除外（次の入力に取り込まない）
const sanitizedTrace = trace && typeof trace === "object" ? { ...trace } : trace;
if (sanitizedTrace && typeof sanitizedTrace === "object" && "intent" in sanitizedTrace) {
  delete (sanitizedTrace as any).intent;
}

return res.json({
  response: finalText,
  trace: sanitizedTrace, // intent を除外した trace
  // ...
});
```

**効果**:
- `trace.intent` が次の入力に混ざることを防ぐ
- 「intent が nginx コマンド列になる」などの汚染を止血

## 検証方法

### 1. 例外ログの確認

```bash
# 未処理例外のログを確認
sudo journalctl -u tenmon-ark-api.service | grep "\[FATAL\]"
```

### 2. decisionFrame.intent の確認

```bash
# すべてのレスポンスで intent が "chat" になっているか確認
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"#status"}' \
  | jq '.decisionFrame.intent'

# 期待値: "chat"
```

### 3. trace.intent の確認

```bash
# trace に intent が含まれていないか確認
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"test"}' \
  | jq '.trace.intent'

# 期待値: null または undefined
```

## 注意事項

### systemd の設定

`process.exit(1)` を追加したため、systemd の `Restart=always` と `RestartSec=1` が設定されていることを確認してください。

**確認方法**:
```bash
sudo systemctl cat tenmon-ark-api.service | grep -E "Restart|RestartSec"
```

**期待値**:
```
Restart=always
RestartSec=1
```

## 関連ファイル

- `api/src/index.ts`: 例外ログの追加
- `api/src/routes/chat.ts`: `decisionFrame.intent` の固定と `trace` の sanitize

## 変更履歴

- 2024-XX-XX: 初版作成
  - 例外ログ（FATAL）の追加
  - `decisionFrame.intent` の固定
  - `trace.intent` の削除
