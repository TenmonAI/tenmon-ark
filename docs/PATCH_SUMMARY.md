# TENMON-ARK 修正パッチまとめ

**生成日時**: 2026-01-12  
**目的**: domain(HYBRID)が一般知識テンプレに落ちる経路を遮断、detail捏造を構造的に不可能にする

---

## ✅ 実装した修正

### 修正1: detectIntent() を修正（domain優先）

**ファイル**: `src/persona/speechStyle.ts`

**変更内容**:
- `hasDocPage` のチェックを domain キーワードチェックの後に移動
- domain キーワードがあれば常に "domain" を返す（hasDocPage に関係なく）

**変更前**:
```typescript
if (hasDocPage) return "grounded";
// ... domain keywords check ...
```

**変更後**:
```typescript
// domain keywords は最優先（hasDocPage に関係なく）
if (/(言[霊靈灵]|言霊|言靈|言灵|ことだま|カタカムナ|いろは|天津金木|布斗麻邇|フトマニ|辞|テニヲハ)/.test(t)) {
  return "domain";
}
// ... hasDocPage check ...
```

**効果**:
- `言霊秘書.pdf pdfPage=103 言灵とは？` のようなメッセージでも intent が "domain" になる
- truthSkeleton.ts 129行目の `if (intent === "domain")` が true になり、mode が HYBRID になる

### 修正2: ktk/iroha の fallback ID規格を修正

**ファイル**: `src/kotodama/evidencePack.ts`

**変更内容**:
- ID形式を `KTK-P####-T###` / `IROHA-P####-T###` に変更
- 例: `KTK-P0103-T001`, `IROHA-P0012-T001`

**変更前**:
```typescript
id: `${prefix}${pdfPage}-${i + 1}`,
```

**変更後**:
```typescript
const pageStr = String(pdfPage).padStart(4, "0");
const trackStr = String(i + 1).padStart(3, "0");
id: `${prefix}P${pageStr}-T${trackStr}`,
```

**効果**:
- ID規格が必須仕様に準拠（`KHS-P####-T###` / `KTK-P####-T###` / `IROHA-P####-T###`）

---

## ✅ 受入テスト追加

**ファイル**: `scripts/acceptance_test.sh`

**追加テスト**:

1. **Phase 6: domainでdoc/pdfPageがあってもHYBRID固定**
   - テスト: `言霊秘書.pdf pdfPage=103 言灵とは？` → `decisionFrame.intent=domain`, `mode=HYBRID`
   - 検証: intent が "domain" であること、mode が "HYBRID" であること（doc/pdfPage があっても）

2. **Phase 7: detailのID規格確認**
   - テスト: `言灵とは？ #詳細` → detail内のIDが `KHS-P####-T###` / `KTK-P####-T###` / `IROHA-P####-T###` 形式のみ
   - 検証: 無効なID形式が存在しないこと

---

## 📊 必須仕様の確認状況

### 1. intent=domain は常に mode=HYBRID（#詳細でも doc指定でも）

**状況**: ✅ 修正済み
- detectIntent() を修正して domain を最優先に
- truthSkeleton.ts 129-131行目で `if (intent === "domain") mode = "HYBRID"` が実装済み

### 2. domain(HYBRID) は Evidenceが0件なら LLMを呼ばず「資料不足＋候補提示」で返す

**状況**: ✅ 既に実装済み
- chat.ts 293-335行目: `if (!plan)` → 資料不足レスポンス（LLM未使用）

### 3. detail はEvidencePackからのみコード生成（LLM由来の detail/引用/lawId/pdfPage は採用禁止）

**状況**: ✅ 既に実装済み
- 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成
- LLM未使用

### 4. response本文にも「日本の伝統的概念」「ポジティブな言葉」等の一般テンプレが混入しない（domain strict）

**状況**: ✅ 既に実装済み
- 338行目: `generateResponseFromPlan(plan)` - テンプレ固定生成
- LLM未使用のため、一般テンプレが混入しない

### 5. ktk/iroha は law_candidates が無いので text.jsonl から fallback 抜粋候補を生成（ID規格：KTK-P####-T### / IROHA-P####-T###）

**状況**: ✅ 修正済み
- evidencePack.ts の fallback ID規格を修正
- ID形式が `KTK-P####-T###` / `IROHA-P####-T###` に準拠

---

## 📝 修正ファイル一覧

1. ✅ `src/persona/speechStyle.ts` - detectIntent() を修正（domain優先）
2. ✅ `src/kotodama/evidencePack.ts` - fallback ID規格を修正
3. ✅ `scripts/acceptance_test.sh` - 受入テスト追加（Phase 6, 7）

---

## 🔍 既存実装の確認（修正不要）

1. ✅ `src/truth/truthSkeleton.ts` - mode決定の順序は既に正しい（domain最優先）
2. ✅ `src/routes/chat.ts` - HYBRIDモードでLLM未使用（388行目: llm: null）
3. ✅ `src/persona/surfaceGenerator.ts` - テンプレ固定生成（LLM未使用）
4. ✅ `src/core/domainCore.ts` - EvidencePackからのみquotesを構築

---

## 🎯 期待される効果

1. **domain優先の確立**: `言霊秘書.pdf pdfPage=103 言灵とは？` のようなメッセージでも intent が "domain"、mode が "HYBRID" になる
2. **ID規格の準拠**: ktk/iroha の fallback IDが必須仕様に準拠（`KTK-P####-T###` / `IROHA-P####-T###`）
3. **再発防止**: 受入テストで domain優先とID規格を検証

---

## 📌 次のステップ（オプション）

1. **detailのquote検証**: detailのquoteが `*_text.jsonl` 本文に部分一致で存在することを確認するテストを追加（実装は複雑なため、現時点では省略）
2. **LLM未使用の確認**: domainで evidence=0 なら LLM未使用をログで確認（受入テストでは latency.llm が null であることを確認可能）


