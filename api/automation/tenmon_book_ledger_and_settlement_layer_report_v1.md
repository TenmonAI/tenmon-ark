# TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1

## 目的

カタカムナに限らず書籍群を同一の **settlement** で扱う。全文投入を「学習完了」と見なさず、根拠・要約・伝統・天聞写像・未確定・暫定裁定を **judge 6 束** に分離し、台帳・解析ログ・カードへ投影する。

## 実装位置

| 要素 | ファイル |
|------|----------|
| 台帳カタログ・judge split・カード生成・読書 kernel | `api/src/core/tenmonBookReadingKernelV1.ts` |
| deepread 橋（`book_settlement` + handoff payload） | `api/src/core/tenmonBookReadingToDeepreadBridgeV1.ts` |
| digest payload への `book_ledger_settlement` 同梱・古事記系 catalog 行 | `api/src/core/tenmonMaterialDigestLedgerV1.ts` |
| study queue の `bookClass`・`kojiki_lineage` 行 | `api/src/core/tenmonMaterialStudyPlannerV1.ts` |

## book class

`root` / `mapping` / `comparative` / `auxiliary` — `BOOK_LEDGER_SETTLEMENT_CATALOG_V1` で資料 id と紐づく。

## judge 6 束（保存時）

`normalizeTenmonBookJudgeSplitForSaveV1` で常に 6 キーを持つオブジェクトに正規化（欠落は空配列・空文字、束のマージはしない）。

- `source_facts` — 参照子・版情報（本文ダンプ不可）
- `text_summary`
- `tradition_evidence`
- `tenmon_mapping`
- `uncertainty_flags`
- `provisional_verdict`

## カード

- **law**: `buildTenmonBookLawCardFromJudgeSplitV1`（`tradition_evidence` を hooks に投影）
- **comparison**: `buildTenmonBookComparisonCardFromJudgeSplitV1`（`tenmon_mapping` を軸に）
- **uncertainty**: `buildTenmonBookUncertaintyIssueCardFromJudgeSplitV1`（`uncertainty_flags` を issue に）

解析ログは `buildTenmonBookAnalysisLogEntryV1`（book 単位・`judge_split` 同梱）。

## 成果物

- `api/automation/tenmon_book_ledger_and_settlement_layer_result_v1.json` — `buildTenmonBookLedgerSettlementAutomationBundleV1()` のスナップショット（`created_at_iso` は再生成で変わり得る）

## nextOnPass / nextOnFail

- **PASS**: `TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_RETRY_CURSOR_AUTO_V1`
