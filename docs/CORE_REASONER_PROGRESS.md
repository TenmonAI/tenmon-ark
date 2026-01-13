# TENMON-ARK "真理骨格固定" 中枢化スプリント - 実装進捗サマリー

**生成日時**: 2026-01-10  
**ステータス**: ✅ コア実装完了（Task A-D）、統合実装準備完了

---

## ✅ 完了した実装

### Task A: Retrieval Index ✅
- **ファイル**: `src/kotodama/retrievalIndex.ts`
- **実装内容**:
  - kuromoji を使用した日本語トークン化
  - text.jsonl と law_candidates.jsonl を読み込んでインデックス構築
  - `searchPages(query, topK=3)` で高速検索
  - スコアリング（law_candidates は重み2倍）
- **起動時初期化**: ✅ `src/index.ts` に追加済み

### Task B: EvidencePack強化 ✅
- **ファイル**: `src/kotodama/evidencePack.ts`
- **実装内容**:
  - `sha256` フィールド追加（ページ本文のハッシュ）
  - `MAX_TEXT_LENGTH` を 4000 に変更
  - `MAX_LAWS` を 10 に変更

### Task C: Truth Axes Extractor ✅
- **ファイル**: `src/truth/axes.ts`
- **実装内容**:
  - `inferTruthAxesFromEvidence()` - EvidencePackから真理軸を抽出
  - `buildSteps()` - 骨格推論ステップを構築
  - `detectMissingAxes()` - 不足軸を検出

### Task D: CoreAnswerPlan Builder ✅
- **ファイル**: `src/core/domainCore.ts`, `src/core/types.ts`
- **実装内容**:
  - `CoreAnswerPlan` 型定義
  - `buildCoreAnswerPlan()` - 中枢推論エンジン
  - RetrievalIndex → EvidencePack → TruthAxes → Quotes → Conclusion の流れ
  - テンプレートベースの結論生成（ネット文禁止）

---

## ⏳ 次のステップ（統合実装）

### Task E: Surface Generator実装
- **ファイル**: `src/persona/surfaceGenerator.ts`（新規）, `src/routes/chat.ts`（統合）
- **実装内容**:
  - `generateResponseFromPlan()` - CoreAnswerPlanからresponseを生成（テンプレ固定）
  - `generateDetailFromPlan()` - CoreAnswerPlanからdetailを生成
  - 出力テンプレ：
    - 1文目：資料上の定義（言い換え）
    - 2文目：真理軸に照らした位置づけ
    - 3文目：質問への結論（短い）

### Task F: 禁止語・禁止構文フィルタ
- **ファイル**: `src/persona/outputGuard.ts`（新規）
- **実装内容**:
  - 禁止テンプレ語の検出（「日本の伝統的概念/古来より信じられ/ポジティブな言葉で…」等）
  - NGならテンプレのみで返す（LLM再生成しない）

### Task G: 受入テスト正式化
- **ファイル**: `scripts/acceptance_test.sh`
- **実装内容**:
  - `言灵とは？ #詳細` → mode=HYBRID / detailType=string / 引用が doc/pdfPage に紐づく
  - responseに禁止テンプレ語が入っていない
  - lawId は KHS/KTK/IROHA の candidates由来形式のみ（捏造禁止）

---

## 📝 実装ファイル一覧

### 新規作成（完了）
1. ✅ `src/core/types.ts` - CoreAnswerPlan型定義
2. ✅ `src/kotodama/retrievalIndex.ts` - Retrieval Index実装
3. ✅ `src/truth/axes.ts` - Truth Axes Extractor実装
4. ✅ `src/core/domainCore.ts` - CoreAnswerPlan Builder実装

### 修正（完了）
1. ✅ `src/kotodama/evidencePack.ts` - sha256追加、MAX_TEXT_LENGTH/MAX_LAWS変更
2. ✅ `src/index.ts` - 起動時初期化（initRetrievalIndex）追加

### 未実装（次のステップ）
1. ⏳ `src/persona/surfaceGenerator.ts` - Surface Generator実装
2. ⏳ `src/persona/outputGuard.ts` - 禁止語・禁止構文フィルタ実装
3. ⏳ `src/routes/chat.ts` - CoreAnswerPlan統合（HYBRID/GROUNDED モード）
4. ⏳ `scripts/acceptance_test.sh` - 受入テスト更新

---

## 🔧 統合実装の指針

### `routes/chat.ts` の統合ポイント

**HYBRID モード**:
```typescript
if (mode === "HYBRID") {
  // 1. CoreAnswerPlan を構築
  const plan = await buildCoreAnswerPlan(message, detail);
  
  // 2. plan === null なら LLM呼ばずに「資料不足」を返す
  if (!plan) {
    return res.json({
      response: "資料不足です。次に読むべきdoc/pdfPageを指定してください。",
      evidence: null,
      decisionFrame: { mode, intent: skeleton.intent },
      timestamp: new Date().toISOString(),
    });
  }
  
  // 3. Surface Generator でresponse/detailを生成（テンプレ固定）
  const response = generateResponseFromPlan(plan);
  const detailText = detail ? generateDetailFromPlan(plan) : undefined;
  
  // 4. Output Guard で禁止テンプレ語を検出
  if (containsForbiddenTemplate(response)) {
    // テンプレのみで返す（LLM再生成しない）
    return res.json({
      response: plan.conclusion, // テンプレのみ
      evidence: { ... },
      detail: detailText,
      timestamp: new Date().toISOString(),
    });
  }
  
  // 5. LLMは「口」に限定：文章の自然化のみ（必要なら）
  // （現状はテンプレのみで返すことを優先）
}
```

**絶対要件の確認**:
- ✅ domain質問は EvidencePack が無ければ断定回答しない（plan === null で確認）
- ✅ responseは「資料不足」＋「次に読む doc/pdfPage 候補」だけ（plan === null の場合）
- ✅ LLMを呼ばずに返す（plan === null の場合）
- ✅ 引用（quote / lawId / pdfPage）は EvidencePack 由来のみ（CoreAnswerPlanで実装済み）
- ⏳ 回答は構文テンプレ固定（Surface Generatorで実装予定）
- ⏳ LLMは「口」に限定：文章の自然化のみ（Surface Generatorで実装予定）
- ⏳ 出力検査で弾いてテンプレ再生成する（Output Guardで実装予定）

---

## 📊 実装進捗

- ✅ **完了**: Task A, B, C, D（コア実装）
- ⏳ **進行中**: Task E, F, G（統合実装）
- **完了率**: 約 57%（4/7 タスク完了）


