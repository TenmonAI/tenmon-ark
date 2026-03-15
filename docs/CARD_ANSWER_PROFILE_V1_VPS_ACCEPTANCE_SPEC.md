# CARD_ANSWER_PROFILE_V1 専用 VPS 受入テスト仕様

**対象カード**: CARD_ANSWER_PROFILE_V1（answerLength / answerMode / answerFrame 導入）  
**目的**: 実装前後で比較可能にし、body 未指定時の後方互換を最優先で検証する。  
**方針**: コードは書かず、テスト観点と curl 等のコマンド案のみ記載する。

---

# 1. テスト観点一覧

| 観点 | 内容 | 優先度 |
|------|------|--------|
| **後方互換** | body に answerLength / answerMode / answerFrame を一切渡さないとき、応答本文・routeReason・response 長が **実装前と同等** であること。 | 最優先 |
| **ku 記録** | 実装後、返却 JSON の `decisionFrame.ku` に `answerLength` / `answerMode` / `answerFrame` が存在すること（未指定時は null または未設定でよい、仕様に合わせる）。 | 高 |
| **answerLength の効き** | body で `answerLength: "short"` を渡したとき、応答文字数が短め（目安 180 字以内）になること。`answerLength: "long"` で長め（350 字超が許容されること）になること。 | 高 |
| **answerMode の効き** | body で `answerMode: "support"` / `"define"` / `"analysis"` を渡したとき、ku にその値が記録され、既定値表に従った answerLength / answerFrame が補完されること。 | 高 |
| **answerFrame の効き** | body で `answerFrame: "one_step"` や `"statement_plus_one_question"` を渡したとき、ku に記録されること。long でないときに `d_delta_s_one_step` を渡すと、内部で落とされた値が ku に記録されること。 | 中 |
| **比較可能性** | 同一 threadId・同一 message で「body 未指定」と「body に 3 項目指定」を叩き、response 長や ku の差が観測できること。 | 中 |

---

# 2. 環境・前提

- **エンドポイント**: `POST /api/chat`（VPS の BASE_URL は環境に合わせて置換。例: `https://tenmon-ark.com` または `http://127.0.0.1:3000`）
- **必須 body**: `threadId`, `message` は既存どおり必須。`answerLength` / `answerMode` / `answerFrame` は任意。
- **実装前のベースライン**: 本カード実装前に、下記「後方互換用」の curl を実行し、**response 本文の文字数** と **decisionFrame.ku の有無・中身** を記録しておく。実装後、同一コマンドで同じ程度の挙動であることを確認する。

---

# 3. 後方互換検証（最優先）

**観点**: body に answerLength / answerMode / answerFrame を付けないリクエストが、実装前後で同等の応答になること。

## 3.1 一般会話（NATURAL 系）

```bash
# 実装前・実装後の両方で実行し、response 長と ku を比較
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"acc-profile-baseline-1","message":"いまの気持ちを聞いてほしい"}' \
  | jq -r '.response | length as $n | "response_length: \($n)"'
```

**確認**: 実装後も `response_length` が実装前と同程度（大きく増えていない・350 前後以下であること）。また `jq '.decisionFrame.ku'` で ku が存在し、実装後は `answerLength` / `answerMode` / `answerFrame` が null または未設定であること（仕様どおり）。

## 3.2 定義寄り（define に流れうるメッセージ）

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"acc-profile-baseline-2","message":"言霊とは何ですか"}' \
  | jq -r '.response | length as $n | "response_length: \($n)"'
```

**確認**: 実装前後で response 長が同程度であること。

## 3.3 短文・低シグナル（固定応答ルート）

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"acc-profile-baseline-3","message":"ping"}' \
  | jq -r '.response'
```

**確認**: 実装後も同じ固定文（「了解しました。何かお手伝い…」等）が返ること。

---

# 4. decisionFrame.ku の 3 項目確認

**観点**: 返却 JSON の `decisionFrame.ku` に `answerLength` / `answerMode` / `answerFrame` が含まれること。

## 4.1 body 未指定時（実装後）

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"acc-ku-none","message":"今日はどう過ごす？"}' \
  | jq '.decisionFrame.ku | { answerLength, answerMode, answerFrame }'
```

**期待**: 3 キーが存在し、未指定時は null またはキーなし（仕様に合わせる）。実装で「未指定なら ku に載せない」の場合はキーなしでも可。

## 4.2 body で 3 項目指定時

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId":"acc-ku-all",
    "message":"いまの気持ちを聞いてほしい",
    "answerLength":"short",
    "answerMode":"support",
    "answerFrame":"one_step"
  }' \
  | jq '.decisionFrame.ku | { answerLength, answerMode, answerFrame }'
```

**期待**: `answerLength: "short"`, `answerMode: "support"`, `answerFrame: "one_step"` が含まれる。

---

# 5. support / define / analysis の 3 ケース

## 5.1 support（相談・一点に整える）

**観点**: answerMode: "support" で、既定で short + one_step または statement_plus_one_question が効くこと。応答が短めになること。

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId":"acc-mode-support",
    "message":"どうすればいいか迷っている",
    "answerMode":"support"
  }' \
  | jq '{
      response_length: (.response | length),
      ku: .decisionFrame.ku | { answerLength, answerMode, answerFrame }
    }'
```

**確認**: `decisionFrame.ku.answerMode` が `"support"`。`answerLength` は既定で short（または補完後の値）。`response_length` が 350 以下程度（short なら 180 前後以下が望ましい）。

## 5.2 define（定義・説明）

**観点**: answerMode: "define" で、既定で medium + statement_plus_one_question が効くこと。ku に記録されること。

```bash
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId":"acc-mode-define",
    "message":"カタカムナとは何か一言で",
    "answerMode":"define"
  }' \
  | jq '{
      response_length: (.response | length),
      ku: .decisionFrame.ku | { answerLength, answerMode, answerFrame }
    }'
```

**確認**: `decisionFrame.ku.answerMode` が `"define"`。`answerLength` は medium（または補完後の値）。`answerFrame` は statement_plus_one_question（または補完後の値）。

## 5.3 analysis（分析・中〜長文）

**観点**: answerMode: "analysis" で、既定で medium。answerLength: "long" を併せると長文・d_delta_s_one_step が有効になること。

```bash
# analysis + 既定（medium）
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId":"acc-mode-analysis",
    "message":"言霊とイロハの関係を整理して",
    "answerMode":"analysis"
  }' \
  | jq '{
      response_length: (.response | length),
      ku: .decisionFrame.ku | { answerLength, answerMode, answerFrame }
    }'
```

**確認**: `answerMode: "analysis"`、`answerLength` は medium（または補完値）。

```bash
# analysis + long + d_delta_s_one_step（長文枠有効）
curl -sS -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId":"acc-mode-analysis-long",
    "message":"言霊とイロハの関係を整理して",
    "answerMode":"analysis",
    "answerLength":"long",
    "answerFrame":"d_delta_s_one_step"
  }' \
  | jq '{
      response_length: (.response | length),
      ku: .decisionFrame.ku | { answerLength, answerMode, answerFrame }
    }'
```

**確認**: `answerLength: "long"`, `answerFrame: "d_delta_s_one_step"` が ku に記録される。`response_length` が 350 を超え得る（maxLength 600 等が効いている場合）。

---

# 6. 実装前後の比較手順（推奨）

1. **実装前にベースライン取得**  
   - 上記 §3 の 3 本の curl（body 未指定）を実行し、`response` の文字数と先頭 100 字程度をメモまたは保存する。  
   - `decisionFrame.ku` の有無をメモする（実装前は 3 項目は存在しない想定）。

2. **本カードをデプロイ**  
   - 3 ファイルの変更を VPS に反映し、API を再起動する。

3. **後方互換の再実行**  
   - 同じ §3 の 3 本を再実行。response 長がベースラインと同程度であること、固定応答が変わっていないことを確認する。  
   - `decisionFrame.ku` に answerLength / answerMode / answerFrame が追加されていること（未指定時は null 等）を確認する。

4. **ku と support/define/analysis の確認**  
   - §4 と §5 の curl を実行し、ku の 3 項目と response_length が期待どおりであることを確認する。

5. **long でないときの d_delta_s_one_step 落とし**  
   - body に `answerLength: "short"`, `answerFrame: "d_delta_s_one_step"` を渡して実行。  
   - ku の `answerFrame` が `"statement_plus_one_question"` 等に落ちていること（実装仕様どおり）を確認する。

---

# 7. チェックリスト（実施時にチェック）

- [ ] 実装前に §3 の 3 リクエストでベースラインを取得した
- [ ] 実装後、§3 の 3 リクエストで response が実装前と同程度で、固定応答が変わっていない（後方互換）
- [ ] 実装後、body 未指定で `decisionFrame.ku` に answerLength / answerMode / answerFrame が存在する（null または未設定でよい）
- [ ] body で 3 項目指定時、ku にその値が記録される（§4.2）
- [ ] answerMode: support / define / analysis の 3 ケースで、ku に answerMode と補完された answerLength / answerFrame が記録される（§5）
- [ ] answerLength: "long" かつ answerFrame: "d_delta_s_one_step" で、ku に両方記録され、応答が長めになり得る（§5.3 の 2 本目）
- [ ] answerLength が long でないときに d_delta_s_one_step を渡すと、ku では落とされた値になっている（§6 手順 5）

---

**以上。テスト観点と curl コマンド案のみ。コードは含まない。**
