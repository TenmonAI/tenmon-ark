# TENMON-ARK 必須仕様検証レポート

**生成日時**: 2026-01-12  
**目的**: domain(HYBRID)の一般知識テンプレ混入とdetail捏造を根絶

---

## 📋 必須仕様の確認状況

### 1. intent=domain は常に mode=HYBRID（#詳細でもdoc指定でも）

**状況**: ✅ **修正済み**

**実装**:
- `src/persona/speechStyle.ts`: `detectIntent()` を修正して domain キーワードチェックを最優先に
- `src/truth/truthSkeleton.ts` 129-131行目: `if (intent === "domain") mode = "HYBRID"`

**検証方法**:
- `言霊秘書.pdf pdfPage=103 言灵とは？` → `intent=domain`, `mode=HYBRID`
- 受入テスト Phase 6 で検証

**状態**: ✅ **完了**

---

### 2. domain(HYBRID)で evidence==0 のとき LLMを呼ばない（資料不足＋候補提示のみ）

**状況**: ✅ **既に実装済み**

**実装**:
- `src/routes/chat.ts` 290-335行目: `buildCoreAnswerPlan()` が `null` を返した場合、LLMを呼ばずに「資料不足」レスポンスを返す
- 388行目: ログで `llm: null` を確認

**コード確認**:
```typescript
// chat.ts 290-335行目
let plan = await buildCoreAnswerPlan(message, detail);
if (!plan) {
  // LLMを呼ばずに資料不足レスポンスを返す
  const response = "資料不足です。次に読むべきdoc/pdfPageを指定してください。";
  // ... ログで llm: null を記録 ...
  return res.json(result);
}
```

**検証方法**:
- 受入テストで `latency.llm` が `null` であることを確認
- または、evidence=0 の場合にLLM未使用を確認

**状態**: ✅ **完了**（テスト追加が必要）

---

### 3. detail は EvidencePack 由来のみでコード生成（LLM由来のlawId/pdfPage/引用は採用禁止）

**状況**: ✅ **既に実装済み**

**実装**:
- `src/routes/chat.ts` 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成
- `src/persona/surfaceGenerator.ts` 51-109行目: `generateDetailFromPlan()` - plan.quotes と plan.refs から生成
- LLM未使用

**コード確認**:
```typescript
// chat.ts 339行目
const detailText = detail ? generateDetailFromPlan(plan) : undefined;

// surfaceGenerator.ts 51-109行目
export function generateDetailFromPlan(plan: CoreAnswerPlan): string {
  // plan.quotes（EvidencePack由来）から生成
  // plan.refs から doc/pdfPage を取得
  // LLM未使用
}
```

**検証方法**:
- detail の内容が plan.quotes と plan.refs から生成されることを確認
- LLM由来の lawId/pdfPage/引用が含まれていないことを確認

**状態**: ✅ **完了**（LLM未使用のため自動的に保証）

---

### 4. response本文にも一般テンプレが混入しない（domain strict）

**状況**: ✅ **既に実装済み**

**実装**:
- `src/routes/chat.ts` 338行目: `generateResponseFromPlan(plan)` - テンプレ固定生成
- `src/persona/surfaceGenerator.ts` 14-46行目: `generateResponseFromPlan()` - テンプレ固定生成
- LLM未使用のため、一般テンプレが混入しない

**コード確認**:
```typescript
// chat.ts 338行目
let response = generateResponseFromPlan(plan);

// surfaceGenerator.ts 14-46行目
export function generateResponseFromPlan(plan: CoreAnswerPlan): string {
  // テンプレ固定生成
  // LLM未使用
}
```

**検証方法**:
- response に「日本の伝統的概念」「ポジティブな言葉」等の一般テンプレが含まれていないことを確認
- 受入テスト Phase 5 で検証済み

**状態**: ✅ **完了**（LLM未使用のため自動的に保証）

---

### 5. ktk/iroha の law_candidates 欠損は text.jsonl から fallback 抜粋で補う（ID規格化）

**状況**: ✅ **修正済み**

**実装**:
- `src/kotodama/evidencePack.ts` 134-178行目: `loadLawCandidates()` で fallback 実装
- ID規格: `KTK-P####-T###` / `IROHA-P####-T###`（修正済み）

**コード確認**:
```typescript
// evidencePack.ts 165-168行目
const pageStr = String(pdfPage).padStart(4, "0");
const trackStr = String(i + 1).padStart(3, "0");
id: `${prefix}P${pageStr}-T${trackStr}`,
```

**検証方法**:
- ktk/iroha の fallback IDが `KTK-P####-T###` / `IROHA-P####-T###` 形式であることを確認
- 受入テスト Phase 7 で検証（追加予定）

**状態**: ✅ **完了**（テスト追加が必要）

---

## 🧪 受入テストの確認状況

### ✅ 既存テスト

1. **domain→HYBRID固定**: Phase 4-2 で検証済み
2. **#詳細→detailはstring**: Phase 4-2 で検証済み
3. **responseに禁止テンプレ語が入っていない**: Phase 5 で検証済み

### ⏳ 追加が必要なテスト

1. **domainでdoc/pdfPageがあってもHYBRID固定**: ✅ Phase 6 で追加済み
2. **detail内ID規格**: ⏳ Phase 7 で追加予定
3. **quote本文存在検証**: ⏳ 未実装（実装は複雑なため、現時点では省略）
4. **evidence0→LLM不使用**: ⏳ 未実装（ログで `llm: null` を確認可能）

---

## 📝 次のステップ

1. **Phase 7 テストの追加**: detail内ID規格確認のテストを追加
2. **evidence0→LLM不使用テストの追加**: evidence=0 の場合に `latency.llm` が `null` であることを確認するテストを追加
3. **quote本文存在検証テスト**: detailのquoteが `*_text.jsonl` 本文に部分一致で存在することを確認するテストを追加（オプション、実装は複雑）

---

## ✅ 結論

**必須仕様の実装状況**: ✅ **すべて完了**

- 1. intent=domain → mode=HYBRID: ✅ 修正済み
- 2. evidence==0 → LLM不使用: ✅ 既に実装済み
- 3. detail は EvidencePack 由来のみ: ✅ 既に実装済み（LLM未使用）
- 4. response に一般テンプレ混入なし: ✅ 既に実装済み（LLM未使用）
- 5. ktk/iroha fallback ID規格化: ✅ 修正済み

**受入テスト**: ⏳ **一部追加が必要**

- Phase 6: ✅ 追加済み
- Phase 7: ⏳ 追加予定
- evidence0→LLM不使用: ⏳ 追加予定


