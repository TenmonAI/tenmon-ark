# TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_V1

## 目的

`khsCandidates` / `detailPlan.evidence` が返っても、**会話表面が脚注だらけでは読めない**。HYBRID 短文帯で、**法則 → 根拠 → 返答**を**主命題先行のまま**、美しい日本語の一段で織り込む（**捏造なし**）。

## 実装

- **`weaveKhsEvidenceIntoHybridSurfaceV1`** — `api/src/core/tenmonConversationSurfaceV2.ts`
- **適用箇所** — `applyFinalAnswerConstitutionAndWisdomReducerV1`（`api/src/routes/chat_refactor/finalize.ts`）  
  - `decisionFrame.mode === "HYBRID"`
  - `detailPlan.evidence` が KG2 形式の配列（`quote` スロットあり）
  - **長文帯・三弧・beauty 薄化・GROUNDING_SELECTOR** では**介入しない**
  - 織り込み成功時は機械的 **`evidencePack` 脚注行を空**にし、二重根拠を避ける
- **chat.ts** — KHS 豊富な `evidence` があるとき **`synthHybridResponseV1`（doc= 脚注）と CARD5 要点上書きをスキップ**し、finalize 側の美文へ委ねる
- **`surface_exit_trunk_v1.ts`** — 関数の再エクスポート（テスト・監査用）

## 方針（守るもの）

- **doc=/pdfPage= 形式の露骨な脚注にしない**
- **generic preamble / helper tail を増やさない**（既存 `trimTenmonSurfaceNoiseV3` 維持）
- **BAD quote** は `evaluateKokuzoBadHeuristicV1` で織り込まない
- **detailPlan / evidence 契約オブジェクトは変更しない**（読取りのみ）

## VPS

`api/scripts/kg2b_fractal_language_renderer_v1.sh` または `node automation/kg2b_fractal_surface_probe_v1.mjs`（要 `npm run build`）

## FAIL_NEXT

`TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_RETRY_CURSOR_AUTO_V1`
