# TENMON_POST_7PACK_TOTAL_REVEAL_AND_ACCEPTANCE_REPORT_V1

## 目的

A〜G 7 群カード適用後の **会話 OS / automation OS / canon-thought / learning-growth / acceptance・封印** を一括で可視化する。

## 実行

```bash
cd /opt/tenmon-ark-repo
# API 基底（既定 http://127.0.0.1:3000）
export TENMON_API_BASE=http://127.0.0.1:3000
python3 api/automation/post_7pack_total_reveal_v1.py
```

オプション:

- `--skip-build` — `npm run build` を省略
- `--skip-restart` — `systemctl restart tenmon-ark-api.service` を省略（権限なし環境向け）
- `--skip-probes` — `/api/chat` プローブ省略（API 未起動時のレポート骨格のみ）
- `--exit-zero` — 判定が PARTIAL でも終了コード 0（レポート生成のみ成功させたい CI 向け）
- `--out-dir PATH` — 出力先を固定
- `--data-root PATH` — 既定 `/opt/tenmon-ark-data`

## 出力先

`api/automation/reports/TENMON_POST_7PACK_TOTAL_REVEAL_V1/<UTC>/`

必須ファイル:

- `final_status_summary.json` / `.md`
- `conversation_probe_matrix.json` / `.md`
- `conversation_probe_jq.txt`
- `completion_model_file_presence.json`
- `db_key_counts.json`
- `manifest_alignment.json`
- `execution_gate_stdout.json`
- `workspace_observer_stdout.json`
- `replay_audit_stdout.json`
- `full_autopilot_stdout.json`
- `chatts_audit_suite_stdout.json`
- `chatts_trunk_domain_map_stdout.json`
- `chatts_exit_contract_lock_stdout.json`
- `run.log`

## 封印

`final_status_summary.json` の `seal_allowed` が `true` のときのみ read-only 封印を許可する（`acceptance` 全項目の解釈は同 JSON の `note` 参照）。
