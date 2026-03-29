# TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_REPORT_V1

- **card**: `TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1`
- **source of truth（型・束）**: `api/src/core/katakamunaSourceAuditClassificationV1.ts`
- **machine bundle**: `api/automation/tenmon_katakamuna_source_audit_and_classification_result_v1.json`（`getKatakamunaSourceAuditBundleV1()` と同期）

## source_class（最低限）

| source_class | 意味（監査上） |
|--------------|----------------|
| `primary_root` | 写本・資料原層（NAS 実体で `nas_locator` / `content_hash` を埋める） |
| `lineage_transmission` | 系譜・伝承・整理（楢崎系・相似象系など） |
| `commentary` | 注釈・講話・解説層（本文 OCR と分離） |
| `popularized` | 後代普及（宇野多美恵以降の一括「本流」扱い禁止） |
| `psychologized` | 心理化フレーム優位 |
| `mystified` | 神秘化・断定性インフレリスク |
| `tenmon_reintegration` | 天聞側再統合・写像（外部出版社本文と分離） |
| `unknown` | 未細分化（バケット） |

## medium_type の分離

- `ocr_pdf` / `parsed_text` / `image_scan` / `commentary_layer` / `transcription_unknown` / `unknown`
- **OCR・パース本文・画像スキャン・注釈は必ず別 `extracted_ref` / 別エントリで束ねる**（混線防止）。

## 代表エントリ（要約）

| id | author / 系 | source_class | nas_locator（プレースホルダ） |
|----|-------------|--------------|-------------------------------|
| `narazaki_satsuki_lineage_core` | 楢崎皐月 | `lineage_transmission` | `nas:/tenmon/katakamuna_library/{slug}/narazaki_satsuki/` |
| `uno_tamie_popular` | 宇野多美恵 | `popularized` | `.../uno_tamie/` |
| `soozishou_lineage` | 相似象系 | `lineage_transmission` | `.../similarity_symbol/` |
| `yoshino_nobuko_popular` | 吉野信子 | `popularized` | `.../yoshino_nobuko/` |
| `kawai_ayako_psych` | 川ヰ亜哉子 | `psychologized` | `.../kawai_ayako/` |
| `itagaki_akiko_popular` | 板垣昭子 | `popularized` | `.../itagaki_akiko/` |
| `amano_shigemi_commentary` | 天野成美 | `commentary` | `.../amano_shigemi/` |
| `tenmon_ark_reintegration_corpus` | — | `tenmon_reintegration` | `.../tenmon_reintegration/` |
| `modern_katakamuna_books_bucket` | その他普及 | `popularized` | `.../misc_popular/` |
| `katakamuna_mystified_misc` | 神秘化バケット | `mystified` | `.../mystified_misc/` |
| `primary_manuscript_placeholder` | — | `primary_root` | `.../primary_manuscripts/` |

## sourceLayer 連携（最小）

- `discernSourceLayerV1`: カタカムナ文脈で上記二次コーパス名が出た場合 `riskFlags` に `katakamuna_secondary_or_popular_corpus_named` を付与（routeReason は不変）。

## 次カード

- **nextOnPass**: `TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_RETRY_CURSOR_AUTO_V1`
