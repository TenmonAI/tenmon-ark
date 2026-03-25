# TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1

- generated_at: `2026-03-24T19:47:56Z`
- **score_total** / **score_max**: `66.4` / `118`
- **score_percent**: `56.27`
- **sealed_operable_ready**: `False`
- **worldclass_ready**: `False`
- **primary_gap**: `conversation_backend`
- **recommended_next_card**: `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`

## Subsystems

| subsystem | score | max | band | accepted_complete |
|---|---:|---:|:---|:---:|:---:|
| infra_gate | 12.0 | 12 | green | True |
| conversation_backend | 6.0 | 12 | yellow | False |
| conversation_continuity | 6.0 | 12 | yellow | False |
| pwa_code_constitution | 10.0 | 10 | green | True |
| pwa_lived_proof | 6.0 | 12 | yellow | False |
| repo_hygiene | 12.0 | 12 | green | True |
| self_audit_os | 1.8 | 10 | red_env | False |
| self_repair_os | 1.8 | 10 | red_env | False |
| self_build_os | 5.0 | 10 | yellow | False |
| remote_admin_cursor | 1.8 | 10 | red_env | False |
| learning_self_improvement | 4.0 | 8 | yellow | False |

### primary_blockers (non-complete)

- **conversation_backend**: ['conversation_runner_not_pass', 'chat_ts_overall_not_100']
- **conversation_continuity**: ['sessionId_reference_in_mainline_web_src', 'continuity_hold_not_observed']
- **pwa_lived_proof**: ['chat:continuity_failed', 'chat:new_chat_failed', 'chat:refresh_empty_response', 'chat:refresh_second_request_failed', 'chat:threadId_missing_in_response', 'continuity_fail', 'duplicate_or_bleed_fail', 'gate:audit', 'gate:audit_build', 'gate:health', 'gate_audit_build_fail', 'meta_leak_none']
- **self_audit_os**: ['verdict_source_split_not_single', 'orchestrator_integrated_verdict_exists', 'pwa_false_mostly_due_env_failure', 'pwa_blocker_json_present_and_may_be_stale_until_live_rerun', 'overall_band=code_complete_lived_unproven']
- **self_repair_os**: ['self_repair: dangerous_patch_blocker_report.blocked=true', 'safe_patch_loop_not_pass', 'self_repair_acceptance_seal_not_pass']
- **self_build_os**: ['self_build_os_final_seal_not_yet_evidenced']
- **remote_admin_cursor**: ['remote_admin_runtime_proof_incomplete']
- **learning_self_improvement**: ['learning_integrated_verdict_not_ok', 'learning_chain_not_ok']

## Inputs

- `tenmon_system_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_system_verdict.json`
- `tenmon_regression_memory`: `/opt/tenmon-ark-repo/api/automation/tenmon_regression_memory.json`
- `tenmon_repo_hygiene_watchdog_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_repo_hygiene_watchdog_verdict.json`
- `tenmon_self_repair_safe_loop_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_self_repair_safe_loop_verdict.json`
- `tenmon_self_repair_acceptance_seal_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_self_repair_acceptance_seal_verdict.json`
- `tenmon_self_build_execution_chain_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_self_build_execution_chain_verdict.json`
- `tenmon_remote_admin_cursor_runtime_proof_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_remote_admin_cursor_runtime_proof_verdict.json`
- `tenmon_learning_self_improvement_integrated_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_learning_self_improvement_integrated_verdict.json`
- `tenmon_gate_contract_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_gate_contract_verdict.json`
- `tenmon_phase2_gate_and_runtime_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_phase2_gate_and_runtime_verdict.json`
- `tenmon_phase1_conversation_surface_verdict`: `/opt/tenmon-ark-repo/api/automation/tenmon_phase1_conversation_surface_verdict.json`
- `pwa_final_completion_readiness`: `/opt/tenmon-ark-repo/api/automation/pwa_final_completion_readiness.json`
- `pwa_lived_completion_readiness`: `/opt/tenmon-ark-repo/api/automation/pwa_lived_completion_readiness.json`
- `learning_acceptance_audit`: `/opt/tenmon-ark-repo/api/automation/learning_acceptance_audit.json`
