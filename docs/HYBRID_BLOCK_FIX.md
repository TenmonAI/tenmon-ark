# HYBRIDブロック修正レポート

**生成日時**: 2026-01-12  
**目的**: HYBRIDモードでLLM未使用、responseフィルタ追加

---

## ✅ 実装した修正

### 1. responseフィルタの追加

**ファイル**: `src/persona/responseFilter.ts`（新規作成）

**実装内容**:
- `filterResponseText()` 関数を追加
- response本文から禁止語句を削除:
  - `#詳細`
  - `pdfPage:`
  - `lawId:`
  - `引用:`

### 2. HYBRIDブロックでのフィルタ適用

**ファイル**: `src/routes/chat.ts`

**変更内容**:
- `filterResponseText` をインポート
- `generateResponseFromPlan(plan)` の後に `filterResponseText(response)` を適用

**変更前**:
```typescript
let response = generateResponseFromPlan(plan);
// ...
```

**変更後**:
```typescript
let response = generateResponseFromPlan(plan);
const detailText = detail ? generateDetailFromPlan(plan) : undefined;

// 4. response本文から禁止語句を削除（#詳細 / pdfPage: / lawId: / 引用:）
response = filterResponseText(response);
```

---

## ✅ 必須要件の確認

### 1. HYBRID(domain)では LLMを呼ばない

**状況**: ✅ **既に実装済み**
- `generateResponseFromPlan(plan)` を使用（LLM未使用）
- `generateDetailFromPlan(plan)` を使用（LLM未使用）
- ログで `llm: null` を記録

### 2. evidence（plan）が作れない場合は「資料不足＋doc/pdfPage指定依頼」を返して終了

**状況**: ✅ **既に実装済み**
- 293-335行目: `plan === null` の場合、「資料不足」レスポンスを返す
- LLMを呼ばずに終了

### 3. response は generateResponseFromPlan(plan) のみ

**状況**: ✅ **既に実装済み**
- 338行目: `generateResponseFromPlan(plan)` を使用
- LLM未使用

### 4. detail は generateDetailFromPlan(plan) のみ（LLM由来のpdfPage/lawId/引用は禁止）

**状況**: ✅ **既に実装済み**
- 339行目: `generateDetailFromPlan(plan)` を使用
- LLM未使用のため、LLM由来のpdfPage/lawId/引用は生成されない

### 5. response本文に #詳細 / pdfPage: / lawId: / 引用: が混入したら削除する（フィルタ）

**状況**: ✅ **修正済み**
- `filterResponseText()` 関数を追加
- `generateResponseFromPlan(plan)` の後に `filterResponseText(response)` を適用

---

## 📝 修正ファイル一覧

1. ✅ `src/persona/responseFilter.ts` - 新規作成（responseフィルタ）
2. ✅ `src/routes/chat.ts` - filterResponseText をインポート・適用

---

## 🧪 テスト

**テストスクリプト**: `test_hybrid_fix.sh`

**テスト項目**:
1. HYBRIDモードでLLM未使用を確認
2. detailがEvidencePack由来のみであることを確認
3. evidence=0の場合の確認
4. responseに禁止語句が含まれていないことを確認

---

## 🎯 結論

**必須要件**: ✅ **すべて実装済み**

- ✅ HYBRID(domain)では LLMを呼ばない
- ✅ evidence（plan）が作れない場合は「資料不足＋doc/pdfPage指定依頼」を返して終了
- ✅ response は generateResponseFromPlan(plan) のみ
- ✅ detail は generateDetailFromPlan(plan) のみ
- ✅ response本文に #詳細 / pdfPage: / lawId: / 引用: が混入したら削除する（フィルタ）

**次のステップ**: `pnpm build` → `systemctl restart` → `curl再現テスト`


