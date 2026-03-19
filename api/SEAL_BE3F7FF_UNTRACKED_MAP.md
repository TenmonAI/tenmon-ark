# SEAL BE3F7FF 未追跡一覧マップ

- **HEAD sha:** be3f7ff
- **封印成立:** yes
- **PATCH29 acceptance:** PASS

## 未追跡一覧の分類表

| 分類 | パス |
|------|------|
| **no-touch** | `api/src/db/kokuzo_schema.sql` (M) |
| **観測物** | `api/probe.compare.json`, `api/probe.future.json`, `api/probe.selfaware.json`, `api/probe.systemdiag.json` |
| **観測物** | `ABSTRACT_CENTER_PERSIST_AND_REHYDRATE_V16_CURSOR.txt` ～ `V23_CURSOR.txt`, `ABSTRACT_CENTER_SINGLE_POINT_FIX_V24_CURSOR.txt` |
| **補助資料** | `api/CHAT_SAFE_REFACTOR_PATCH24_REPORT.md`, `api/CHAT_SAFE_REFACTOR_PATCH29_REPORT.md`, `api/CHAT_SAFE_REFACTOR_SEAL_PATCH29_PATCH30_SUMMARY.md` |
| **補助資料** | `api/src/routes/CARD_BOOK_CONTINUATION_MEMORY_V1.md`, `CARD_BOOK_MODE_ARCHITECTURE_V1.md`, `CARD_EXPLICIT_CHAR_TARGET_RANGE_V1.md`, `CARD_JUDGEMENT_COMPARE_ROUTE_V1.md`, `CARD_JUDGEMENT_PREEMPT_V1.md`, `CARD_LONGFORM_1000_STRUCTURE_V1.md`, `CARD_NATURAL_GENERAL_SHRINK_V2.md`, `CARD_RESPONSE_FRAME_LIBRARY_V1.md` |
| **補助資料** | `api/src/routes/CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` |
| **補助資料** | `api/src/routes/FINAL_REPORT_V1/`, `api/src/routes/RECONCILE_AUDIT_V1/`, `api/src/routes/WORLD_CLASS_ANALYSIS_V1/`, `api/src/routes/WORLD_CLASS_ANALYSIS_V2/` |
| **補助資料** | `api/src/routes/chat_refactor/BASELINE_V1.md`, `EXIT_MAP_V1.md`, `PATCH3_FINALIZE_MAP_V1.md`, `README.md` |
| **補助資料** | `api/scripts/patch29_probe_8_sweep.sh`, `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts`, `api/tools/tenmon_full_internal_circuit_report_v1.py` |
| **残骸/スタブ** | `api/src/routes/chat_refactor/define.ts`, `entry.ts`, `general.ts` |

## 次カード候補

1. **no-touch 維持のまま kokuzo_schema 差分の別管理** — `api/src/db/kokuzo_schema.sql` の変更を別ブランチ／stash で管理するか、このリポジトリでは add/commit しない方針を文書化するだけ。コード変更・build・commit は行わない。
