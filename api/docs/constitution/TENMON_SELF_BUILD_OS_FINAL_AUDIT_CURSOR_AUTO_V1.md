# TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_V1

## 目的

**7 枚の自己改善・自己構築 OS** がリポジトリ上・VPS 成果物として **実装到達しているか** を一束で監査し、`self_build_os_overall_ready` と **会話加速ループ準備**（`conversation_acceleration_loop_ready`）を一意に判定する。

## 監査対象（7 系統）

| ID | 主な根拠 |
|----|-----------|
| `observation_os_ready` | `TENMON_OBSERVATION_OS_VPS_V1` + `observation_os_report.json` + taxonomy / priority_queue |
| `cursor_autobuild_ready` | `TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1` + `cursor_acceptance_manifest_v2.json` + `cursor_autobuild_common_v2.py` |
| `vps_acceptance_ready` | `TENMON_VPS_ACCEPTANCE_OS_VPS_V1` + `integrated_acceptance_seal.json` の `overall_pass` |
| `self_repair_ready` | `TENMON_SELF_REPAIR_OS_VPS_V1` + `self_repair_seal.json` + dangerous_patch 非 block |
| `learning_integration_ready` | `TENMON_LEARNING_INTEGRATION_OS_VPS_V1` + `learning_integration_seal.json` の `overall_pass` |
| `feature_autobuild_ready` | `TENMON_FEATURE_AUTOBUILD_OS_VPS_V1` + `feature_completion_seal.json` の `feature_completion_seal` |
| `remote_command_center_ready` | `TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1` + command center seal `overall_ok` + `adminCursorCommand.ts` |

## 集約フラグ

- **artifact_ok**（各系統）: マーカー・代表 JSON・必須コードの存在  
- **runtime_ok**: seal の pass 系・危険パッチフラグ等  
- **self_build_os_static_ready**: 全系統 `artifact_ok`  
- **self_build_os_runtime_ready**: 全系統 `runtime_ok`  
- **self_build_os_overall_ready**: static ∧ runtime  
- **conversation_acceleration_loop_ready**: `overall_ready` と同値（次フェーズ解禁）

## 出力

- `api/automation/self_build_os_final_audit.json` — 全文  
- `api/automation/self_build_os_blockers.json` — blocker 最大 5  
- `api/automation/self_build_os_integrated_verdict.json` — 総合判定  
- `api/automation/generated_cursor_apply/SELF_BUILD_OS_NEXT_PDCA_AUTO_V1.md` — 未達時の次カード導線  
- `api/automation/TENMON_SELF_BUILD_OS_FINAL_AUDIT_VPS_V1` — VPS マーカー  

## 実行

```bash
api/scripts/self_build_os_final_audit_v1.sh
# または
cd api/automation && python3 self_build_os_final_audit_v1.py
```

## FAIL NEXT

`TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_RETRY_V1` — `generated_cursor_apply/TENMON_SELF_BUILD_OS_FINAL_AUDIT_CURSOR_AUTO_RETRY_V1.md`

## 非対象

`dist/**`、`chat.ts` 本体、DB schema、`kokuzo_pages` 正文、`/api/chat` 契約、systemd env
