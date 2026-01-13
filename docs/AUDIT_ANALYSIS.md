# TENMON-ARK 監査分析レポート

**生成日時**: 2026-01-12  
**対象**: domain(HYBRID)が一般知識テンプレに落ちる経路、detail捏造、domain→GROUNDED遷移

---

## A) 現状のデータフロー（行番号付き）

### リクエスト処理フロー

```
chat.ts (POST /api/chat)
├─ 100行目: parseDocAndPageStrict(message) → {doc, pdfPage}
├─ 101行目: isDetailRequest(message) → detail: boolean
├─ 106行目: buildTruthSkeleton(message, hasDocPage, detail)
│   └─ truthSkeleton.ts 114-191行目
│       ├─ 119行目: detectIntent(message, hasDocPage) → intent
│       ├─ 129-131行目: if (intent === "domain") mode = "HYBRID"
│       ├─ 133-135行目: else if (isLive) mode = "LIVE"
│       └─ 137-142行目: else if (hasDocPage || 根拠要求) mode = "GROUNDED"
│
├─ 124行目: mode = skeleton.mode
│
└─ 288行目: if (mode === "HYBRID")
    ├─ 290行目: buildCoreAnswerPlan(message, detail)
    │   └─ domainCore.ts 22-164行目
    │       ├─ 27行目: searchPages(message, 3) → retrievalResults
    │       ├─ 36行目: buildEvidencePack(doc, pdfPage, true, explain)
    │       │   └─ evidencePack.ts 233-284行目
    │       │       ├─ 240行目: loadLawCandidates(doc, pdfPage)
    │       │       └─ 241行目: loadPageText(doc, pdfPage)
    │       └─ 49行目: inferTruthAxesFromEvidence(evidencePack)
    │
    ├─ 293行目: if (!plan) → 資料不足レスポンス（LLM未使用 ✅）
    │
    ├─ 338行目: generateResponseFromPlan(plan)
    │   └─ surfaceGenerator.ts 14-46行目
    │       └─ テンプレ固定生成（LLM未使用 ✅）
    │
    ├─ 339行目: generateDetailFromPlan(plan) (detail時のみ)
    │   └─ surfaceGenerator.ts 48-111行目
    │       └─ plan.quotes から生成（LLM未使用 ✅）
    │
    └─ 388行目: llm: null (ログで確認 ✅)
```

---

## B) 不具合の根因特定

### 1. HYBRIDでLLMが回答本文/引用/lawId/pdfPageを作っている箇所

**現状**: ✅ LLM未使用
- 338行目: `generateResponseFromPlan(plan)` - テンプレ固定（surfaceGenerator.ts 14-46行目）
- 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成（surfaceGenerator.ts 48-111行目）
- 388行目: ログで `llm: null` を確認

**問題点**: なし（LLM未使用のため）

### 2. truthSkeletonでdomainより後にGROUNDEDが上書きされる可能性

**現状**: truthSkeleton.ts 129-142行目
```typescript
// 1) domain は最優先で HYBRID（#詳細でも落とさない）
if (intent === "domain") {
  mode = "HYBRID";
}
// 2) LIVE（domain以外）
else if (isLive) {
  mode = "LIVE";
}
// 3) GROUNDED（domain以外：明示doc/pdfPage or 明示根拠要求）
else if (hasDocPage || /(根拠|引用|出典|法則)/i.test(message)) {
  mode = "GROUNDED";
}
```

**分析**: ✅ 問題なし
- `if (intent === "domain")` が最優先で、`else if` で分岐しているため、domain が勝つ順序になっている
- `hasDocPage` があっても domain の場合は HYBRID のまま

### 3. chat.tsで「#詳細/根拠」がdocMode/hasExplicitGroundingを立ててdomainを崩すか

**現状**: 
- 100行目: `parseDocAndPageStrict(message)` → `parsed.doc`, `parsed.pdfPage`
- 106行目: `buildTruthSkeleton(message, !!parsed.doc && !!parsed.pdfPage, detail)`
- truthSkeleton.ts 119行目: `detectIntent(message, hasDocPage)`

**分析**: ⚠️ 潜在的問題あり
- `detectIntent(message, hasDocPage)` の実装を確認する必要がある
- `hasDocPage = true` の場合、`intent` が "grounded" になる可能性がある

### 4. generateResponseFromPlan/generateDetailFromPlan の実装確認

**generateResponseFromPlan** (surfaceGenerator.ts 14-46行目):
- plan.quotes からテンプレ固定生成
- plan.truthAxes を使用
- LLM未使用 ✅

**generateDetailFromPlan** (surfaceGenerator.ts 48-111行目):
- plan.quotes から生成
- plan.refs から doc/pdfPage を取得
- LLM未使用 ✅

### 5. ktk/iroha の law_candidates が無い場合の fallback

**現状**: evidencePack.ts 130-178行目
- `loadLawCandidates()` で law_candidates.jsonl を読み込む
- 失敗時や空の場合の fallback が実装されているか確認が必要

---

## C) 必須仕様の確認

### 1. intent=domain は常に mode=HYBRID（#詳細でも doc指定でも）

**現状**: ✅ 実装済み
- truthSkeleton.ts 129-131行目: `if (intent === "domain") mode = "HYBRID"`
- `else if` で分岐しているため、domain が最優先

**問題点**: ⚠️ `detectIntent()` の実装を確認する必要がある
- `hasDocPage = true` の場合、`intent` が "grounded" になる可能性がある

### 2. domain(HYBRID) は Evidenceが0件なら LLMを呼ばず「資料不足＋候補提示」で返す

**現状**: ✅ 実装済み
- chat.ts 293-335行目: `if (!plan)` → 資料不足レスポンス（LLM未使用）

### 3. detail はEvidencePackからのみコード生成（LLM由来の detail/引用/lawId/pdfPage は採用禁止）

**現状**: ✅ 実装済み
- 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成
- LLM未使用

### 4. response本文にも「日本の伝統的概念」「ポジティブな言葉」等の一般テンプレが混入しない（domain strict）

**現状**: ⚠️ 要確認
- 338行目: `generateResponseFromPlan(plan)` - テンプレ固定生成
- テンプレ内容を確認する必要がある

### 5. ktk/iroha は law_candidates が無いので text.jsonl から fallback 抜粋候補を生成（ID規格：KTK-P####-T### / IROHA-P####-T###）

**現状**: ⚠️ 要確認
- evidencePack.ts の `loadLawCandidates()` の実装を確認する必要がある

---

## D) 次のステップ

1. **detectIntent() の実装確認** - `hasDocPage = true` の場合の intent 判定
2. **generateResponseFromPlan のテンプレ内容確認** - 一般テンプレが混入していないか
3. **loadLawCandidates の fallback 実装確認** - ktk/iroha の fallback
4. **受入テスト追加** - 必須仕様の検証


