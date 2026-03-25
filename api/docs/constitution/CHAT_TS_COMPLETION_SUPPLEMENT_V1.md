# CHAT_TS_COMPLETION_SUPPLEMENT_V1

## 目的

**完成判定**（`chat_ts_overall_100`）について、**worldclass report** と **seal merge** の結果を **同一 seal ディレクトリ内**で突き合わせ、

- **canonical**（正）を **seal `final_verdict`** に揃える  
- **食い違い**（特に `runtime_probes:not_executed` vs runtime green）を **mismatch として記録**する  
- **next-card** を **blocker 種別**で `dispatch_registry` に従って分岐する  

## 責務分割

| コンポーネント | 責務 |
|----------------|------|
| `tenmon_chat_ts_worldclass_completion_report_v1.py` | static、runtime **live / handoff**、inline surface、advisory |
| `chat_ts_stage5_verdict_merge_v1.py` | runtime_matrix + surface_audit + audits → **final_verdict**、**blocker_dispatch** 節 |
| `tenmon_chat_ts_completion_supplement_v1.py` | merged_completion、**mismatch**、**next_card_dispatch.json** |

## overall 項目

`chat_ts_static_100` ∧ `chat_ts_runtime_100` ∧ `surface_clean` ∧ `route_authority_clean` ∧ `longform_quality_clean` ∧ `density_lock` → `chat_ts_overall_100`

## 成果物パス

seal ログ: `.../card_*/<TS>/_completion_supplement/`

## 関連

- `CHAT_TS_COMPLETION_SUPPLEMENT_CURSOR_AUTO_V1`  
- `CHAT_TS_COMPLETION_SUPPLEMENT_VPS_V1`  
- `CHAT_TS_WORLDCLASS_AUTOPDCA_MANDATORY_REACH_V2.md`  

---

*Version: V1*
