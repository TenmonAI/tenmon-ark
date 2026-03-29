# TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_REPORT_V1

- **card**: `TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1`
- **観測**: `tenmonReuseBenchAndConversationUpliftAcceptanceV1.ts` が基底5プローブ＋補助4本で `buildKnowledgeBinder` + `applyKnowledgeBinderToKu` を実行（HTTP なし）

## final reuse probes（補助4本）

1. 心理化層（川ヰ亜哉子）と本流・普及・史実の切り分け
2. 神秘化マーケ層と原史料の分離（監査 `mystified` 照合）
3. 未確定論点の保留（宇野系×本流、uncertainty 表面必須）
4. 法華経スレッド再開（`thread_reentry_memory.book_id === hokekyo` + 台帳行数）

## final checks（集約）

- VPS 反射＋ARK が5本以上（再利用経路）
- `primary_book_material_id` の多様性（単書閉じ防止）
- ARK 観測プローブは台帳行数・evidence_binder 形状
- mapping_comparative / root / katakamuna lineage の再投入シグナル
- カタカムナ監査束 acceptance（系譜クラス欠落なし）

## 次カード

- **nextOnPass**: `TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_RETRY_CURSOR_AUTO_V1`

<!-- REUSE_BENCH_UPLIFT_AUTO_BEGIN -->

- **acceptance_pass**: `True`
- **npm_run_check_ok**: `True`
- **probe_acceptance_pass**: `True`
- **base_bench_acceptance_pass**: `True`

### final_checks

- `ark_inheritance_shape_ok`: `True`
- `distinct_primary_book_ids_gte3`: `True`
- `katakamuna_audit_bundle_accepted`: `True`
- `reuse_path_with_vps_min5`: `True`
- `route_families_for_reinject_ok`: `True`

### プローブ要約

- `bench_katakamuna_lineage` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `bench_uno_popularization` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `bench_tenmon_reintegration` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `bench_root_khs_mizuho_inari` ark=`True` book=`kotodama_hisho_khs` reentry=`kotodama_hisho_khs` unc_axes=`2`
- `bench_kukai_hokekyo_sanskrit` ark=`True` book=`kukai_lineage` reentry=`kukai_lineage` unc_axes=`1`
- `uplift_psychologization_kawai` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `uplift_mysticism_market` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `uplift_unresolved_hold` ark=`True` book=`katakamuna_kotodama_kai` reentry=`katakamuna_kotodama_kai` unc_axes=`2`
- `uplift_thread_reentry_hokekyo` ark=`True` book=`hokekyo` reentry=`hokekyo` unc_axes=`1`

<!-- REUSE_BENCH_UPLIFT_AUTO_END -->
