# TENMON-ARK "天津金木思考回路＝Core/Surface二階建て" 実装進捗

**生成日時**: 2026-01-12  
**ステータス**: ⏳ 部分実装完了、統合実装進行中

---

## ✅ 完了したタスク

### Task A: 天津金木コア推論を新設 ✅
- **ファイル**: `src/core/kanagiCore.ts`
- **実装内容**:
  - `CorePlan` 型定義
  - `buildKanagiCorePlan()` - 天津金木コア推論（非LLM）
  - `answerType`: "direct" | "needsEvidence" | "askClarify" | "liveSearch"
  - `keyAxes`: present/missing
  - `operations`: ["省","延開","反約","反","約","略","転"] の採用候補
  - `claims`: "根拠で言える最小主張"の配列
  - `nextQuestion`: 1個だけ（必要なら）
  - `recommendedEvidence`: {doc,pdfPage} 候補
  - `strictness`: "strict" | "soft"（domainは strict）
- **完了条件**: ✅ ビルド成功

### Task C: HYBRIDの"捏造ゼロ"ガードを実装 ✅
- **ファイル**: `src/llm/outputGuard.ts`
- **実装内容**:
  - `guardLLMOutput()` - LLM出力の捏造ゼロガード
  - domain時、LLMが "定義/歴史/一般論テンプレ" を勝手に述べていたら破棄
  - CorePlan.claims を自然文化したテンプレに差し替え
  - lawId/pdfPage/quote は LLM出力から一切採用しない
- **完了条件**: ✅ ビルド成功

### Task G: ビルド識別子（API部分） ✅
- **ファイル**: `src/routes/health.ts`（既存）
- **実装内容**:
  - `/api/version` エンドポイントが既に実装済み
  - `builtAt`, `gitSha` を返す
- **完了条件**: ✅ 既に実装済み

---

## ⏳ 既に実装済み（確認済み）

### Task B: EvidencePackが無いdomainでは「答えない」 ✅
- **ファイル**: `src/routes/chat.ts`
- **実装状況**: ✅ 既に実装済み（HYBRID分岐で`plan === null`の場合、「資料不足」を返す）

### Task E: detail=nullを構造的に禁止 ✅
- **ファイル**: `src/routes/chat.ts`
- **実装状況**: ✅ 既に実装済み（detail === true のときは必ず文字列を返す）

### Task F: domainは#詳細でもHYBRID固定 ✅
- **ファイル**: `src/truth/truthSkeleton.ts`
- **実装状況**: ✅ 既に実装済み（intent === "domain" は常に HYBRID）

### Task H: UIスレッドタイトル自動命名 ✅
- **ファイル**: `web/src/lib/title.ts`, `web/src/pages/Chat.tsx`
- **実装状況**: ✅ 既に実装済み（deriveTitle関数で自動命名）

---

## 🔄 未実装タスク

### Task D: Surface（断捨離メルマガ調）の自然文テンプレを固定
- **ファイル**: `src/persona/speechStyle.ts`
- **実装内容（予定）**:
  - 口調の核を固定（断捨離メルマガの構造を模す）
  - 冒頭の受け止め：「ごきげんさまです」「ご質問ありがとうございます」
  - 視点反転：「なぜ〜しようとするのか」
  - 逆質問：「反対の視点で逆の質問」
  - 行動に戻す：「出来る/出来ないではなく、する/しない」
  - 締め：「いかがでしょうか」
  - `composeNatural()` は CorePlan を受け取り、2〜8行で整える
- **状態**: 未実装（既存の`composeNatural`を大幅に変更する必要がある）

### Task G: ビルド識別子（Front部分）
- **ファイル**: `web/index.html`, `web/vite.config.ts`（またはビルドスクリプト）
- **実装内容（予定）**:
  - `window.__TENMON_BUILD__ = "builtAt:... sha:..."` を index.html に埋め込み
- **状態**: 未実装

---

## 📝 実装ファイル一覧

### 新規作成（完了）
1. ✅ `src/core/kanagiCore.ts` - 天津金木コア推論
2. ✅ `src/llm/outputGuard.ts` - HYBRIDの捏造ゼロガード

### 既存（確認済み）
1. ✅ `src/routes/chat.ts` - EvidencePackが無いdomainでは「答えない」（既に実装済み）
2. ✅ `src/routes/health.ts` - /api/version エンドポイント（既に実装済み）
3. ✅ `src/truth/truthSkeleton.ts` - domainは#詳細でもHYBRID固定（既に実装済み）
4. ✅ `web/src/lib/title.ts` - スレッドタイトル自動命名（既に実装済み）

### 未実装
1. ⏳ `src/persona/speechStyle.ts` - Surface（断捨離メルマガ調）の自然文テンプレ（要大幅変更）
2. ⏳ `web/index.html` / `web/vite.config.ts` - window.__TENMON_BUILD__ 埋め込み

---

## 🔧 次のステップ

### 1. Task D: Surface（断捨離メルマガ調）の実装
`composeNatural()` を CorePlan を受け取るように変更し、断捨離メルマガ調のテンプレを実装。

**注意**: 既存の`composeNatural`は複数の場所で使用されているため、後方互換性を保ちながら実装する必要があります。

### 2. Task G: ビルド識別子（Front部分）
`web/vite.config.ts` またはビルドスクリプトで `window.__TENMON_BUILD__` を埋め込む。

---

## 📊 実装進捗

- ✅ **完了**: Task A, B, C, E, F, G（API部分）, H（8/8タスク、ただしTask Dは未実装）
- ⏳ **未実装**: Task D（Surfaceテンプレ）、Task G（Front部分）
- **完了率**: 約 75%（6/8 タスク完了、2タスクは部分実装）

---

## 📌 注意事項

### 既存コードとの統合
- `composeNatural` は既存コードで使用されているため、後方互換性を保ちながら実装する必要があります
- CorePlan を `composeNatural` に統合する場合は、既存の呼び出し元との互換性を確認してください

### 実装優先度
1. **高**: Task D（Surfaceテンプレ）は既存の`composeNatural`を大幅に変更する必要があるため、慎重に実装
2. **中**: Task G（Front部分）はビルドスクリプトの修正のみ


