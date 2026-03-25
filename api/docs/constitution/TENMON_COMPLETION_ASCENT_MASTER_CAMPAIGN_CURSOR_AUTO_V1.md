# TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1

## 目的

`TENMON_WORLDCLASS_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1` の **後段**として、retry を含む **completion 系カード**を最後まで束ね、観測に基づき **完成判定まで自動進行**させる。

## D

- **observe → fix → verify → integrate** の順を崩さない
- **1 段でも FAIL**（修復系ステップの `exit != 0`）なら停止
- **stale JSON** は forensic / watchdog / gate 実行で更新（観測ステップは常に集約 JSON を書き直す）
- **final claim** は `final_ready` / `seal_ready` / `worldclass_ready` / `env_failure` の **実値のみ**（集約 JSON 参照）
- **product fail** と **env fail** は `pwa_playwright_preflight.json` の `env_failure` と master レポートで分離

## 実行チェーン（固定 18）

1. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1`
2. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1`
3. `TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1`（観測のみ・常に `tenmon_chat_continuity_deep_forensic.json` 更新）
4. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`
5. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1`
6. `TENMON_PWA_RUNTIME_ENV_FORENSIC_CURSOR_AUTO_V1`（preflight から `tenmon_pwa_runtime_env_forensic.json` 再生成）
7. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1`
8. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1`
9. `TENMON_REPO_HYGIENE_DEEP_FORENSIC_CURSOR_AUTO_V1`（watchdog 実行後に `tenmon_repo_hygiene_deep_forensic.json`）
10. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1`
11. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1`
12. `TENMON_GATE_CONTRACT_HEALTH_DEEP_FORENSIC_CURSOR_AUTO_V1`（grep + curl → `tenmon_gate_contract_health_deep_forensic.json`）
13. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1`
14. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1`
15. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1`
16. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_RETRY_CURSOR_AUTO_V1`
17. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1`
18. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1`

## 自動停止条件

次の **いずれか** で打ち切る（exit 0）。

- 修復系ステップが **FAIL**（`failed_card` をセットして exit 1）
- **`final_ready == true`**（lived / pwa_final のいずれか）
- **`seal_ready == true`**
- **`worldclass_ready == true`**

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_completion_ascent_master_campaign_v1.sh --stdout-json
# Phase2 で systemd 再起動する場合
# bash scripts/tenmon_completion_ascent_master_campaign_v1.sh --restart-systemd --stdout-json
```

## 集約 JSON

`api/automation/tenmon_completion_ascent_master_campaign.json`

```json
{
  "card": "TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1",
  "executed_cards": [],
  "last_pass_card": "",
  "failed_card": "",
  "recommended_retry_card": "",
  "final_ready": false,
  "seal_ready": false,
  "worldclass_ready": false,
  "env_failure": false,
  "next_single_best_card": ""
}
```

---

*Version: 1 — orchestration only; child scripts own exit codes.*
