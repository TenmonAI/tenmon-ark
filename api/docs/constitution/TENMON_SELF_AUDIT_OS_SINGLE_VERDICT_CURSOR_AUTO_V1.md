# TENMON_SELF_AUDIT_OS_SINGLE_VERDICT_CURSOR_AUTO_V1

## 目的

self-audit / forensic / readiness / blockers 等の JSON が散在する状態を、**単一の system verdict**（`tenmon_system_verdict.json`）に統合し、以後の自己修復・自己構築・ learning integration の判断正中を固定する。

## D

- **product code 改修ではなく** audit OS の統合専用
- **env failure** と **product failure** を分離（`env_failure_separated`）
- subsystem ごとに `code_present` / `runtime_proven` / `accepted_complete` を明示
- **単一 verdict 以外を最終判断に使わない**（運用の正は `tenmon_system_verdict.json`）
- 過去 report を壊さず **mirror**（入力ファイルは読み取りのみ）
- 統合結果が **PASS** でない場合、スクリプトは **`exit 1`**（`--soft-exit-ok` で常に 0 にできる）

## 単一真実源

| 出力 | 説明 |
|------|------|
| `api/automation/tenmon_system_verdict.json` | 機械可読の統合 verdict |
| `api/automation/tenmon_system_verdict.md` | 人間可読の mirror |

## 実装

- `api/automation/tenmon_system_verdict_integrator_v1.py`

主な入力（存在すれば読み込み）:

- `tenmon_total_unfinished_completion_report.json`
- `unfinished_priority_queue.json`
- `vps_acceptance_report.json`
- `final_master_readiness.json`
- `learning_acceptance_audit.json`
- `self_build_os_integrated_verdict.json`
- `pwa_final_completion_readiness.json`
- `pwa_lived_completion_readiness.json`

## 実行

```bash
python3 api/automation/tenmon_system_verdict_integrator_v1.py
cat api/automation/tenmon_system_verdict.json
```

CI で exit を無視する場合:

```bash
python3 api/automation/tenmon_system_verdict_integrator_v1.py --soft-exit-ok || true
```
