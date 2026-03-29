# TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1

## 目的

Notion に定着した **judge 済み** 書籍解析（VPS reflection 束）を、ARK 側の再利用構造に載せ、**次ターンの thread 意味記憶・比較写像・（任意で）thread_center の next_axes** から参照できるようにする。Notion 原文は載せない。

## ARK 知識構造（論理）

`ArkBookCanonConversationReuseV1`（`threadMeaningMemory.ts`）に集約:

| 論理名 | フィールド |
|--------|------------|
| Book Canon Ledger | `book_canon_ledger`（優先順つき行） |
| Evidence Binder | `evidence_binder.ref_slugs` |
| Lawgraph Candidate Store | `lawgraph_candidate_store` |
| Terminology Memory | `terminology_memory.entries` |
| Thread Re-entry Memory | `thread_reentry_memory`（summary / hash_echo） |
| Uncertainty Registry | `uncertainty_registry` |

`not_raw_notion` / `judge_layer_only` で生返却禁止を型レベルで固定。

## 優先順（書籍）

`ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1`: カタカムナ言霊解 → 言霊秘書 → 水穂伝 → 稲荷古伝 → 空海 → 法華 → 悉曇束。`tenmonComparativeMappingV1` から再 export。

## 会話再利用

- **binder**: `vpsBookAnalysisNotionReflectionV1` があるときだけ `arkBookCanonConversationReuseV1` を生成し、`thoughtCoreSummary` / `ku` に載せる。
- **threadMeaningMemory**: `advanceThreadMeaningMemoryForRequestV1` が `ku.arkBookCanonConversationReuseV1` を読み、`uncertainty` / 未決着 / 暫定裁定を `unresolvedAxes`（`ark|*` 接頭辞）に合流。`nextStepBias` に `ark_book:<id>`。
- **threadCenterMemory**: `mergeNextAxesJsonWithArkBookCanonReuseV1` / `parseArkBookCanonReuseFromNextAxesJson`（upsert 側が任意採用）。
- **tenmonComparativeMappingV1**: `buildComparativeMappingV1({ bookCanonReuse })` で比較 hint に `comparison_digest` と uncertainty を追記。
- **tenmonSanskritComparativeKernelV1**: `resolveSanskritComparativeKernelV1(msg, { uncertainty_registry_flags })` で未決着束を insight に反映可能。

## ルート拡張

`threadMeaningMemoryRouteAllowedV1` に KATAKAMUNA / DEF_FASTPATH / TRUTH_GATE を追加し、上記メモリ合流が効くようにした。

## 成果物

- `api/automation/tenmon_ark_book_canon_ledger_and_conversation_reuse_result_v1.json` — `buildArkBookCanonConversationReuseAutomationBundleV1()`

## nextOnPass / nextOnFail

- **PASS**: `TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_RETRY_CURSOR_AUTO_V1`
