# TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1

## 目的

Cursor カード群を **単一起動点** から計画・検証・（将来）remote 実行・ingest・retry・最終封印まで束ねる **execution fabric** の憲法である。  
本書は product コードではなく、`api/automation/*.json` / `*.py` / `api/scripts/*.sh` で構成する。

## 原則

- **最小 diff** — 本文 `chat` / canon / kokuzo 正文の自動改変禁止。
- **1 変更 = 1 検証**。
- **dist 直編集禁止**。
- **FAIL** — 証拠束（ログ + verdict JSON）を残し `exit != 0`。
- **封印** — acceptance / scorecard / hygiene / seal が揃うまで `campaign_pass` を名乗らない。
- **危険 patch** — `execution_gate_v1` が `blocked` なら停止。
- **remote** — 承認済みジョブ契約（queue / admin route）のみ。
- **完全無人** — local dispatch / remote execution / result ingest / retry generation が閉じてから名乗る。v1 はその **骨格** を提供する。

## 成果物

| ファイル | 役割 |
|----------|------|
| `api/automation/tenmon_full_autopilot_manifest_v1.json` | Card Registry（順序・依存・pass 成果物・retry・danger） |
| `api/automation/tenmon_full_autopilot_state_v1.json` | 状態機械 |
| `api/automation/tenmon_full_autopilot_fabric_v1.py` | オーケストレータ |
| `api/automation/tenmon_full_autopilot_verdict_v1.json` | 統合裁定 |
| `api/automation/tenmon_full_autopilot_retry_v1.json` | retry 束（v1 はスタブ + 推奨カード） |
| `api/scripts/tenmon_full_autopilot_fabric_v1.sh` | 単一起動シェル |

## Rollback（campaign FAIL 後）

`tenmon_rollback_autotrigger_and_restore_v1.py` を **`campaign_pass=false` かつ `--phase full`** のときに assess（git 非実行）。  
`rollback_possible=false` → state `rollback_manual_required`。`--skip-rollback` で省略。

## Hard stop（必須前段）

`TENMON_EXECUTION_GATE_HARDSTOP_CURSOR_AUTO_V1`（`tenmon_execution_gate_hardstop_v1.py`）を **fabric の `--phase full` / `step` の前** に自動実行する。  
`allowed_to_continue=false` または `must_block=true` のときは state を `blocked_hardstop` にし **exit 3**。緊急時のみ `--skip-hardstop`。

```bash
bash api/scripts/tenmon_execution_gate_hardstop_v1.sh --stdout-json
```

## 実行

```bash
# manifest 検証のみ
python3 api/automation/tenmon_full_autopilot_fabric_v1.py --phase validate --stdout-json

# verdict のみ（execution_gate を走らせず入力 JSON を合成）
python3 api/automation/tenmon_full_autopilot_fabric_v1.py --phase verdict --stdout-json

# フル（execution_gate + 統合 verdict。ゲート未達なら exit 1）
python3 api/automation/tenmon_full_autopilot_fabric_v1.py --phase full --stdout-json

# ドライラン（ゲート省略・exit 0）
python3 api/automation/tenmon_full_autopilot_fabric_v1.py --dry-run --stdout-json

bash api/scripts/tenmon_full_autopilot_fabric_v1.sh --stdout-json
```

ログ既定: `/var/log/tenmon/card_TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC_CURSOR_AUTO_V1/<TS>/run.log`

## 拡張（フェーズ2）

- remote job 発行を `remote_cursor_queue.json` / `adminRemoteBuild` と接続。
- `retry_generator_v2.py` / `retry_queue_orchestrator_v1.py` を fail 時に自動起動。
- `final_seal_autopilot_v3.py` / `tenmon_system_verdict_integrator_v1.py` との直列接続。
