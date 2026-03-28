# TENMON_ROOT_ARBITRATION_KERNEL_RESTORE_REPORT_V1

## 目的

既存の `input split` → `truthLayerArbitrationV1` → `sourceLayerDiscernmentV1` → `lineageTransformationJudgementV1` → `speculativeGuardV1` を、**一段の root decision**（`TENMON_ROOT_TRUTH_ARBITRATION_KERNEL_V1`）に束ねる。`meaningArbitrationKernel.ts` の裁定ロジックは変更していない。

## 追加・変更

| 項目 | 内容 |
|------|------|
| 新規 | `api/src/core/truthLayerArbitrationKernel.ts` — `buildRootTruthArbitrationKernelV1`, 型 `TruthLayerArbitrationKernelResultV1`, `TenmonDiscernmentJudgementBundleV1`（source+lineage の概念的束） |
| binder | `buildKnowledgeBinder` / `KnowledgeBinderResult` に `truthLayerArbitrationKernelV1` を追加。split + truth + discernment + lineage + guard が揃ったときのみ付与 |
| ku | `applyKnowledgeBinderToKu` で `ku.truthLayerArbitrationKernelV1` を設定（既存 truth/discernment/guard は上書きしない） |
| projector | `pickRootTruthArbitrationKernelFromKuV1`、`rootTruthArbitrationKernelV1` 入力。`displayConstraint` に応じて推測ヒント付与を抑制、`allow_minimal_next_step` が false のとき ONE_STEP 自動追記を抑止 |
| chat | `projectTenmonUserFacingResponseV1` 呼び出し 3 箇所で `pickRootTruthArbitrationKernelFromKuV1` を渡す |
| surface leak | `truthLayerArbitrationKernelV1` / `tenmonDiscernmentJudgementBundleV1` を表層 strip 対象に追加（projector + `stripInternalRouteTokensFromSurfaceV1`） |

## root オブジェクト（要約）

- `rootMode`: truth の `answerMode` と discernment の `tenmon_reintegration` 等から決定
- `truthPriority`: truth の answerMode 文字列
- `centerStability`: `hold` / `soften` / `rotate`（danshari・riskFlags 由来）
- `separationPolicy`: 履歴/写像分離・象徴/事実分離・中心保持・次の一手許容のフラグ配列
- `displayConstraint`: projector が参照する 3 ブール
- `reasonSummary`: 1 行の観測用要約

## 検証

- `npm run check`: **PASS**

## manual プローブ（5 本）

運用側で `decisionFrame.ku.truthLayerArbitrationKernelV1` の有無と `rootMode` / `separationPolicy` を確認。

## 次カード

- **nextOnPass**: `TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_ROOT_ARBITRATION_KERNEL_RESTORE_RETRY_CURSOR_AUTO_V1`
