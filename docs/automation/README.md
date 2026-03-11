# Automation (AUTO_RUNNER_HEALTH_LANE_FREEZE_V1)

## Health lane 固定（正式運用）

- **対象カード**: `OPS_HEALTHCHECK_V1`（build / restart / audit / representative probes / freeze log）
- **反復**: `next_on_pass` / `next_on_fail` とも `OPS_HEALTHCHECK_V1` で health のみループ
- **Apply lane**: **unwired / skip-disabled official**（[OPS_APPLY_ENGINE_SELECT_V1](./OPS_APPLY_ENGINE_SELECT_V1.md)）。`R8_KANAGI_SELF_KERNEL_V1` は `enabled: false`。`TENMON_AI_APPLY_CMD` / `TENMON_APPLY_ENGINE` 未設定＝正常運用。apply は skip（fail にしない）

## Freeze 出力先

- **ディレクトリ**: queue の `freeze_log_dir`（既定: `/var/log/tenmon`）
- **ファイル**: `{card_name}_AUTO_FREEZE_V1.txt`
- 1 回実行ごとに state 更新・freeze log 出力・PASS/FAIL を記録

## global_allowed_dirty_paths

queue の `global_allowed_dirty_paths` に含まれるパス（プレフィックスまたは完全一致）は、git dirty チェックで許可する。

- `docs/ark/forge/`
- `docs/ark/governance/`
- `docs/ark/khs/`
- `docs/ark/map/`
- `docs/automation/`
- `automation/`

カードごとの `allowed_dirty_paths` はこれに加えて適用される。

## systemd

- **Service**: `automation/systemd/tenmon-auto-runner.service`（health lane のみ `--once`）
- **Timer**: `automation/systemd/tenmon-auto-runner.timer`
- **Env**: `automation/systemd/tenmon-auto-runner.env`（`TENMON_AI_APPLY_CMD` / `TENMON_APPLY_ENGINE` 未設定で health-only、service は failed にならない）
