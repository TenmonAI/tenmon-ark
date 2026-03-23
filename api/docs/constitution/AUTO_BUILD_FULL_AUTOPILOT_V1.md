# AUTO_BUILD_FULL_AUTOPILOT_V1

## 目的

監査〜計画〜recipe〜cursor task〜workspace observer〜execution gate〜apply bundle〜replay audit〜queue/campaign を **1 本の summary JSON** に束ね、半自動運用の俯瞰点とする。**runtime 非変更**（読み取り・ローカル検証のみ）。

## 接続サブシステム（参照）

- queue + `queue_scheduler` の `runNext`
- human gate（pending 件数）
- execution gate（`evaluate_gate`）
- workspace observer（`build_snapshot`、デフォルトで `skip_api_build`、重い場合は `--skip-heavy`）
- patch plan / recipes / cursor manifests / applier / replay / campaign の **成果物パス存在**
- campaign executor スナップショット（常に埋め込み）

## 停止条件（`stopReasons`）

- human gate pending
- execution gate が `executable` 以外（`blocked` / `waiting_human_gate` / `invalid_scope`）
- 次に動かすカードが `requiresHumanJudgement`
- `wouldAutopilotProceed`: 上記が空かつ gate が `executable` かつキューに **running なし**

## CLI

```bash
python3 api/automation/full_autopilot_v1.py --repo-root . --stdout-json
python3 api/automation/full_autopilot_v1.py --repo-root . --emit-report --check-json
# 任意: workspace スナップショット省略
python3 api/automation/full_autopilot_v1.py --repo-root . --stdout-json --skip-heavy
```

`--run-next` / `--run-campaign` は互換用（中身は常にサマリに含める）。

## 次カード

なし（本列のメタ終端）。
