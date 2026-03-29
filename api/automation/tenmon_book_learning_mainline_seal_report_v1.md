# TENMON_BOOK_LEARNING_MAINLINE_SEAL_REPORT_V1

- **card**: `TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1`
- **観測**: `tenmonBookLearningMainlineSealV1.ts` が OCR JSON・settlement プローブ・deep xray・reuse uplift を束ねる（HTTP なし）

## mainline（封印対象）

1. `tenmon_ocr_runtime_wake_and_binary_verify_result_v1.json` … `acceptance_pass`
2. settlement プローブ … example_unit schema + judge 分離
3. カタカムナ source_class 監査（deep xray sources と同値）
4. ARK Book Canon Ledger 自動化形状
5. reuse bench（Ledger / evidence_binder / thread_reentry / uncertainty の観測）
6. deep xray forensic `acceptance_pass`
7. reuse uplift acceptance `acceptance_pass`

## 次カード

- **nextOnPass**: `TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_BOOK_LEARNING_MAINLINE_SEAL_RETRY_CURSOR_AUTO_V1`

<!-- BOOK_LEARNING_MAINLINE_SEAL_AUTO_BEGIN -->

- **acceptance_pass**: `False`
- **npm_run_check_ok**: `True`
- **seal_probe_acceptance_pass**: `False`

### gates

- `ark_ledger_automation_pass`: `True`
- `deep_xray_forensic_pass`: `True`
- `katakamuna_lineage_mix_suppressed`: `True`
- `katakamuna_source_audit_pass`: `True`
- `ocr_json_present`: `True`
- `ocr_runtime_acceptance_pass`: `False`
- `reuse_bench_ark_and_uncertainty_observed`: `True`
- `reuse_bench_pass`: `True`
- `reuse_uplift_acceptance_pass`: `True`
- `settlement_probe_pass`: `True`
- `settlement_unit_schema_ok`: `True`

### failure_reasons

- `ocr_runtime_acceptance_not_pass`

<!-- BOOK_LEARNING_MAINLINE_SEAL_AUTO_END -->
