# TENMON-ARK 会話フロー図

## 会話成立に関与する全ファイル

### 入口メニュー文言の発生源
- `api/src/persona/naturalRouter.ts` (行90-94): 「どの方向で話しますか？」メニュー生成
- `api/src/routes/chat.ts` (行297-316): NATURAL モード処理

### ルーティング/意図判定/状態
- `api/src/routes/chat.ts`: メインルーティング
- `api/src/persona/naturalRouter.ts`: NATURAL モード判定
- `api/src/persona/laneChoice.ts`: 選択テキスト正規化
- `api/src/kokuzo/threadCandidates.ts`: Thread state 管理（pending/candidates）

### threadId / 会話状態の保存先
- `api/src/kokuzo/threadCandidates.ts`: メモリベース（pending, candidates）
- `api/src/memory/sessionMemory.ts`: DBベース（session_memory テーブル）
- `api/src/memory/conversationStore.ts`: DBベース（conversation_log テーブル）

### 実行経路の本丸（chat endpoint）
- `api/src/routes/chat.ts` (行138): `router.post("/chat", ...)`

## 会話フロー図（条件分岐つき）

```
[ユーザー入力]
    ↓
[chat.ts: router.post("/chat")]
    ↓
[message 検証]
    ↓
[選択待ち状態チェック] (pending === "LANE_PICK"?)
    ├─ YES → [parseLaneChoice()] → [LANE_1/2/3 処理] → [回答生成] → [レスポンス返却]
    └─ NO  ↓
[番号選択チェック] ("1"〜"10"?)
    ├─ YES → [pickFromThread()] → [GROUNDED レスポンス] → [返却]
    └─ NO  ↓
[コマンド処理] (#status, #search, #pin)
    ├─ 該当 → [コマンド処理] → [返却]
    └─ NO  ↓
[greeting/datetime チェック]
    ├─ YES → [naturalRouter(greeting/datetime)] → [NATURAL レスポンス] → [返却]
    └─ NO  ↓
[UX guard: 日本語 + !wantsDetail + !hasDocPage]
    ├─ YES → [naturalRouter(other)]
    │       ├─ [ドメイン質問検出?]
    │       │   ├─ YES → handled=false → [HYBRID 処理へフォールスルー]
    │       │   └─ NO  → handled=true → [メニュー表示] → [pending="LANE_PICK" 保存] → [返却]
    │       └─ NO  ↓
    └─ NO  ↓
[GROUNDED分岐: doc + pdfPage 指定]
    ├─ YES → [buildGroundedResponse()] → [返却]
    └─ NO  ↓
[HYBRID 処理]
    ├─ [sanitizeInput()]
    ├─ [runKanagiReasoner()]
    ├─ [composeResponse()]
    ├─ [searchPagesForHybrid()]
    ├─ [ドメイン質問検出?]
    │   ├─ YES → [候補あり?]
    │   │       ├─ YES → [pageText 取得] → [回答本文生成（50文字以上）]
    │   │       └─ NO  → [フォールバック回答生成（50文字以上）]
    │   └─ NO  → [通常レスポンス]
    └─ [レスポンス返却]
```

## メニューが出る条件

1. **日本語入力** (`isJapanese = true`)
2. **#詳細 なし** (`wantsDetail = false`)
3. **doc/pdfPage 指定なし** (`hasDocPage = false`)
4. **greeting/datetime ではない**
5. **ドメイン質問ではない** (`isDomainQuestion = false`)

→ `naturalRouter()` が `handled=true` を返し、メニューを表示
→ `setThreadPending(threadId, "LANE_PICK")` で pending state を保存

## 次の発話の解釈

1. **pending state チェック** (`getThreadPending(threadId) === "LANE_PICK"`)
   - YES → `parseLaneChoice()` で選択を解析
   - LANE_1 → HYBRID 検索で回答生成（50文字以上保証）
   - LANE_2/3 → 通常処理にフォールスルー

2. **pending state なし**
   - 通常のルーティング処理

## 会話が止まる原因（修正前）

1. **ドメイン質問がメニューだけ返す**
   - `naturalRouter()` でドメイン質問を検出できていない
   - `handled=true` でメニューを返してしまう

2. **選択入力が正規化されない**
   - `parseLaneChoice()` が呼ばれていない
   - pending state が保存されていない

3. **候補がない場合に空返し**
   - フォールバック回答が生成されていない

## 修正後の保証

1. **ドメイン質問は必ず回答を返す（50文字以上）**
   - `naturalRouter()` で `handled=false` を返す
   - HYBRID 処理で回答を生成
   - 候補がない場合でもフォールバック回答を返す

2. **選択入力は正規化される**
   - `parseLaneChoice()` で LANE_1/2/3 に正規化
   - pending state を保存・消化

3. **回答本文は50文字以上保証**
   - 候補がある場合: pageText から生成
   - 候補がない場合: フォールバック回答
   - 50文字未満の場合は補足を追加

4. **根拠情報の提示**
   - 根拠がある場合: `evidence` と `detailPlan.evidence` に doc/pdfPage/quote を設定
   - 根拠がない場合: `evidenceStatus="not_found"` と `evidenceHint` を設定

## 会話フロー図（入口→pending→HYBRID→evidence）

```
[ユーザー入力: "言霊とは何？"]
    ↓
[chat.ts: router.post("/chat")]
    ↓
[ドメイン質問検出] (isDomainQuestion = true)
    ↓
[HYBRID 処理]
    ├─ [searchPagesForHybrid()] → candidates
    ├─ [candidates.length > 0?]
    │   ├─ YES → [getPageText()] → pageText
    │   │       ├─ [pageText あり?]
    │   │       │   ├─ YES → [回答本文生成] + [evidence 設定]
    │   │       │   │       ├─ evidenceDoc = top.doc
    │   │       │   │       ├─ evidencePdfPage = top.pdfPage
    │   │       │   │       └─ evidenceQuote = top.snippet
    │   │       │   └─ NO  → [フォールバック回答]
    │   │       └─ [evidence: {doc, pdfPage, quote}]
    │   └─ NO  → [フォールバック回答] + [evidenceStatus="not_found"]
    ↓
[レスポンス組み立て]
    ├─ response: 回答本文（50文字以上）
    ├─ evidence: {doc, pdfPage, quote} または null
    ├─ detailPlan.evidence: 同上
    ├─ detailPlan.evidenceIds: [evidenceId] (根拠がある場合)
    ├─ detailPlan.evidenceStatus: "not_found" (候補がない場合)
    └─ detailPlan.evidenceHint: 投入方法のヒント
    ↓
[レスポンス返却]
```
