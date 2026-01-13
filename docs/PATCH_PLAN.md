# TENMON-ARK 修正パッチ計画

**生成日時**: 2026-01-12  
**目的**: domain(HYBRID)が一般知識テンプレに落ちる経路を遮断、detail捏造を構造的に不可能にする

---

## B) 不具合の根因特定

### ⚠️ 重大な問題 1: detectIntent() が hasDocPage = true で "grounded" を返す

**場所**: `src/persona/speechStyle.ts` 7行目
```typescript
if (hasDocPage) return "grounded";
```

**問題**:
- `detectIntent()` が最初に `hasDocPage` をチェックして "grounded" を返す
- これにより domain キーワードがあっても intent が "grounded" になる
- 結果として truthSkeleton.ts 129行目の `if (intent === "domain")` が false になり、mode が HYBRID にならない

**影響**:
- `言霊秘書.pdf pdfPage=103 言灵とは？` のようなメッセージで intent が "grounded" になる
- domain キーワードがあっても mode が GROUNDED になる可能性がある

### ✅ 問題なし: HYBRIDでLLMが使われていない

- 338行目: `generateResponseFromPlan(plan)` - テンプレ固定（LLM未使用）
- 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成（LLM未使用）
- 388行目: ログで `llm: null` を確認

### ✅ 問題なし: detail/response生成はEvidencePackからのみ

- generateResponseFromPlan/generateDetailFromPlan は plan.quotes から生成
- LLM未使用

### ⚠️ 問題 2: ktk/iroha の fallback ID規格が不一致

**場所**: `src/kotodama/evidencePack.ts` 165行目
```typescript
id: `${prefix}${pdfPage}-${i + 1}`,
```

**問題**:
- 必須仕様では `KTK-P####-T###` / `IROHA-P####-T###` という形式が要求されている
- 現在の実装では `${prefix}${pdfPage}-${i + 1}` になっている（例: `KTK-103-1`）
- 正しい形式: `KTK-P0103-T001`

---

## C) 修正パッチ

### 修正 1: detectIntent() を修正（domain優先）

**ファイル**: `src/persona/speechStyle.ts`

**変更内容**:
- `hasDocPage` のチェックを domain キーワードチェックの後に移動
- domain キーワードがあれば常に "domain" を返す（hasDocPage に関係なく）

### 修正 2: ktk/iroha の fallback ID規格を修正

**ファイル**: `src/kotodama/evidencePack.ts`

**変更内容**:
- ID形式を `${prefix}P${pdfPage.toString().padStart(4, "0")}-T${(i + 1).toString().padStart(3, "0")}` に変更
- 例: `KTK-P0103-T001`, `IROHA-P0012-T001`

### 修正 3: truthSkeleton.ts の順序確認（既に正しい）

**ファイル**: `src/truth/truthSkeleton.ts`

**確認**:
- 129-131行目: `if (intent === "domain") mode = "HYBRID"` が最優先
- 137-142行目: `else if` で GROUNDED が判定される
- ✅ 既に正しい順序になっている（修正不要）

---

## D) 受入テスト追加

**ファイル**: `scripts/acceptance_test.sh`

**追加テスト**:
1. 「言灵とは？」で decisionFrame.intent=domain を確認
2. domain→常にHYBRID を確認（doc/pdfPage があっても）
3. #詳細があるとき detailは必ず string を確認
4. detail内のIDが KHS-/KTK-/IROHA- 規格のみ（言霊-001は禁止）を確認
5. detailのquoteが *_text.jsonl 本文に部分一致で存在を確認
6. domainで evidence=0 なら LLM未使用（ログorフラグで確認）


