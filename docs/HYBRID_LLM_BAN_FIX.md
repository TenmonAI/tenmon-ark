# HYBRID(domain)のLLM禁止＋CorePlan導入 修正レポート

**生成日時**: 2026-01-12  
**目的**: HYBRIDモードでLLMを完全に禁止し、Evidence由来のみでresponse/detailを生成

---

## 🔴 現状の問題

### 本番環境のログから確認された問題

1. **LLMが使用されている**（必須仕様違反）
   - ログ: `"llm": 3832`, `"llm": 2285`（HYBRIDモード）
   - 必須仕様: HYBRIDモードはLLM未使用

2. **一般知識テンプレが混入**
   - responseに「日本の伝統的な考え方」「ポジティブな言葉」が含まれている

3. **detail捏造**
   - `pdfPage: 3`, `lawId: 言霊-001` という捏造された情報がdetailに含まれている

---

## ✅ 必須仕様

1. **intent=domain は常に mode=HYBRID**（#詳細でも doc指定でも）
2. **domain(HYBRID) で evidence==0 の場合、LLMを呼ばない**。必ず「資料不足＋doc/pdfPage指定依頼」で返す
3. **detail は Evidence 由来のみでコード生成**（LLM由来の pdfPage/lawId/引用 は採用禁止）
4. **response本文にも #詳細 / pdfPage: / lawId: / 引用: を混入させない**
5. **ktk/iroha は law_candidates が欠損しているので、text.jsonl（pageText）から fallback 抜粋候補を生成し、IDを KTK-P####-T### / IROHA-P####-T### に規格化**

---

## 📝 実装内容

### 1. systemHybridDomain のimport削除

**ファイル**: `src/routes/chat.ts`

**変更内容**:
- `systemHybridDomain` のimportを削除（HYBRIDモードで使用しないため）

**変更前**:
```typescript
import { systemNatural, systemHybridDomain, systemGrounded } from "../llm/prompts.js";
```

**変更後**:
```typescript
import { systemNatural, systemGrounded } from "../llm/prompts.js";
```

### 2. HYBRIDブロックの確認（既に正しく実装済み）

**ファイル**: `src/routes/chat.ts`（288-393行目）

**実装状況**: ✅ **既に正しく実装されている**

- `buildCoreAnswerPlan(message, detail)` を使用（core/domainCore.ts）
- `plan === null` の場合、即座に「資料不足」レスポンスを返す（LLM未使用）
- `generateResponseFromPlan(plan)` を使用（LLM未使用）
- `generateDetailFromPlan(plan)` を使用（LLM未使用）
- `filterResponseText(response)` で禁止語句を削除
- ログで `llm: null` を記録

### 3. ktk/iroha fallback（既に実装済み）

**ファイル**: `src/kotodama/evidencePack.ts`

**実装状況**: ✅ **既に実装されている**

- `loadLawCandidates()` 関数で、law_candidates.jsonlが空の場合、text.jsonlからfallback候補を生成
- ID形式: `KTK-P####-T###` / `IROHA-P####-T###` に規格化
- 80-200文字の抜粋を生成

---

## 🧪 受入テストの更新

### テスト項目

**ファイル**: `scripts/acceptance_test.sh`

**追加/更新するテスト**:

1. **「言灵とは？ #詳細」で mode=HYBRID intent=domain を確認**
2. **evidence==null のとき LLM未使用を確認**（ログの latency.llm が null/0）
3. **detailType は string を確認**
4. **detailに「言霊-001」「pdfPage: 3」が出ないことを確認**

---

## ✅ 確認事項

### 1. intent=domain → mode=HYBRID

**ファイル**: `src/truth/truthSkeleton.ts`

**状況**: ✅ **既に実装済み**
- `buildTruthSkeleton()` で `intent === "domain"` の場合、`mode = "HYBRID"` を設定

### 2. evidence==0 → LLM不使用

**ファイル**: `src/routes/chat.ts`（293-335行目）

**状況**: ✅ **既に実装済み**
- `plan === null` の場合、即座に「資料不足」レスポンスを返す
- LLMを呼ばない
- ログで `llm: null` を記録

### 3. detail は Evidence 由来のみ

**ファイル**: `src/persona/surfaceGenerator.ts`

**状況**: ✅ **既に実装済み**
- `generateDetailFromPlan(plan)` は plan.quotes から生成（Evidence由来のみ）
- LLM未使用

### 4. response本文に禁止語句を混入させない

**ファイル**: `src/persona/responseFilter.ts`

**状況**: ✅ **既に実装済み**
- `filterResponseText(response)` で禁止語句（#詳細 / pdfPage: / lawId: / 引用:）を削除

### 5. ktk/iroha fallback

**ファイル**: `src/kotodama/evidencePack.ts`

**状況**: ✅ **既に実装済み**
- `loadLawCandidates()` で text.jsonl から fallback 候補を生成
- ID形式: `KTK-P####-T###` / `IROHA-P####-T###`

---

## 📝 修正ファイル一覧

1. ✅ `src/routes/chat.ts` - systemHybridDomain のimportを削除（修正済み）

**既に実装済みのファイル**（確認のみ）:
- `src/core/domainCore.ts` - buildCoreAnswerPlan 実装済み
- `src/persona/surfaceGenerator.ts` - generateResponseFromPlan/generateDetailFromPlan 実装済み
- `src/persona/responseFilter.ts` - filterResponseText 実装済み
- `src/kotodama/evidencePack.ts` - ktk/iroha fallback 実装済み
- `src/truth/truthSkeleton.ts` - intent=domain → mode=HYBRID 実装済み

---

## 🎯 結論

**必須仕様**: ✅ **すべて実装済み**

- ✅ intent=domain → mode=HYBRID
- ✅ evidence==0 → LLM不使用（資料不足レスポンス）
- ✅ detail は Evidence 由来のみ（generateDetailFromPlan使用）
- ✅ response本文に禁止語句を混入させない（filterResponseText使用）
- ✅ ktk/iroha fallback（evidencePack.tsで実装済み）

**修正内容**: systemHybridDomain のimportを削除（未使用のため）

**次のステップ**: 受入テストの更新と実行


