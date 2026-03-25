# TENMON_ONE_SHOT_FULL_COMPLETION_CHAIN_CURSOR_AUTO_V1

## 目的

completion 系カードを **Cursor 最後尾に 1 枚**追加するだけで、**止まるまで順に**進めるための **最終統合カード**である。

## D

- **individual card contract を壊さない**（既存 Python / shell をそのまま subprocess 実行）
- **実行順のみ**を本カードが統制する
- **fail fast**（一段失敗で以降は実行しない）
- **各段結果**を `steps_detail` と子アーティファクト JSON に集約
- **憶測で pass にしない**（exit code と各スクリプトが書いた JSON のみ）

## 統合対象（論理）

次の **21 枚**をカバーする（1〜18 は `tenmon_completion_ascent_master_campaign_v1.py` に委譲）。

1. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1`
2. `TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY_CURSOR_AUTO_V1`
3. `TENMON_CHAT_CONTINUITY_DEEP_FORENSIC_CURSOR_AUTO_V1`
4. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1`
5. `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_RETRY_CURSOR_AUTO_V1`
6. `TENMON_PWA_RUNTIME_ENV_FORENSIC_CURSOR_AUTO_V1`
7. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1`
8. `TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1`
9. `TENMON_REPO_HYGIENE_DEEP_FORENSIC_CURSOR_AUTO_V1`
10. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1`
11. `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_RETRY_CURSOR_AUTO_V1`
12. `TENMON_GATE_CONTRACT_HEALTH_DEEP_FORENSIC_CURSOR_AUTO_V1`
13. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1`
14. `TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1`
15. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_CURSOR_AUTO_V1`
16. `TENMON_FINAL_COMPLETION_PHASE3_LIVED_SEAL_AND_PROOF_RETRY_CURSOR_AUTO_V1`
17. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1`
18. `TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_RETRY_CURSOR_AUTO_V1`
19. `TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1`（上記 1〜18 のランナー）
20. `TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1`
21. `TENMON_FINAL_WORLDCLASS_CLAIM_GATE_CURSOR_AUTO_V1`

## 実行順（実装）

| 順 | 呼び出し |
|----|----------|
| 1 | `python3 api/automation/tenmon_completion_ascent_master_campaign_v1.py` |
| 2 | `python3 api/automation/tenmon_final_operable_seal_v1.py` |
| 3 | `python3 api/automation/tenmon_final_worldclass_claim_gate_v1.py` |

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_one_shot_full_completion_chain_v1.sh --stdout-json
# Phase2 で systemd 再起動が必要な場合
# bash scripts/tenmon_one_shot_full_completion_chain_v1.sh --restart-systemd --stdout-json
```

## 出力

`api/automation/tenmon_one_shot_full_completion_chain.json`

```json
{
  "card": "TENMON_ONE_SHOT_FULL_COMPLETION_CHAIN_CURSOR_AUTO_V1",
  "executed_until": "",
  "last_pass_card": "",
  "failed_card": "",
  "recommended_retry_card": "",
  "seal_ready": false,
  "worldclass_ready": false
}
```

（実装では **`steps_detail`** に各フェーズの exit_code・成果物パス・ascent 内サマリを追加する。）

- **exit 0**: 3 フェーズすべて成功
- **exit 1**: いずれか失敗

---

*Version: 1*
