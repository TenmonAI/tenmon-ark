# TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1

## 目的

世界最高峰 claim と切り分け、まず運用可能完成体として封印可能かを最終判定する。

## D

- operable と worldclass を混同しない
- build / audit / continuity / repo hygiene の現況のみで裁定
- stale invalidation 後の active blockers のみを見る
- claim 文言は最小
- PASS 時のみ封印
- FAIL 時は next card を 1枚に絞る

## 入力

| ファイル | 用途 |
|----------|------|
| `api/automation/tenmon_latest_state_rejudge_and_seal_refresh_verdict.json` | latest runtime truth |
| `api/automation/tenmon_stale_evidence_invalidation_verdict.json` | stale invalidation 結果 |
| `api/automation/tenmon_current_state_detailed_report.json` | active blockers 補助 |
| `api/automation/tenmon_system_verdict.json` | critical runtime 補助 |
| `api/automation/tenmon_repo_hygiene_watchdog_verdict.json` | hygiene 補助 |
| `api/automation/tenmon_self_build_execution_chain_verdict.json` | self-build chain 確認 |
| `api/automation/tenmon_remote_admin_cursor_runtime_proof_verdict.json` | runtime proof 補助 |

## 判定軸

- `health_ok`
- `audit_ok`
- `audit_build_ok`
- `continuity_ok`
- `repo_must_block_seal`
- `self_build_chain_closed`
- `critical_runtime_present`
- `stale_invalidated`
- `unsafe_blockers_remaining`

operable seal 条件:

- health / audit / audit.build が all true
- continuity_ok=true
- repo hygiene が `must_block_seal=false`
- self_build chain true
- stale invalidation 完了
- unsafe runtime blocker が active で残っていない

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_final_operable_seal_v1.sh --stdout-json
```

任意オプション（環境変数）:

- `TENMON_OPERABLE_SEAL_BUILD=1`
- `TENMON_OPERABLE_SEAL_RESTART=1`
- `TENMON_OPERABLE_SEAL_AUDIT_PROBE=1`

- **exit 0**: `pass == true`
- **exit 1**: `pass == false`

## 出力

`api/automation/tenmon_final_operable_seal.json`
`api/automation/tenmon_final_operable_seal_report.md`

JSON 必須項目:

- `card`
- `generated_at`
- `pass`
- `operable_sealed`
- `seal_band`
- `why_pass`
- `why_fail`
- `active_blockers`
- `resolved_blockers`
- `final_operable_statement`
- `recommended_next_card`

文面ルール:

- PASS のときのみ肯定文を出す
- FAIL では claim しない

---

*Version: 3*
