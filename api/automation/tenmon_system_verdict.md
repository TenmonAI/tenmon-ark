# TENMON system verdict (integrated)

- generated_at: `2026-03-24T19:47:56Z`
- **pass**: `False`
- **overall_band**: `code_complete_lived_unproven`
- **env_failure_separated**: `True`
- **completion_gate**: `False`
- **os_gate**: `False`
- **final_recommended_card**: `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`

## Subsystems

| subsystem | band | code_present | runtime_proven | accepted_complete |
|-----------|------|--------------|----------------|-------------------|
| `conversation_backend` | yellow | True | False | False |
| `pwa_code_constitution` | green | True | True | True |
| `pwa_lived_proof` | yellow | True | False | False |
| `self_audit_os` | red_env | True | False | False |
| `self_repair_os` | red_env | True | True | False |
| `self_build_os` | yellow | True | True | False |
| `remote_admin_cursor_bridge` | red_env | True | True | False |
| `learning_self_improvement` | yellow | True | False | False |

## Primary blockers (top-level)

- **conversation_backend**: `conversation_runner_not_pass`, `chat_ts_overall_not_100`
- **pwa_lived_proof**: `chat:continuity_failed`, `chat:new_chat_failed`, `chat:refresh_empty_response`, `chat:refresh_second_request_failed`, `chat:threadId_missing_in_response`, `continuity_fail`, `duplicate_or_bleed_fail`, `gate:audit`
- **self_audit_os**: `verdict_source_split_not_single`, `orchestrator_integrated_verdict_exists`, `pwa_false_mostly_due_env_failure`, `pwa_blocker_json_present_and_may_be_stale_until_live_rerun`, `overall_band=code_complete_lived_unproven`
- **self_repair_os**: `self_repair: dangerous_patch_blocker_report.blocked=true`
- **self_build_os**: `self_build_os_final_seal_not_yet_evidenced`
- **remote_admin_cursor_bridge**: `remote_admin_runtime_proof_incomplete`
- **learning_self_improvement**: `learning_integrated_verdict_not_ok`, `learning_chain_not_ok`

- single JSON: `/opt/tenmon-ark-repo/api/automation/tenmon_system_verdict.json`
