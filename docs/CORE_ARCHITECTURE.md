# TENMON-ARK 中枢（空×天津金木）アーキテクチャ

**作成日**: 2026-01-17  
**実装フェーズ**: v1（Phase 1-5完了）

---

## データフロー図（Kū→Evidence→Kanagi→Verify→Speak）

```
POST /api/chat
  │
  ├─ [空（Kū Governor）] buildTruthSkeleton()
  │    └─ domain → HYBRID固定
  │
  ├─ [Evidence（Retrieve）] 根拠取得
  │    │
  │    ├─ [未指定] retrieveAutoEvidence(message, 3)
  │    │    ├─ hits==0 → 「資料指定して」
  │    │    ├─ confidence<0.6 → 候補提示
  │    │    └─ confidence>=0.6 → topHit採用
  │    │
  │    ├─ [Retrieve] getCorpusPage(doc, pdfPage)
  │    │    └─ pageText取得
  │    │
  │    ├─ [Retrieve] getPageCandidates(doc, pdfPage, 12)
  │    │    ├─ law_candidates.jsonl読み込み（KHS/KTK/IROHA）
  │    │    └─ 存在しない場合 → 空配列
  │    │
  │    └─ [Fallback] makeFallbackLawsFromText(...)
  │         └─ text.jsonlから簡易law生成（Evidence由来のみ）
  │
  ├─ [天津金木（Kanagi Truth-Core）] buildCoreAnswerPlanFromEvidence()
  │    │
  │    ├─ pickTaiYo(laws) → 躰/用抽出
  │    │
  │    ├─ runTruthCore() → thesis/tai/yo/kokakechuFlags
  │    │    └─ 空仮中検知（一般テンプレ/根拠なし断定/循環説明）
  │    │
  │    └─ computeCenterline() → taiScore/yoScore/hiScore/miScore/centerline/confidence
  │         └─ 正中軸の数値化（-1..+1）
  │
  ├─ [Verifier] verifyCorePlan()
  │    │
  │    ├─ verifyClaimEvidence() → アンカー3点方式
  │    │    ├─ 短いquote（<=80字）: 全体で検証
  │    │    └─ 長いquote（>80字）: 先頭80/中央80/末尾80のアンカーで検証
  │    │         └─ 2/3以上マッチ → OK, 1/3以下 → NG
  │    │
  │    └─ filterValidClaims() → 検証失敗したclaimsを除外
  │
  └─ [Speaker（自然文）] composeDetailFromEvidence()
       │
       ├─ Phase 2: detail を完全コード生成で統一
       │    └─ doc/pdfPage/lawId/quote/axes/steps はすべてEvidence由来
       │
       └─ response は stripForbiddenFromResponse() で整形
            └─ 禁止テンプレ語の混入を除去
```

---

## 中枢フロー：空（Kū Governor）→Evidence→Kanagi→Verify→Speak

### 1. 空（Kū Governor）

**実装**: `api/src/truth/truthSkeleton.ts`

- **役割**: mode決定（domain→HYBRID固定）
- **入力**: `message`, `hasDocPage`, `detail`
- **出力**: `TruthSkeleton` (mode/intent/risk/truthAxes/constraints)

**証拠**: `api/src/truth/truthSkeleton.ts:129-131` で `domain→HYBRID` 固定

### 2. Evidence（Retrieve）

**実装**: `api/src/kotodama/retrieveAutoEvidence.ts`, `api/src/kotodama/corpusLoader.ts`

- **役割**: 根拠（EvidencePack）の取得
- **入力**: `message`, `doc`, `pdfPage`
- **出力**: `EvidencePack` (doc/pdfPage/pageText/laws/isEstimated)

**証拠**: `api/src/routes/chat.ts:339-434` で自動検索→Retrieve→Fallbackの流れ

### 3. 天津金木（Kanagi Truth-Core）

**実装**: `api/src/kanagi/truthCore.ts`, `api/src/kanagi/kanagiCore.ts`

- **役割**: 躰/用抽出、正中命題算出、空仮中検知、正中軸数値化
- **入力**: `message`, `EvidencePack`
- **出力**: `CorePlan` (thesis/tai/yo/kokakechuFlags/centerline/confidence)

**証拠**: `api/src/kanagi/kanagiCore.ts:172-189` で `runTruthCore` + `computeCenterline` を実行

### 4. Verifier

**実装**: `api/src/kanagi/verifier.ts`

- **役割**: claimsのevidenceIds検証（アンカー3点方式）
- **入力**: `CorePlan.claims`, `EvidencePack`
- **出力**: `VerificationResult` (valid/failedClaims/warnings)

**証拠**: `api/src/kanagi/verifier.ts:35-109` でアンカー3点方式を実装

### 5. Speaker（自然文）

**実装**: `api/src/persona/composeDetail.ts`

- **役割**: detail を完全コード生成で統一（捏造ゼロ）
- **入力**: `CorePlan`, `EvidencePack`, `VerificationResult`
- **出力**: `detail` (string、すべてEvidence由来)

**証拠**: `api/src/persona/composeDetail.ts:13-76` で完全コード生成を実装

---

## 捏造防止の仕組み

### 1. LLM禁止

**実装**: `api/src/routes/chat.ts:331` に `// ルール：LLM禁止 / evidence必須 / detailはコード生成のみ`

**証拠**: `api/src/routes/chat.ts:358,400,449,494,530` で `decisionFrame.llm: null` を設定

### 2. Evidence由来のみ

**実装**: `makeFallbackLawsFromText` で `pageText.slice(start, end)` から抽出

**証拠**: `api/src/kanagi/kanagiCore.ts:92-103` で `pageText` から直接抽出（LLM未使用）

### 3. Verifier検証

**実装**: `verifyClaimEvidence` でアンカー3点方式で検証

**証拠**: `api/src/kanagi/verifier.ts:35-109` で `quote` が `pageText` に含まれることを確認

### 4. detail完全コード生成

**実装**: `composeDetailFromEvidence` で Evidence 由来のみで組み立て

**証拠**: `api/src/persona/composeDetail.ts:13-76` で `corePlan` と `evidencePack` から直接生成

---

## Phase 1-5 の実装状況

### Phase 1: コーパス補完 ✅

**実装**: `api/src/scripts/gen_law_candidates_from_text.ts`

**使用方法**:
```bash
cd /opt/tenmon-ark/api
tsx src/scripts/gen_law_candidates_from_text.ts KTK
tsx src/scripts/gen_law_candidates_from_text.ts IROHA
```

**完了条件**: `ktk_law_candidates.jsonl` / `iroha_law_candidates.jsonl` が生成される

---

### Phase 2: detail完全コード生成 ✅

**実装**: `api/src/persona/composeDetail.ts`

**統合**: `api/src/routes/chat.ts:523,573` で `composeDetailFromEvidence` を使用

**完了条件**: `detail` がすべてEvidence由来（LLM生成なし）

---

### Phase 3: Verifier強化（アンカー3点方式）✅

**実装**: `api/src/kanagi/verifier.ts:35-109`

**検証方式**:
- 短いquote（<=80字）: 全体で検証
- 長いquote（>80字）: 先頭80/中央80/末尾80のアンカーで検証
  - 2/3以上マッチ → OK
  - 1/3以下 → NG（claim除外）

**完了条件**: 100文字以上の引用でも誤検知なし

---

### Phase 4: Kanagi patternsロード確実化 ✅

**実装**: `api/src/kanagi/patterns/loadPatterns.ts`, `api/src/ops/health.ts`

**変更**:
- `getPatternsLoadStatus()` でロード状態を取得
- `health.ts` に `kanagi.loaded/count/path` を追加
- `chat.ts` で `patternsLoaded=false` の場合はASKに倒す

**完了条件**: 
- `/api/health` に `kanagi.loaded` が含まれる
- `patternsLoaded=false` のときdomainはASKに倒れる

---

### Phase 5: 正中（centerline）数値化 ✅

**実装**: `api/src/kanagi/truthCore.ts:130-200`

**計算内容**:
- `taiScore`, `yoScore`: 躰/用スコア（0..1）
- `hiScore`, `miScore`: 火/水スコア（0..1）
- `centerline`: 正中軸（-1..+1、-1=水寄り、+1=火寄り、0=正中）
- `confidence`: 信頼度（0..1）

**統合**: `api/src/kanagi/kanagiCore.ts:172-189` で `computeCenterline` を呼び出し

**完了条件**: `CorePlan` に `taiScore/yoScore/hiScore/miScore/centerline/confidence` が含まれる

---

## 受入テスト（scripts/acceptance_test.sh）

### 必須テスト項目

1. **domain→HYBRID固定**
   ```bash
   curl -sS "${BASE_URL}/api/chat" -H "Content-Type: application/json" \
     -d '{"threadId":"t","message":"言灵とは？"}' | jq '.decisionFrame.mode'
   # → "HYBRID"
   ```

2. **#詳細→detail string**
   ```bash
   curl -sS "${BASE_URL}/api/chat" -H "Content-Type: application/json" \
     -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '.detail | type'
   # → "string"
   ```

3. **detailにdoc/pdfPage/lawId/quoteが出る**
   ```bash
   curl -sS "${BASE_URL}/api/chat" -H "Content-Type: application/json" \
     -d '{"threadId":"t","message":"言灵とは？ #詳細"}' | jq '.detail' | grep -E "(doc=|pdfPage=|KHS-|KTK-|IROHA-|引用:)"
   # → 必須
   ```

4. **detailのquoteが本文に存在する**
   ```bash
   # Verifierでアンカー3点方式で検証済み
   ```

5. **KTK/IROHAでも候補が出る（law_candidates生成後）**
   ```bash
   # Phase 1完了後、KTK/IROHAでもlaw_candidates.jsonlが存在すること
   ```

6. **kanagi.patternsLoaded=falseのときdomainはASKに倒れる**
   ```bash
   # patternsファイルを削除してテスト
   # → domain回答がASK（断定禁止）になること
   ```

7. **responseに一般知識テンプレ語が入らない**
   ```bash
   curl -sS "${BASE_URL}/api/chat" -H "Content-Type: application/json" \
     -d '{"threadId":"t","message":"言灵とは？"}' | jq '.response' | grep -E "(日本の伝統的|ポジティブ|温かみ|深い意味)"
   # → なし（FAIL）
   ```

---

## ファイル一覧（実装済み）

### Phase 1: コーパス補完
- ✅ `api/src/scripts/gen_law_candidates_from_text.ts` （新規）

### Phase 2: detail完全コード生成
- ✅ `api/src/persona/composeDetail.ts` （新規）
- ✅ `api/src/routes/chat.ts` （修正: composeDetailFromEvidence統合）

### Phase 3: Verifier強化
- ✅ `api/src/kanagi/verifier.ts` （修正: アンカー3点方式）

### Phase 4: Kanagi patternsロード確実化
- ✅ `api/src/kanagi/patterns/loadPatterns.ts` （修正: ロード状態保持）
- ✅ `api/src/ops/health.ts` （修正: kanagi情報追加）
- ✅ `api/src/routes/chat.ts` （修正: patternsLoaded=false時ASK）

### Phase 5: 正中（centerline）数値化
- ✅ `api/src/kanagi/truthCore.ts` （修正: computeCenterline追加）
- ✅ `api/src/kanagi/kanagiCore.ts` （修正: CorePlan型拡張、computeCenterline統合）

---

## 完了条件（DONE）

- ✅ Phase 1: `ktk_law_candidates.jsonl` / `iroha_law_candidates.jsonl` が生成できる
- ✅ Phase 2: `detail` が `composeDetailFromEvidence` で完全コード生成
- ✅ Phase 3: アンカー3点方式で100文字以上の引用でも誤検知なし
- ✅ Phase 4: `/api/health` に `kanagi.loaded` が含まれる、`patternsLoaded=false`時ASK
- ✅ Phase 5: `CorePlan` に `centerline/confidence` が含まれる

---

**次回実装推奨**: 受入テストの強化（引用本文存在検証の強化、自動検索動作確認、真理骨格計算確認）

