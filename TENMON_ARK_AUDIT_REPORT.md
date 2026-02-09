# TENMON-ARK 現状監査レポート

**作成日時**: 2025-01-27  
**対象**: CI/CD canonical 化後の状態確認

---

## 1) ファイル存在チェック

| パス | 存在 | 備考 |
|------|------|------|
| `api/src/routes/chat.ts` | ✅ yes | 1075行 |
| `api/src/routes/audit.ts` | ✅ yes | 74行 |
| `api/src/build/buildInfo.ts` | ✅ yes | 8行 |
| `api/scripts/deploy_live.sh` | ✅ yes | 74行 |
| `api/scripts/smoke.sh` | ✅ yes | 30行 |
| `.github/workflows/deploy.yml` | ✅ yes | 26行 |
| `.github/workflows/tenmon-ark-build.yml` | ✅ yes | 11行 |

**結論**: 全ファイル存在確認済み

---

## 2) chat.ts の入口順序（行番号付き）

### 処理フロー（実際の実行順序）

```
334: router.post("/chat", async (req, res) => {
364:   const messageRaw = (req.body as any)?.input || (req.body as any)?.message;
366:   const message = String(messageRaw ?? "").trim();
367:   const threadId = String(body.threadId ?? "default").trim();
368:   const timestamp = new Date().toISOString();
369:   const wantsDetail = /#詳細/.test(message);

371:   if (!message) return res.status(400).json(...);  // 空入力チェック

373:   const trimmed = message.trim();

375-398: // DET_LOW_SIGNAL_V2: ping/test等は必ずNATURALへ（Kanagiに入れない）
389:   if (isLowSignalPing) { return res.json(...); }  // ★ ping はここで return

401-421: // DET_RECALL_V1: 合言葉の決定論リコール
405:   if (wantsPassphraseRecall(trimmed)) { return res.json(...); }

423-432: // 低情報入力のフォールバック
424:   if (isLowSignal(trimmed) && !isGreetingLike(trimmed)) { return res.json(...); }

434-479: // 選択待ち状態の処理（pending state を優先）
435:   const pending = getThreadPending(threadId);
436:   if (pending === "LANE_PICK") { ... }

481-497: // Phase26: 番号選択（"1"〜"10"）
482:   const numberMatch = trimmed.match(/^\d{1,2}$/);
483:   if (numberMatch) { ... }

499-596: // #talk : 高度会話（LLM）
501:   if (trimmed.startsWith("#talk")) { ... }

598-687: // コマンド処理: #menu, #status, #search, #pin
600:   if (trimmed === "#menu") { ... }
618:   if (trimmed.startsWith("#status")) { ... }
632:   if (trimmed.startsWith("#search ")) { ... }
667:   if (trimmed.startsWith("#pin ")) { ... }

689-702: // Phase19 NATURAL lock: hello/date/help
691:   const isNaturalCommand = t === "hello" || t === "date" || t === "help" || message.includes("おはよう");
693:   if (isNaturalCommand) { return res.json(...); }

704-727: // メニューのときだけNATURALを返す（日本語判定）
708:   if (isJapanese && !wantsDetail && !hasDocPage) { ... }

729-762: // GROUNDED分岐: doc + pdfPage 指定時
735:   if (mPage && groundedDoc) { return res.json(buildGroundedResponse(...)); }

764-782: // 入力の検証・正規化
765:   const sanitized = sanitizeInput(messageRaw, "web");
776:   if (!sanitized.isValid) { return res.status(400).json(...); }

784-1075: // メイン処理: Kanagi実行
792:   const trace = await runKanagiReasoner(sanitized.text, sessionId);  // ★ Kanagi 実行
```

**重要**: `ping` は **389行目** で早期 return されるため、**Kanagi には到達しない**。

---

## 3) ping が Kanagi に入る経路の特定

### 現状の処理フロー（`message="ping"` の場合）

```
364: messageRaw = "ping"
366: message = "ping"
373: trimmed = "ping"
375-387: isLowSignalPing 判定
  - low = "ping"
  - isLowSignalPing = true (low === "ping" に一致)
389: if (isLowSignalPing) { return res.json(...); }  // ★ ここで return
```

**結論**: `ping` は **389行目** で早期 return されるため、**Kanagi (`runKanagiReasoner`) には到達しない**。

**Kanagi 実行箇所**:
- 531行目: `#talk` コマンド内（`runKanagiReasoner(q, sessionId)`）
- 792行目: メイン処理（`runKanagiReasoner(sanitized.text, sessionId)`）

**ping の経路**: `ping` → `isLowSignalPing` (389行) → `return` → **Kanagi 未到達**

---

## 4) /api/audit のレスポンスに build が乗るか

### audit.ts の返却JSONキー一覧

**503 Not Ready 時** (18-29行):
```json
{
  "ok": false,
  "timestamp": "...",
  "gitSha": "...",
  "pid": ...,
  "uptime": ...,
  "readiness": {...},
  "build": {
    "mark": "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1",
    "features": {
      "detRecallPassphrase": false,
      "memPersistLog": false,
      "lowSignalFallback": true
    }
  }
}
```

**200 OK 時** (32-43行):
```json
{
  "ok": true,
  "timestamp": "...",
  "gitSha": "...",
  "pid": ...,
  "uptime": ...,
  "readiness": {...},
  "build": {
    "mark": "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1",
    "features": {
      "detRecallPassphrase": false,
      "memPersistLog": false,
      "lowSignalFallback": true
    }
  }
}
```

**500 Error 時** (58-70行):
```json
{
  "ok": false,
  "timestamp": "...",
  "gitSha": "...",
  "error": "...",
  "pid": ...,
  "uptime": ...,
  "readiness": null,
  "build": {
    "mark": "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1",
    "features": {
      "detRecallPassphrase": false,
      "memPersistLog": false,
      "lowSignalFallback": true
    }
  }
}
```

**結論**: ✅ `/api/audit` のレスポンスに `build` キーは**全パスで存在**する。

**buildInfo.ts の内容**:
- `BUILD_MARK`: `"BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1"`
- `BUILD_FEATURES.detRecallPassphrase`: `false` ⚠️
- `BUILD_FEATURES.memPersistLog`: `false` ⚠️
- `BUILD_FEATURES.lowSignalFallback`: `true` ✅

---

## 5) smoke.sh の期待と現状差分

### smoke.sh の期待動作

**15-19行**: ping 判定
```bash
echo "[smoke] ping should be low-signal fallback (NOT kanagi meta)"
R1="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke","message":"ping"}')"
echo "$R1" | grep -q "お手伝い" || { echo "[smoke] FAIL ping fallback"; echo "$R1"; exit 1; }
echo "$R1" | grep -qE "(正中|内集|外発|圧縮|凝縮|発酵)" && { echo "[smoke] FAIL kanagi meta"; echo "$R1"; exit 1; } || true
```

**期待**:
1. `ping` のレスポンスに `"お手伝い"` が含まれる
2. `ping` のレスポンスに Kanagi メタ文字列（`正中|内集|外発|圧縮|凝縮|発酵`）が**含まれない**

**21-27行**: 合言葉判定
```bash
echo "[smoke] passphrase recall deterministic"
curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' >/dev/null

R2="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}')"
echo "$R2" | grep -q "青い鳥" || { echo "[smoke] FAIL: passphrase recall missing"; echo "$R2"; exit 1; }
```

**期待**:
1. `"合言葉は青い鳥です"` を送信
2. `"合言葉、覚えてる？"` を送信
3. レスポンスに `"青い鳥"` が含まれる

### chat.ts の現状実装

**ping 処理** (389-398行):
```typescript
if (isLowSignalPing) {
  return res.json({
    response: "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
    evidence: null,
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
  });
}
```

**合言葉処理** (405-421行):
```typescript
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
```

### 差分分析

| 項目 | smoke.sh 期待 | chat.ts 実装 | 一致 |
|------|---------------|-------------|------|
| ping → "お手伝い" | ✅ 期待 | ✅ 実装済み | ✅ |
| ping → Kanagi メタなし | ✅ 期待 | ✅ 実装済み（389行で早期return） | ✅ |
| 合言葉登録 | ✅ 期待 | ✅ 実装済み（persistTurn） | ✅ |
| 合言葉リコール | ✅ 期待 | ✅ 実装済み（recallPassphraseFromSession） | ✅ |

**結論**: ✅ **smoke.sh の期待と chat.ts の実装は一致している**。

---

## 6) 修正案（最小diffで2箇所まで）

### 問題点

1. **buildInfo.ts**: `detRecallPassphrase` と `memPersistLog` が `false` のまま（実装済みなのに）
2. **deploy_live.sh**: build mark 検証が `BUILD_MARK:DET_RECALL_V1+MEMLOG_V1` を探しているが、実際は `BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1`

### 修正案

#### 修正1: buildInfo.ts（実装済み機能を true に）

```diff
--- a/api/src/build/buildInfo.ts
+++ b/api/src/build/buildInfo.ts
@@ -1,7 +1,7 @@
 export const BUILD_MARK = "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1" as const;
 
 export const BUILD_FEATURES = {
-  detRecallPassphrase: false, // まずは false でOK（実装済みなら trueへ）
-  memPersistLog: false,
+  detRecallPassphrase: true, // ✅ 実装済み（chat.ts 405-421行）
+  memPersistLog: true, // ✅ 実装済み（persistTurn でログ出力）
   lowSignalFallback: true,
 } as const;
```

#### 修正2: deploy_live.sh（build mark 検証を完全一致に）

```diff
--- a/api/scripts/deploy_live.sh
+++ b/api/scripts/deploy_live.sh
@@ -29,7 +29,7 @@ sudo mv "$LIVE/dist.new" "$LIVE/dist"
 
 # build mark が live/dist に入っているか（これが無いなら deploy 失敗扱い）
 echo "[deploy] verify build mark in live/dist"
-grep -R "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1" "$LIVE/dist" >/dev/null \
+grep -R "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1" "$LIVE/dist" >/dev/null \
   || { echo "[deploy] ERROR: build mark missing in live/dist"; exit 1; }
```

**修正箇所数**: 2箇所（最小diff）

---

## 総括

### ✅ 正常動作確認

1. **ファイル存在**: 全ファイル存在
2. **ping 処理**: Kanagi 未到達（389行で早期return）
3. **合言葉処理**: 実装済み（405-421行）
4. **/api/audit**: `build` キー存在（全パス）

### ⚠️ 要修正

1. **buildInfo.ts**: `detRecallPassphrase` と `memPersistLog` を `true` に
2. **deploy_live.sh**: build mark 検証を完全一致に

### 📊 実装状況

| 機能 | 実装 | buildInfo.ts | 備考 |
|------|------|--------------|------|
| DET_RECALL_V1 | ✅ | `false` → `true` 要 | chat.ts 405-421行 |
| MEMLOG_V1 | ✅ | `false` → `true` 要 | persistTurn でログ出力 |
| LOW_SIGNAL_V1 | ✅ | `true` | chat.ts 389-398行 |

---

**レポート完了**
