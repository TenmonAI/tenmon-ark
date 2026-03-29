# TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1

## 目的

VPS の書籍解析を **単発レポートで終わらせず**、Notion を **継承記録帳** として使うための、貼り付け・連携先で消費する **reflection ペイロード** を型で固定する。`vps_analysis_is_not_learning_complete` で「解析済み＝学習完了」としない。

## 実装

| 項目 | 場所 |
|------|------|
| ペイロード型・SHA-256・例示バンドル | `api/src/core/notionCanon.ts` |
| book_id 解決（台帳 id のみ）＋ NAS 行の同梱 | `api/src/core/knowledgeBinder.ts` |

## ペイロード（Notion へ最低限）

- `book_id`, `source_class`, `center_terms`, `repeated_terms`, `opposition_pairs`
- `tradition_evidence`, `tenmon_mapping`, `uncertainty`, `provisional_verdict`
- `nas_locator`（`locator_ref` / `nas_relative_path` / `canonical_root`）
- `hash`（上記束の正規化 SHA-256）
- `conversation_reuse_summary`（次会話用の短い索引。本文ダンプではない）
- `settlement_targets`: 書籍台帳・解析ログ・law / comparison / 未確定論点カードへの論理名
- `notion_inheritance_ledger_doc_title`: 提案書タイトル（運用者が Notion 上で照合）

## 前提ドキュメント

Notion 上の **`TENMON-ARK VPS解析結果を学習へ反映する仕組み 提案書`**（定数 `TENMON_NOTION_VPS_BOOK_ANALYSIS_PROPOSAL_DOC_TITLE_V1` と一致させる）。

## binder 適用条件（fail-closed）

- `BOOK_LEDGER_SETTLEMENT_CATALOG_V1` に存在する `book_id` のみ（`primary_book_material_id` または `centerKey` が台帳 id と一致するとき）。
- 生成物は `thoughtCoreSummary.vpsBookAnalysisNotionReflectionV1` および `ku.vpsBookAnalysisNotionReflectionV1` に載る。

## 附帯修正

- `getNotionCanonForRoute`: `canon.pages` 欠落時のフォールバックを **空配列** に変更（欠陥配列リテラルを除去）。

## 成果物

- `api/automation/tenmon_vps_to_notion_book_analysis_reflection_result_v1.json` — `buildVpsBookAnalysisNotionReflectionAutomationBundleV1()` のスナップショット

## nextOnPass / nextOnFail

- **PASS**: `TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_RETRY_CURSOR_AUTO_V1`
