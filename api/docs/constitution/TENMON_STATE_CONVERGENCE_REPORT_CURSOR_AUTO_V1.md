# TENMON_STATE_CONVERGENCE_REPORT_CURSOR_AUTO_V1

## 目的

既存 forensic（deep / micro / deep_seal / ultra）と OS 成果物（full orchestrator / self-improvement / kokuzo-learning）を read-only で集約し、`blockers` と `next_cards` を single-source で固定する。

## 実装

- 追加: `api/scripts/tenmon_state_convergence_report_v1.sh`
- 既存 runner 再利用:
  - `api/scripts/tenmon_deep_system_reveal_v1.sh`
  - `api/scripts/tenmon_micro_forensic_v1.sh`
- 既存 forensic 本体は改変しない（このカードでは read-mostly）。

## 出力

`/var/log/tenmon/card_TENMON_STATE_CONVERGENCE_REPORT_V1/<ts>/` に以下を生成:

- `state_convergence_summary.json`
- `state_convergence_next_cards.json`
- `build.log`
- `health.json`
- `audit.json`
- `systemctl_status.txt`
- `git_sha_short.txt`
- `git_sha_full.txt`
- `git_status.txt`
- `output_list.txt`
- `run.log`

## canonical blocker

- `self_improvement_os_output_contract_incomplete`
- `kokuzo_learning_os_output_contract_incomplete`
- `nas_mount_unconfirmed`
- `chat_ts_worldclass_not_canonicalized`

## next_cards mapping

- `self_improvement_os_output_contract_incomplete`
  - `TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1`
- `kokuzo_learning_os_output_contract_incomplete`
  - `TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1`
- `nas_mount_unconfirmed`
  - `TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1`
- `chat_ts_worldclass_not_canonicalized`
  - `TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_CURSOR_AUTO_V1`

`deep_recommendations` は補助候補としてマージし、`state_convergence_next_cards.json` は最大 5 枚まで。

## 実行

```bash
cd api/scripts
bash tenmon_state_convergence_report_v1.sh
```

forensic 再実行を飛ばす観測モード:

```bash
TENMON_STATE_CONVERGENCE_SKIP_FORENSIC=1 bash tenmon_state_convergence_report_v1.sh
```

## FAIL_NEXT

`TENMON_STATE_CONVERGENCE_REPORT_RETRY_CURSOR_AUTO_V1`
