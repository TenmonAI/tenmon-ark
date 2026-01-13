# TENMON-ARK 監査→修正設計→パッチ作成 最終レポート

**生成日時**: 2026-01-12  
**目的**: domain(HYBRID)が一般知識テンプレに落ちる経路を遮断、detail捏造を構造的に不可能にする

---

## ✅ 実装完了

### 修正ファイル一覧

1. ✅ **`src/persona/speechStyle.ts`**
   - **修正**: `detectIntent()` を修正（domain優先）
   - **変更**: `hasDocPage` のチェックを domain キーワードチェックの後に移動
   - **効果**: `言霊秘書.pdf pdfPage=103 言灵とは？` でも intent が "domain"、mode が "HYBRID" になる

2. ✅ **`src/kotodama/evidencePack.ts`**
   - **修正**: ktk/iroha の fallback ID規格を修正
   - **変更**: ID形式を `KTK-P####-T###` / `IROHA-P####-T###` に変更
   - **効果**: 必須仕様に準拠（`KHS-P####-T###` / `KTK-P####-T###` / `IROHA-P####-T###`）

3. ✅ **`scripts/acceptance_test.sh`**
   - **追加**: Phase 6: domainでdoc/pdfPageがあってもHYBRID固定のテスト
   - **追加**: Phase 7: detailのID規格確認のテスト
   - **効果**: 再発防止のための検証を追加

---

## 📊 必須仕様の確認状況

### 1. intent=domain は常に mode=HYBRID（#詳細でも doc指定でも）

**状況**: ✅ **修正済み**
- `detectIntent()` を修正して domain を最優先に
- `truthSkeleton.ts` 129-131行目で `if (intent === "domain") mode = "HYBRID"` が実装済み
- **テスト**: Phase 6 で検証

### 2. domain(HYBRID) は Evidenceが0件なら LLMを呼ばず「資料不足＋候補提示」で返す

**状況**: ✅ **既に実装済み**
- `chat.ts` 293-335行目: `if (!plan)` → 資料不足レスポンス（LLM未使用）
- ログで `llm: null` を確認

### 3. detail はEvidencePackからのみコード生成（LLM由来の detail/引用/lawId/pdfPage は採用禁止）

**状況**: ✅ **既に実装済み**
- 339行目: `generateDetailFromPlan(plan)` - plan.quotes から生成
- LLM未使用

### 4. response本文にも「日本の伝統的概念」「ポジティブな言葉」等の一般テンプレが混入しない（domain strict）

**状況**: ✅ **既に実装済み**
- 338行目: `generateResponseFromPlan(plan)` - テンプレ固定生成
- LLM未使用のため、一般テンプレが混入しない

### 5. ktk/iroha は law_candidates が無いので text.jsonl から fallback 抜粋候補を生成（ID規格：KTK-P####-T### / IROHA-P####-T###）

**状況**: ✅ **修正済み**
- `evidencePack.ts` の fallback ID規格を修正
- ID形式が `KTK-P####-T###` / `IROHA-P####-T###` に準拠
- **テスト**: Phase 7 で検証

---

## 🔍 不具合の根因と修正内容

### 問題1: detectIntent() が hasDocPage = true で "grounded" を返す

**根因**:
- `detectIntent()` が最初に `hasDocPage` をチェックして "grounded" を返していた
- これにより domain キーワードがあっても intent が "grounded" になる可能性があった

**修正**:
- domain キーワードチェックを最優先に移動
- `hasDocPage` のチェックを domain キーワードチェックの後に移動

**効果**:
- `言霊秘書.pdf pdfPage=103 言灵とは？` でも intent が "domain" になる
- mode が HYBRID になる

### 問題2: ktk/iroha の fallback ID規格が不一致

**根因**:
- ID形式が `${prefix}${pdfPage}-${i + 1}` になっていた（例: `KTK-103-1`）
- 必須仕様では `KTK-P####-T###` / `IROHA-P####-T###` という形式が要求されていた

**修正**:
- ID形式を `${prefix}P${pageStr}-T${trackStr}` に変更
- `pageStr` は 4桁、`trackStr` は 3桁でパディング

**効果**:
- ID形式が必須仕様に準拠（例: `KTK-P0103-T001`）

---

## 📝 受入テスト追加内容

### Phase 6: domainでdoc/pdfPageがあってもHYBRID固定

**テスト**: `言霊秘書.pdf pdfPage=103 言灵とは？` → `decisionFrame.intent=domain`, `mode=HYBRID`

**検証**:
- intent が "domain" であること
- mode が "HYBRID" であること（doc/pdfPage があっても）

### Phase 7: detailのID規格確認

**テスト**: `言灵とは？ #詳細` → detail内のIDが `KHS-P####-T###` / `KTK-P####-T###` / `IROHA-P####-T###` 形式のみ

**検証**:
- 無効なID形式が存在しないこと
- ID形式が正しいこと

---

## 🎯 期待される効果

1. **domain優先の確立**: `言霊秘書.pdf pdfPage=103 言灵とは？` でも intent が "domain"、mode が "HYBRID" になる
2. **ID規格の準拠**: ktk/iroha の fallback IDが必須仕様に準拠
3. **再発防止**: 受入テストで domain優先とID規格を検証

---

## 📌 次のステップ（オプション）

1. **detailのquote検証**: detailのquoteが `*_text.jsonl` 本文に部分一致で存在することを確認するテストを追加（実装は複雑なため、現時点では省略）
2. **LLM未使用の確認**: domainで evidence=0 なら LLM未使用をログで確認（受入テストでは latency.llm が null であることを確認可能）

---

## ✅ 完了確認

- ✅ 修正1: detectIntent() を修正（domain優先）
- ✅ 修正2: ktk/iroha の fallback ID規格を修正
- ✅ 修正3: 受入テスト追加（Phase 6, 7）
- ✅ ビルド成功確認
- ✅ 必須仕様の確認完了


