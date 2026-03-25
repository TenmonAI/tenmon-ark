# CHAT_TS_EXIT_CONTRACT_SEAL_AND_REGRESSION_GUARD_V1

## 目的

exit contract lock 適用後の **runtime / surface / route / longform / density** を **seal** し、同一の **5 probe 文言**（`CHAT_TS_PROBE_CANON_V1`）で回帰を検知する。次カードでの surface / route / longform の崩れを防ぐ。

## 単一ソース（5 probe + runtime 10）

| ファイル | 役割 |
|----------|------|
| `api/automation/chat_ts_probe_canon_v1.json` | **canonical** メッセージ |
| `api/automation/chat_ts_probe_canon_v1.py` | Python からの読み込み |
| `api/automation/tenmon_chat_ts_worldclass_completion_report_v1.py` | worldclass レポート（runtime マトリクス） |
| `api/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` | seal 本線 |
| `api/scripts/chat_ts_route_authority_probe_v1.sh` | route authority（exit_contract_probe_5） |
| `api/scripts/chat_ts_longform_quality_probe_v1.sh` | longform 品質（longform_1 と同一文言） |

環境変数 `CHAT_TS_PROBE_CANON_JSON` で canon パスを上書き可能。

## final verdict（一意）

`chat_ts_overall_100` は次の **6 軸がすべて真** のときのみ `true`（worldclass report の定義と一致）:

`chat_ts_static_100 && chat_ts_runtime_100 && surface_clean && route_authority_clean && longform_quality_clean && density_lock`

`api/scripts/chat_ts_stage5_verdict_merge_v1.py` が `final_verdict.json` / `seal_verdict.json` / `SEAL_VERDICT_JSON=` を出力する。

- **PASS**: `blockers=[]` かつ `static_blockers=[]` かつ `runtime_probe_blockers=[]` かつ `chat_ts_overall_100=true`
- **FAIL**: `blockers` / `static_blockers` / `runtime_probe_blockers` に理由が入る。`CHAT_TS_REGRESSION_REPAIR_MD` が指す次カード雛形を自動生成（既定: `generated_cursor_apply/CHAT_TS_EXIT_CONTRACT_REGRESSION_REPAIR_CURSOR_AUTO_V1.md`）

## VPS 実行

```bash
export CHAT_TS_PROBE_BASE_URL=http://127.0.0.1:3000
bash api/scripts/chat_ts_exit_contract_seal_and_regression_guard_v1.sh
```

## 期待成果物（ディレクトリ例: `/var/log/tenmon/card_<CARD>/<TS>/`）

- `CHAT_TS_EXIT_CONTRACT_SEAL_AND_REGRESSION_GUARD_V1`（標準出力のマーカー行）
- `final_verdict.json`
- `seal_verdict.json`
- `worldclass_report.json`
- `runtime_matrix.json`
- `surface_audit.json`
- `route_authority_audit.json`（stage5 入力） / `route_authority_probe.json`（同一内容のコピー）
- `longform_audit.json` / `longform_quality_probe.json`（同一内容のコピー）
- `run.log` 内の `SEAL_VERDICT_JSON=...` 行
- PASS 時: `CHAT_TS_EXIT_CONTRACT_SEAL_PASS_RESULT.md`（seal ディレクトリ）

## FAIL 次カード

- `CHAT_TS_EXIT_CONTRACT_REGRESSION_REPAIR_CURSOR_AUTO_V1`
