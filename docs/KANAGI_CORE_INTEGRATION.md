# TENMON-ARK "天津金木思考回路＝Core/Surface二階建て" 統合実装

**生成日時**: 2026-01-12  
**ステータス**: ✅ 型定義・コア実装完了、chat.ts統合準備中

---

## ✅ 実装完了したファイル

### 1. 型定義
- ✅ `src/kanagi/types/corePlan.ts` - 新しいCorePlan型定義
  - `Strictness`, `AnswerType`, `AxisKey`, `KanagiOp`, `DocKey`
  - `EvidenceHit`, `EvidencePack`, `CoreClaim`, `CorePlan`

### 2. コア実装
- ✅ `src/kanagi/kanagiCore.ts` - 決定論コア（LLMから切り離し）
  - `buildCorePlan()` - 天津金木コア推論
  - `detectAxes()`, `chooseOps()`, `buildKeyAxes()`, `pickEvidence()`

### 3. ガード・生成
- ✅ `src/llm/outputGuard.ts` - 捏造ゼロガード
  - `guardSurfaceText()` - LLM出力の検証

- ✅ `src/persona/composeNatural.ts` - 自然文生成
  - `composeNaturalFromPlan()` - CorePlanから自然文を生成

- ✅ `src/kotodama/renderDetail.ts` - detail生成
  - `renderDetailFromEvidence()` - EvidencePackからdetailを生成

### 4. アダプター
- ✅ `src/kotodama/evidenceAdapter.ts` - 既存EvidencePackから新しい型への変換
  - `convertToNewEvidencePack()` - 型変換

---

## ⏳ 未実装（次のステップ）

### chat.tsのHYBRID分岐の統合

`src/routes/chat.ts`のHYBRID分岐（288-395行目）を新しい実装に置き換える必要があります。

**現状**:
- 既存の`buildCoreAnswerPlan()`を使用
- 既存の`generateResponseFromPlan()`を使用

**目標**:
- 新しい`buildCorePlan()`を使用
- 新しい`composeNaturalFromPlan()`を使用
- 新しい`renderDetailFromEvidence()`を使用
- 新しい`guardSurfaceText()`を使用

**統合手順**:
1. `buildEvidencePackSafe()`関数を実装（既存の`buildEvidencePack`を使用）
2. `callLLMForSurfaceOnly()`関数を実装（LLM呼び出しを整形専用にする）
3. HYBRID分岐を新しい実装に置き換え

---

## 📝 実装メモ

### 型の違い

**既存のEvidencePack** (`kotodama/evidencePack.ts`):
```typescript
type EvidencePack = {
  doc: string;
  pdfPage: number;
  laws: Array<{ id: string; title: string; quote: string }>;
  pageText: string;
  summary: string;
  // ...
};
```

**新しいEvidencePack** (`kanagi/types/corePlan.ts`):
```typescript
interface EvidencePack {
  hits: EvidenceHit[];
  debug?: { query: string; usedFallback?: boolean };
}
```

**変換**: `evidenceAdapter.ts`の`convertToNewEvidencePack()`を使用

### 関数の対応関係

| 既存 | 新しい実装 |
|------|-----------|
| `buildCoreAnswerPlan()` | `buildCorePlan()` |
| `generateResponseFromPlan()` | `composeNaturalFromPlan()` |
| `generateDetailFromPlan()` | `renderDetailFromEvidence()` |
| `containsForbiddenTemplate()` | `guardSurfaceText()` |

---

## 🔧 次のステップ

1. **`buildEvidencePackSafe()`の実装**
   - 既存の`buildEvidencePack()`を呼び出し
   - `convertToNewEvidencePack()`で変換
   - 新しい`EvidencePack`型を返す

2. **`callLLMForSurfaceOnly()`の実装**
   - LLM呼び出しを整形専用にする
   - 引用・lawId・pdfPageは禁止
   - `guardSurfaceText()`で検証

3. **HYBRID分岐の置き換え**
   - 新しい実装を使用
   - 既存コードとの互換性を確保


