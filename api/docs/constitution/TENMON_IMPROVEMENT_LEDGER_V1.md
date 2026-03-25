# TENMON_IMPROVEMENT_LEDGER_V1

## 目的

「何を直したか」「何が効いたか」「何が再発したか」を **機械可読** に蓄積し、以後の scorer / カード自動生成の土台にする。

関連: **`TENMON_RESIDUAL_QUALITY_SCORER_V1`** が本 JSONL テールを読み、blocker 再発を残差採点の重みに反映する。

## 成果物

| 種別 | パス |
|------|------|
| スキーマ | `api/automation/improvement_ledger_schema_v1.json` |
| 追記 CLI | `api/automation/improvement_ledger_v1.py` |
| 既定 JSONL | `api/automation/improvement_ledger_entries_v1.jsonl`（1 行 1 エントリ） |
| VPS 収集 | `api/scripts/improvement_ledger_collect_v1.sh`（`CARD=TENMON_IMPROVEMENT_LEDGER_VPS_V1`） |

## 記録項目（エントリ）

- `card_name` — どのカード／VPS の結果か
- `touched_files` — 触ったファイル（`--touched-files` または `--git-since`）
- `blocker_types` — `final_verdict.json` の `blockers`
- `acceptance_result` — `pass` / `fail` / `unknown`
- `runtime_result` / `surface_result` / `route_result` / `longform_result` / `density_result` — seal 成果物から要約
- `recurrence_signals` — 直近 JSONL テール内での同一 blocker 出現回数（再発傾向）
- `next_card` — `_completion_supplement/next_card_dispatch.json` + OS fail-next があれば候補に追加
- `summary_human_ja` — 人間向け一文
- `summary_machine` — 軸別成否・fingerprint・`seal_exit_code`
- `outcome_class` — `success` / `failure` / `recurrence` / `partial`

## 自己改善 OS との関係

- `tenmon_self_improvement_ledger_v1.py` が追記する **`improvement_ledger_v1.jsonl`** は OS ループ用の **ミニイベント**。
- 本憲章の **フルエントリ** は **`improvement_ledger_entries_v1.jsonl`** に集約（スキーマ `improvement_ledger_schema_v1.json`）。

## CLI

```bash
# seal から追記
python3 api/automation/improvement_ledger_v1.py append-from-seal \
  --seal-dir "$(readlink -f /var/log/tenmon/card)" \
  --card-name MY_CARD_V1 \
  --seal-exit-code 0 \
  --git-since HEAD~1 \
  --repo-root /opt/tenmon-ark-repo

# 任意 JSON を追記
python3 api/automation/improvement_ledger_v1.py append-json --entry-json path/to/entry.json

# サンプル（VPS でも出力）
python3 api/automation/improvement_ledger_v1.py emit-sample --out /tmp/improvement_ledger_sample.json
```

## 編集境界

- `chat.ts` / route 本体 / DB / `dist` / `kokuzo_pages` 正文は変更しない。

## カード

- Cursor: `TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1`
- VPS: `TENMON_IMPROVEMENT_LEDGER_VPS_V1`
- RETRY: `TENMON_IMPROVEMENT_LEDGER_RETRY_CURSOR_AUTO_V1`
