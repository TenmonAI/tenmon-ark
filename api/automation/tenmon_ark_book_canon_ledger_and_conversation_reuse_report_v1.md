# TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_REPORT_V1

- **card**: `TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1`
- **型・束**: `api/src/core/threadMeaningMemory.ts`（`ArkBookCanonConversationReuseV1`）
- **Notion 橋**: `api/src/core/notionCanon.ts` の `ARK_BOOK_CANON_LEDGER_STRUCTURES_V1`
- **binder 同梱**: `api/src/core/knowledgeBinder.ts` → `ku.arkBookCanonConversationReuseV1`（judge 済みのみ）
- **thread 再利用**: `advanceThreadMeaningMemoryForRequestV1` が `unresolvedAxes` に uncertainty / open / provisional を合流
- **比較写像**: `getSelfLearningAutostudyBundleV1` が ARK reuse を `buildComparativeMappingV1` / `resolveSanskritComparativeKernelV1` に渡す

## ARK 知識構造（6 + reuse 束）

1. **book_canon_ledger** — 優先順（先頭: カタカムナ言霊解）
2. **evidence_binder** — 参照子（Notion 原文は載せない）
3. **lawgraph_candidate_store** — law グラフ候補
4. **terminology_memory** — 用語×書籍
5. **thread_reentry_memory** — 再入要約・hash echo
6. **uncertainty_registry** — 未決着の保持（消去禁止）

`reuse_for_routes` に既解析範囲・書籍軸・定義差分・比較要約・未決・provisional verdict。

## 次カード

- **nextOnPass**: `TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_RETRY_CURSOR_AUTO_V1`

<!-- ARK_BOOK_CANON_AUTO_BEGIN -->

- **acceptance_pass**: `True`
- **npm_run_check_ok**: `True`
- **probe_acceptance_pass**: `True`
- **route_carry_note**: 'compare/define/historical(FACTUAL_*)/mapping/世界観/概念 canon で threadMeaningMemory が ark 束を unresolvedAxes に合流（uncertainty 消去禁止）。'

<!-- ARK_BOOK_CANON_AUTO_END -->
