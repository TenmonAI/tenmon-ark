# TENMON_WORLDCLASS_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1

## 目的

完成体までの残りカードを **優先順どおり** に一気通貫実行し、FAIL または成功停止条件で打ち切る **最上位 master campaign** である。  
`fail card` / `retry card` は JSON に返す（主張は証拠 JSON のみ）。

## D

- **前段 PASS まで次段へ進まない**（サブプロセスが非ゼロ exit なら即停止）
- 推奨順: continuity → env → hygiene → gate → phase2 → phase3 → forensic
- **失敗時は即停止**（`recommended_retry_card` を返す）
- **seal / worldclass 主張は evidence のみ**（本オーケストレータは改修しない）

## 停止条件

次の **いずれか** で終了する。

1. いずれかのステップが **FAIL**（`exit != 0`）
2. **`final_ready == true` かつ `seal_ready == true`**（`pwa_*_completion_readiness.json` と `tenmon_total_completion_master_report.json` から観測）
3. **`next_single_best_card == null`**（master report に次カードなし）

## 実行順（固定）

1. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1`
2. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1`
3. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`
4. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1`
5. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1`
6. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1`
7. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1`
8. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1`
9. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1`
10. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1`
11. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1`
12. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_RETRY_CURSOR_AUTO_V1`
13. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1`
14. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1`

## 実装マッピング（観測）

| カード群 | 実行 |
|----------|------|
| continuity | `tenmon_phase1_conversation_surface_verdict_v1.py` + chat curl プローブ |
| runtime restore | `tenmon_pwa_runtime_env_and_playwright_restore_v1.sh` |
| frontend hygiene | `tenmon_pwa_frontend_residue_hygiene_v1.sh` |
| gate | `tenmon_gate_contract_health_alignment_v1.py` |
| phase2 | `npm run build`（api）→（任意）`systemctl restart` → gate → restore → `tenmon_phase2_gate_and_runtime_verdict_v1.py` |
| phase3 | `tenmon_phase3_completion_run_v1.sh` |
| forensic | `tenmon_total_completion_master_forensic_report_v1.sh` |

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_worldclass_ascent_master_campaign_v1.sh --stdout-json
# Phase2 で API を再起動する場合（任意）
# bash scripts/tenmon_worldclass_ascent_master_campaign_v1.sh --restart-systemd --stdout-json
```

成果物: `api/automation/tenmon_worldclass_ascent_master_campaign.json`

## 最終出力（要約）

`--stdout-json` および `tenmon_worldclass_ascent_master_campaign.json` に、少なくとも次を含む。

- `executed_until`, `last_pass_card`, `failed_card`, `recommended_retry_card`
- `final_ready`, `seal_ready`, `worldclass_ready`, `next_single_best_card`
- `stop_reason`（`step_failed` | `final_ready_and_seal_ready` | `next_single_best_card_null` | `completed_all_steps` | `exception`）

---

*Version: 1 — orchestration only; child scripts own exit codes and evidence paths.*
