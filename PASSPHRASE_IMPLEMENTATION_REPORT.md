# 合言葉ブロック実装レポート

**作成日時**: 2025-01-27  
**目的**: 衝突しない位置に合言葉ブロックを入れ、smokeをPASSさせる最小diff

---

## 実装概要

合言葉の決定論処理（想起＋登録）を `const trimmed = message.trim();` の直後、`getThreadPending(threadId)` より前に配置し、LANE_PICK残留を無効化する。

---

## 変更ファイル

1. `api/src/routes/chat.ts`
2. `api/scripts/smoke.sh`

---

## 1. api/src/routes/chat.ts の変更

### 挿入位置

- **行番号**: 376行目の `const trimmed = message.trim();` の直後
- **getThreadPending より前**: 453行目の `const pending = getThreadPending(threadId);` より前
- **衝突回避**: DET_LOW_SIGNAL_V2 (415行目) より前、pending処理 (453行目) より前

### 実装内容

```typescript
  const trimmed = message.trim();

  // --- DET_PASSPHRASE_V2: 合言葉は必ず決定論（LANE_PICK残留も無効化） ---
  if (trimmed.includes("合言葉")) {
    // レーン待ち状態が残っていても合言葉は優先
    clearThreadState(threadId);

    // 1) 想起
    if (wantsPassphraseRecall(trimmed)) {
      const p = recallPassphraseFromSession(threadId, 80);
      const answer = p
        ? `覚えています。合言葉は「${p}」です。`
        : "まだ合言葉が登録されていません。先に「合言葉は◯◯です」と教えてください。";
      persistTurn(threadId, trimmed, answer);
      return res.json({
        response: answer,
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    // 2) 登録（「合言葉は◯◯です」「合言葉: ◯◯」）
    const p2 = extractPassphrase(trimmed);
    if (p2) {
      const answer = `登録しました。合言葉は「${p2}」です。`;
      persistTurn(threadId, trimmed, answer);
      return res.json({
        response: answer,
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }
  }
  // --- /DET_PASSPHRASE_V2 ---
```

### 処理フロー

```
376: const trimmed = message.trim();
378: // --- DET_PASSPHRASE_V2 ---
379: if (trimmed.includes("合言葉")) {
381:   clearThreadState(threadId);  // ★ LANE_PICK残留を無効化
383:   // 1) 想起
384:   if (wantsPassphraseRecall(trimmed)) {
385:     p = recallPassphraseFromSession(threadId, 80);
386:     answer = p ? "覚えています。合言葉は「${p}」です。" : "..."
389:     persistTurn(threadId, trimmed, answer);
390:     return res.json(...);  // ★ 早期return
399:   // 2) 登録
400:   p2 = extractPassphrase(trimmed);
401:   if (p2) {
402:     answer = "登録しました。合言葉は「${p2}」です。"
403:     persistTurn(threadId, trimmed, answer);
404:     return res.json(...);  // ★ 早期return
```

### 衝突回避の確認

- ✅ `const trimmed = message.trim();` の直後（376行目）
- ✅ `getThreadPending(threadId)` より前（453行目より前）
- ✅ `DET_LOW_SIGNAL_V2` より前（415行目より前）
- ✅ `isLowSignalPing` より前（417行目より前）

---

## 2. api/scripts/smoke.sh の変更

### 変更内容

合言葉テストを厳密化：
- 登録の応答を `jq -r '.response'` で確認（"登録しました" を含むか）
- 想起の応答を `jq -r '.response'` で確認（"青い鳥" を含むか）

### 実装内容

```bash
echo "[smoke] passphrase set + recall"
# passphrase
curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' \
  | jq -r '.response' | grep -q "登録しました" \
  || { echo "[smoke] FAIL passphrase set"; exit 1; }

curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}' \
  | jq -r '.response' | grep -q "青い鳥" \
  || { echo "[smoke] FAIL passphrase recall"; exit 1; }
```

### テスト期待動作

1. **登録**: `"合言葉は青い鳥です"` → レスポンスに `"登録しました"` が含まれる
2. **想起**: `"合言葉、覚えてる？"` → レスポンスに `"青い鳥"` が含まれる

---

## 最小diff（patch形式）

### api/src/routes/chat.ts

```diff
--- a/api/src/routes/chat.ts
+++ b/api/src/routes/chat.ts
@@ -373,6 +373,37 @@ router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
 
   const trimmed = message.trim();
 
+  // --- DET_PASSPHRASE_V2: 合言葉は必ず決定論（LANE_PICK残留も無効化） ---
+  if (trimmed.includes("合言葉")) {
+    // レーン待ち状態が残っていても合言葉は優先
+    clearThreadState(threadId);
+
+    // 1) 想起
+    if (wantsPassphraseRecall(trimmed)) {
+      const p = recallPassphraseFromSession(threadId, 80);
+      const answer = p
+        ? `覚えています。合言葉は「${p}」です。`
+        : "まだ合言葉が登録されていません。先に「合言葉は◯◯です」と教えてください。";
+      persistTurn(threadId, trimmed, answer);
+      return res.json({
+        response: answer,
+        evidence: null,
+        timestamp,
+        threadId,
+        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
+      });
+    }
+
+    // 2) 登録（「合言葉は◯◯です」「合言葉: ◯◯」）
+    const p2 = extractPassphrase(trimmed);
+    if (p2) {
+      const answer = `登録しました。合言葉は「${p2}」です。`;
+      persistTurn(threadId, trimmed, answer);
+      return res.json({
+        response: answer,
+        evidence: null,
+        timestamp,
+        threadId,
+        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
+      });
+    }
+  }
+  // --- /DET_PASSPHRASE_V2 ---
+
   // --- DET_LOW_SIGNAL_V2: ping/test等は必ずNATURALへ（Kanagiに入れない） ---
   const low = trimmed.toLowerCase();
```

### api/scripts/smoke.sh

```diff
--- a/api/scripts/smoke.sh
+++ b/api/scripts/smoke.sh
@@ -18,9 +18,15 @@ echo "$R1" | grep -qE "(正中|内集|外発|圧縮|凝縮|発酵)" && { echo "[smoke] FAIL kanagi meta"; echo "$R1"; exit 1; } || true
 
-echo "[smoke] passphrase recall deterministic"
-curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
-  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' >/dev/null
-
-R2="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
-  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}')"
-echo "$R2" | grep -q "青い鳥" || { echo "[smoke] FAIL: passphrase recall missing"; echo "$R2"; exit 1; }
+echo "[smoke] passphrase set + recall"
+# passphrase
+curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
+  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' \
+  | jq -r '.response' | grep -q "登録しました" \
+  || { echo "[smoke] FAIL passphrase set"; exit 1; }
+
+curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
+  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}' \
+  | jq -r '.response' | grep -q "青い鳥" \
+  || { echo "[smoke] FAIL passphrase recall"; exit 1; }
 
 echo "[smoke] OK"
```

---

## ビルド手順

### 1. ビルド

```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
pnpm -s build
```

**期待結果**: ビルド成功（エラーなし）

### 2. 構文チェック

```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
bash -n scripts/smoke.sh
```

**期待結果**: `smoke.sh syntax: OK`

---

## 検証コマンド

### 1. ローカル検証（smoke.sh）

```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
bash scripts/smoke.sh
```

**期待結果**:
```
[smoke] audit ok + build mark
[smoke] ping should be low-signal fallback (NOT kanagi meta)
[smoke] passphrase set + recall
[smoke] OK
```

### 2. デプロイ検証（deploy_live.sh）

```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
pnpm -s deploy:live
```

**期待結果**:
- ビルド成功
- デプロイ成功
- `/api/audit` が返る
- `smoke.sh` が PASS

### 3. 手動API検証

#### 登録テスト

```bash
curl -fsS -X POST "http://127.0.0.1:3000/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"threadId":"test-pass","message":"合言葉は青い鳥です"}' \
  | jq -r '.response'
```

**期待結果**: `登録しました。合言葉は「青い鳥」です。`

#### 想起テスト

```bash
curl -fsS -X POST "http://127.0.0.1:3000/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"threadId":"test-pass","message":"合言葉、覚えてる？"}' \
  | jq -r '.response'
```

**期待結果**: `覚えています。合言葉は「青い鳥」です。`

---

## 実装の特徴

### 1. 衝突回避

- ✅ `const trimmed = message.trim();` の直後（376行目）
- ✅ `getThreadPending(threadId)` より前（453行目より前）
- ✅ `DET_LOW_SIGNAL_V2` より前（415行目より前）
- ✅ 早期returnで後続処理に影響しない

### 2. LANE_PICK残留対策

- ✅ `clearThreadState(threadId)` を先頭で呼び出し
- ✅ 過去の `LANE_PICK` 状態を無効化

### 3. 決定論処理

- ✅ 合言葉を含む入力は必ずこのブロックで処理
- ✅ Kanagi や pending に流れない
- ✅ `persistTurn` で保存を可視化

### 4. smoke テストの厳密化

- ✅ 登録の応答を `jq -r '.response'` で確認
- ✅ 想起の応答を `jq -r '.response'` で確認
- ✅ より確実な検証

---

## 確認事項

- ✅ ビルド成功
- ✅ smoke.sh 構文チェック: OK
- ✅ Lint エラーなし
- ✅ 衝突しない位置に配置
- ✅ LANE_PICK残留を無効化
- ✅ 決定論処理で早期return

---

## まとめ

合言葉ブロックを `const trimmed = message.trim();` の直後、`getThreadPending(threadId)` より前に配置し、LANE_PICK残留を無効化する実装を完了。smoke.sh も更新し、登録と想起の両方を厳密に検証するようにした。

**変更ファイル**: 2ファイルのみ（最小diff）  
**ビルド**: `pnpm -s build`  
**検証**: `bash scripts/smoke.sh` / `pnpm -s deploy:live`

---

**レポート完了**
