# TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1

## 目的

operable を超えて、「世界最高峰 claim」を出してよいかだけを厳格判定する。  
達していなければ claim を禁止し、未達理由を固定する。

## D

- claim は証拠でのみ許可
- score を盛らない（入力 JSON の `score_percent` のみ）
- operable sealed 前に worldclass claim 禁止
- lived proof 未完なら claim 禁止
- repo hygiene block 中は claim 禁止
- remote admin / self audit / learning の未完を無視しない
- self audit は `accepted_complete` または **明示的 exemption + evidence** のみ許容
- stale により claim 根拠が無効なら claim 禁止

## 入力

| ファイル | 用途 |
|----------|------|
| `tenmon_latest_state_rejudge_summary.json` | latest truth（primary） |
| `tenmon_final_single_source_seal.json` | single-source seal ready |
| `tenmon_final_operable_seal.json` | operable sealed / pass |
| `tenmon_worldclass_acceptance_scorecard.json` | `score_percent` / lived signals |
| `tenmon_system_verdict.json` | critical subsystems / lived / self_audit |
| `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json` | env・product・hygiene・lived 補助 |
| `tenmon_remote_admin_cursor_runtime_proof_verdict.json` | remote admin |
| `tenmon_self_build_execution_chain_verdict.json` | self-build 鎖 |
| `learning_acceptance_audit.json` | **存在する場合のみ** gate |

## worldclass 条件（すべて必須）

1. `operable_sealed`（または同等の seal pass）
2. `score_percent >= 90`
3. critical subsystems 全受理（`self_audit_os` は exemption ルール込み）
4. lived proof 実証（scorecard signal + `pwa_lived_proof` 受理 + latest の env/product 障害なし）
5. repo 非 block（latest evidence / scorecard signals / system）
6. remote admin accepted
7. self-build execution chain closed、または `self_build_os` 受理
8. `learning_acceptance_audit.json` がある場合は `overall_pass` 等で合格
9. stale claim blocker なし（`latest summary` の stale split のみ参照し、stale verdict は参照しない）

## 実行順（Cursor-only）

1. build
2. latest rejudge
3. single-source seal
4. operable seal
5. worldclass claim gate

## 出力

- `api/automation/tenmon_final_worldclass_claim_gate.json`
- `api/automation/tenmon_final_worldclass_claim_gate_report.md`

JSON 必須項目:

- `card`, `generated_at`, `pass`, `claim_allowed`, `worldclass_ready`
- `claim_forbidden_reasons`, `claim_allowed_reasons`
- `score_percent`, `critical_subsystems_status`
- `final_claim_statement`, `recommended_next_card`

文面ルール:

- `claim_allowed=false` のとき `final_claim_statement=""` とし、`claim_forbidden_reasons` を明示する
- `claim_allowed=true` のときのみ肯定 claim 文を 1 つ出す

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_final_worldclass_claim_gate_v1.sh --stdout-json
```

- **exit 0**: `pass == true`（claim 許可）
- **exit 1**: `pass == false`（claim 禁止）

---

*Version: 3*
